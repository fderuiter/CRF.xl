const ts = require("typescript");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const MODULE_MAP_PATH = "docs/architecture/module-map.md";

function getMergeBase() {
  try {
    return execSync("git merge-base HEAD origin/main", { encoding: "utf8" }).trim();
  } catch (e) {
    return "HEAD~1";
  }
}

function getModifiedFiles(base) {
  const stdout = execSync(`git diff --name-status ${base} HEAD`, { encoding: "utf8" });
  const lines = stdout.split("\n").filter(Boolean);
  const files = [];
  for (const line of lines) {
    const parts = line.split("\t");
    const status = parts[0];
    let oldFile = parts[1];
    let file = parts[1];
    if (status.startsWith("R") || status.startsWith("C")) {
      oldFile = parts[1];
      file = parts[2];
    }
    files.push({ status: status[0], oldFile, file });
  }
  return files;
}

function getFileContentFromGit(ref, filePath) {
  try {
    return execSync(`git show ${ref}:${filePath}`, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
  } catch (e) {
    return ""; // File might not exist in base
  }
}

function normalizeExport(node, sourceFile) {
  const transformer = (context) => (rootNode) => {
    function visit(n) {
      if (ts.isFunctionDeclaration(n)) {
        return context.factory.updateFunctionDeclaration(
          n, n.modifiers, n.asteriskToken, n.name, n.typeParameters, n.parameters, n.type, undefined
        );
      } else if (ts.isMethodDeclaration(n)) {
        return context.factory.updateMethodDeclaration(
          n, n.modifiers, n.asteriskToken, n.name, n.questionToken, n.typeParameters, n.parameters, n.type, undefined
        );
      } else if (ts.isArrowFunction(n)) {
        return context.factory.updateArrowFunction(
          n, n.modifiers, n.typeParameters, n.parameters, n.type, n.equalsGreaterThanToken,
          context.factory.createBlock([], false)
        );
      } else if (ts.isFunctionExpression(n)) {
        return context.factory.updateFunctionExpression(
          n, n.modifiers, n.asteriskToken, n.name, n.typeParameters, n.parameters, n.type,
          context.factory.createBlock([], false)
        );
      } else if (ts.isClassDeclaration(n)) {
        const publicMembers = n.members.filter(m => {
          if (m.modifiers && m.modifiers.some(mod => mod.kind === ts.SyntaxKind.PrivateKeyword)) {
            return false;
          }
          return true;
        });
        const n2 = context.factory.updateClassDeclaration(
          n, n.modifiers, n.name, n.typeParameters, n.heritageClauses, publicMembers
        );
        return ts.visitEachChild(n2, visit, context);
      }
      return ts.visitEachChild(n, visit, context);
    }
    return visit(rootNode);
  };

  const result = ts.transform(node, [transformer]);
  const transformedNode = result.transformed[0];
  const printer = ts.createPrinter({ removeComments: true });
  return printer.printNode(ts.EmitHint.Unspecified, transformedNode, sourceFile);
}

function getExportSignatures(sourceCode) {
  const sourceFile = ts.createSourceFile("temp.ts", sourceCode, ts.ScriptTarget.Latest, true);
  const exports = new Set();

  function visit(node) {
    if (node.modifiers && node.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
      exports.add(normalizeExport(node, sourceFile));
    } else if (ts.isExportDeclaration(node) || ts.isExportAssignment(node)) {
      const printer = ts.createPrinter({ removeComments: true });
      exports.add(printer.printNode(ts.EmitHint.Unspecified, node, sourceFile));
    } else {
      ts.forEachChild(node, visit);
    }
  }
  
  visit(sourceFile);
  return Array.from(exports).sort();
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function main() {
  const base = getMergeBase();
  const modifiedFiles = getModifiedFiles(base);
  
  const changedMdDirs = new Set();
  let moduleMapChanged = false;
  
  for (const { file } of modifiedFiles) {
    if (file === MODULE_MAP_PATH) {
      moduleMapChanged = true;
    }
    if (file.endsWith(".md")) {
      changedMdDirs.add(path.dirname(file));
    }
  }

  let publicApiChanged = false;
  const errors = [];

  for (const { status, oldFile, file } of modifiedFiles) {
    if (!file.endsWith(".ts") && !file.endsWith(".tsx")) continue;
    if (file.includes("__tests__") || file.includes(".test.") || file.includes(".mock.") || !file.startsWith("src/")) {
      continue;
    }

    let baseCode = "";
    if (status !== "A") {
      baseCode = getFileContentFromGit(base, oldFile);
    }
    let headCode = "";
    if (status !== "D") {
      headCode = fs.readFileSync(file, "utf8");
    }

    const baseExports = getExportSignatures(baseCode);
    const headExports = getExportSignatures(headCode);

    if (!arraysEqual(baseExports, headExports)) {
      publicApiChanged = true;
      const fileDir = path.dirname(file);
      
      if (!changedMdDirs.has(fileDir)) {
        errors.push(`Public export changed in ${file} but no adjacent markdown specification was updated in ${fileDir}.`);
      }
    }
  }

  if (publicApiChanged && !moduleMapChanged) {
    errors.push(`Public interfaces were modified, but the central module map (${MODULE_MAP_PATH}) was not updated.`);
  }

  if (errors.length > 0) {
    console.error("\x1b[31m[ERROR] Semantic Interface Change Detection Failed:\x1b[0m");
    for (const err of errors) {
      console.error(` - ${err}`);
    }
    process.exit(1);
  } else {
    console.log("\x1b[32m[SUCCESS] Semantic interface validation passed.\x1b[0m");
  }
}

main();
