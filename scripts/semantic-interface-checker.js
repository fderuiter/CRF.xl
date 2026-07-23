const ts = require("typescript");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const MODULE_MAP_PATH = "docs/architecture/module-map.md";

function getMergeBase() {
  try {
    return execSync("git merge-base HEAD origin/main", { encoding: "utf8" }).trim();
  } catch {
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
    return execSync(`git show ${ref}:${filePath}`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    });
  } catch {
    return ""; // File might not exist in base
  }
}

function normalizeExport(node, sourceFile) {
  const transformer = (context) => (rootNode) => {
    function visit(n) {
      if (ts.isFunctionDeclaration(n)) {
        return context.factory.updateFunctionDeclaration(
          n,
          n.modifiers,
          n.asteriskToken,
          n.name,
          n.typeParameters,
          n.parameters,
          n.type,
          undefined
        );
      } else if (ts.isMethodDeclaration(n)) {
        return context.factory.updateMethodDeclaration(
          n,
          n.modifiers,
          n.asteriskToken,
          n.name,
          n.questionToken,
          n.typeParameters,
          n.parameters,
          n.type,
          undefined
        );
      } else if (ts.isArrowFunction(n)) {
        return context.factory.updateArrowFunction(
          n,
          n.modifiers,
          n.typeParameters,
          n.parameters,
          n.type,
          n.equalsGreaterThanToken,
          context.factory.createBlock([], false)
        );
      } else if (ts.isFunctionExpression(n)) {
        return context.factory.updateFunctionExpression(
          n,
          n.modifiers,
          n.asteriskToken,
          n.name,
          n.typeParameters,
          n.parameters,
          n.type,
          context.factory.createBlock([], false)
        );
      } else if (ts.isClassDeclaration(n)) {
        const publicMembers = n.members.filter((m) => {
          if (m.modifiers && m.modifiers.some((mod) => mod.kind === ts.SyntaxKind.PrivateKeyword)) {
            return false;
          }
          return true;
        });
        const n2 = context.factory.updateClassDeclaration(
          n,
          n.modifiers,
          n.name,
          n.typeParameters,
          n.heritageClauses,
          publicMembers
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
    if (node.modifiers && node.modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
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

function getDirChain(startDir) {
  const chain = [];
  let current = path.normalize(startDir);
  while (current && current !== "." && current !== "/" && current !== "\\") {
    chain.push(current.replace(/\\/g, "/"));
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return chain;
}

function loadConfig() {
  const possiblePaths = [
    path.resolve(process.cwd(), "docs/config.json"),
    path.resolve(__dirname, "../docs/config.json"),
  ];
  let config = { mappings: {}, exclusions: [] };
  for (const configPath of possiblePaths) {
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, "utf8");
        const parsed = JSON.parse(content);
        if (parsed) {
          if (parsed.mappings && typeof parsed.mappings === "object") {
            config.mappings = parsed.mappings;
          }
          if (parsed.exclusions && Array.isArray(parsed.exclusions)) {
            config.exclusions = parsed.exclusions;
          }
          return config;
        }
      } catch {
        console.warn(
          `\x1b[33m[WARN] docs/config.json at ${configPath} is invalid, using fallback validation.\x1b[0m`
        );
      }
    }
  }
  return config;
}

function runValidation({ modifiedFiles, config, getFileContent, readFile }) {
  const mappings = {};
  for (const [dirKey, mdPath] of Object.entries(config.mappings || {})) {
    const normKey = path.normalize(dirKey).replace(/\\/g, "/");
    const normVal = path.normalize(mdPath).replace(/\\/g, "/");
    mappings[normKey] = normVal;
  }

  const exclusions = (config.exclusions || []).map((exc) =>
    path.normalize(exc).replace(/\\/g, "/")
  );

  const changedMdDirs = new Set();
  const changedMdFiles = new Set();
  let moduleMapChanged = false;

  for (const { file } of modifiedFiles) {
    const normFile = file.replace(/\\/g, "/");
    if (normFile === MODULE_MAP_PATH) {
      moduleMapChanged = true;
    }
    if (normFile.endsWith(".md")) {
      changedMdDirs.add(path.dirname(normFile));
      changedMdFiles.add(normFile);
    }
  }

  let publicApiChanged = false;
  const errors = [];

  for (const { status, oldFile, file } of modifiedFiles) {
    const normFile = file.replace(/\\/g, "/");
    if (!normFile.endsWith(".ts") && !normFile.endsWith(".tsx")) continue;
    if (
      normFile.includes("__tests__") ||
      normFile.includes(".test.") ||
      normFile.includes(".mock.") ||
      !normFile.startsWith("src/")
    ) {
      continue;
    }

    const fileDir = path.dirname(normFile);

    // 1. Exclusion Check
    const chain = getDirChain(fileDir);
    let isExcluded = false;
    for (const dir of chain) {
      if (exclusions.includes(dir)) {
        isExcluded = true;
        break;
      }
    }
    if (isExcluded) {
      continue; // Skip validation entirely
    }

    let baseCode = "";
    if (status !== "A") {
      baseCode = getFileContent("base", oldFile);
    }
    let headCode = "";
    if (status !== "D") {
      headCode = readFile(normFile);
    }

    const baseExports = getExportSignatures(baseCode);
    const headExports = getExportSignatures(headCode);

    if (!arraysEqual(baseExports, headExports)) {
      publicApiChanged = true;

      // 2. Mapping Check
      let mappedMdFile = null;
      let matchedMappingFolder = null;
      for (const dir of chain) {
        if (mappings[dir]) {
          mappedMdFile = mappings[dir];
          matchedMappingFolder = dir;
          break;
        }
      }

      if (mappedMdFile) {
        if (changedMdFiles.has(mappedMdFile)) {
          // Check passes
        } else {
          errors.push(
            `Public API changed in mapped folder '${matchedMappingFolder}' (file: '${normFile}'), ` +
              `but the designated central specification file '${mappedMdFile}' was not modified in the same change set.`
          );
        }
      } else {
        // 3. Fallback Rule
        let fallbackFound = false;
        for (const dir of chain) {
          if (changedMdDirs.has(dir)) {
            fallbackFound = true;
            break;
          }
        }

        if (!fallbackFound) {
          errors.push(
            `Public export changed in ${normFile} but no adjacent markdown specification was updated in ${fileDir} or its parent directories.`
          );
        }
      }
    }
  }

  if (publicApiChanged && !moduleMapChanged) {
    errors.push(
      `Public interfaces were modified, but the central module map (${MODULE_MAP_PATH}) was not updated.`
    );
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

function main() {
  const base = getMergeBase();
  const modifiedFiles = getModifiedFiles(base);
  const config = loadConfig();

  const getFileContent = (ref, filePath) => getFileContentFromGit(base, filePath);
  const readFile = (filePath) => fs.readFileSync(filePath, "utf8");

  const result = runValidation({
    modifiedFiles,
    config,
    getFileContent,
    readFile,
  });

  if (!result.success) {
    console.error("\x1b[31m[ERROR] Semantic Interface Change Detection Failed:\x1b[0m");
    for (const err of result.errors) {
      console.error(` - ${err}`);
    }
    process.exit(1);
  } else {
    console.log("\x1b[32m[SUCCESS] Semantic interface validation passed.\x1b[0m");
  }
}

if (require.main === module) {
  main();
} else {
  module.exports = {
    getMergeBase,
    getModifiedFiles,
    getFileContentFromGit,
    normalizeExport,
    getExportSignatures,
    arraysEqual,
    getDirChain,
    loadConfig,
    runValidation,
    main,
  };
}
