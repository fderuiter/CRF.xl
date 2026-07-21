const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const docsDir = path.join(projectRoot, 'docs');
const srcDir = path.join(projectRoot, 'src');

let tempFiles = [];

// Cleanup handler
function cleanup() {
  for (const file of tempFiles) {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
      } catch (e) {
        console.error(`Failed to delete temporary file ${file}:`, e);
      }
    }
  }
}

// Register cleanup
process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(1); });
process.on('SIGTERM', () => { cleanup(); process.exit(1); });
process.on('uncaughtException', (err) => { 
  console.error(err); 
  cleanup(); 
  process.exit(1); 
});

function findMarkdownFiles(dir, filesList = []) {
  if (!fs.existsSync(dir)) return filesList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules') {
        findMarkdownFiles(filePath, filesList);
      }
    } else if (filePath.endsWith('.md')) {
      filesList.push(filePath);
    }
  }
  return filesList;
}

const markdownFiles = [
  ...findMarkdownFiles(docsDir),
  ...findMarkdownFiles(srcDir)
];
const rootReadme = path.join(projectRoot, 'README.md');
if (fs.existsSync(rootReadme)) {
  markdownFiles.push(rootReadme);
}

// Extract blocks
const blockInfoMap = new Map(); // mapping temp file path -> { mdPath, startLine }

for (const mdFile of markdownFiles) {
  const content = fs.readFileSync(mdFile, 'utf8');
  const lines = content.split('\n');
  let inBlock = false;
  let currentBlock = [];
  let blockStartLine = 0;
  let extension = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!inBlock) {
      const match = line.match(/^```(typescript|ts|javascript|js)\s*$/i);
      if (match) {
        inBlock = true;
        currentBlock = [];
        blockStartLine = i + 1; // 1-based line of the ```
        const lang = match[1].toLowerCase();
        extension = (lang === 'typescript' || lang === 'ts') ? 'ts' : 'js';
      }
    } else {
      if (line.match(/^```\s*$/)) {
        inBlock = false;
        if (currentBlock.length > 0) {
          const tempFileName = `.temp-extracted-${blockStartLine}.${extension}`;
          const tempFilePath = path.join(path.dirname(mdFile), tempFileName);
          fs.writeFileSync(tempFilePath, currentBlock.join('\n') + '\n');
          tempFiles.push(tempFilePath);
          blockInfoMap.set(tempFilePath, { mdPath: mdFile, startLine: blockStartLine });
        }
      } else {
        currentBlock.push(line);
      }
    }
  }
}

if (tempFiles.length === 0) {
  console.log('No code blocks found in markdown files.');
  process.exit(0);
}

let hasErrors = false;

// 1. Run tsc
console.log('Compiling markdown code blocks...');
try {
  // Use tsc --noEmit, which will read tsconfig.json and find the temp files
  // We capture output to map errors
  execSync('./node_modules/.bin/tsc --noEmit', { stdio: 'pipe', cwd: projectRoot });
} catch (error) {
  const output = error.stdout ? error.stdout.toString() : '';
  const lines = output.split('\n');
  const tempFileRegex = /^(.*?\.temp-extracted-(\d+)\.(?:ts|js))\((\d+),\d+\): (.*)$/;
  
  for (const line of lines) {
    const match = line.match(tempFileRegex);
    if (match) {
      const tempPath = match[1];
      const errorLineInTemp = parseInt(match[3], 10);
      const message = match[4];
      
      const fullPath = path.resolve(projectRoot, tempPath);
      const info = blockInfoMap.get(fullPath);
      if (info) {
        const actualLine = info.startLine + errorLineInTemp;
        console.error(`\x1b[31m[TSC Error]\x1b[0m ${info.mdPath}:${actualLine} - ${message}`);
        hasErrors = true;
      } else {
        // Fallback if we somehow can't match
        console.error(line);
      }
    } else if (line.trim().length > 0 && !line.includes('Found 1 error.') && !line.includes('Found ') && !line.match(/^[\s\n]*$/)) {
      // Just print non-matched lines
      console.error(line);
    }
  }
}

// 2. Run eslint
console.log('Linting markdown code blocks...');
try {
  // chunk temp files to avoid max command line length
  const chunkSize = 50;
  for (let i = 0; i < tempFiles.length; i += chunkSize) {
    const chunk = tempFiles.slice(i, i + chunkSize);
    const filesArg = chunk.map(f => `"${f}"`).join(' ');
    execSync(`npx eslint --format=json ${filesArg}`, { stdio: 'pipe', cwd: projectRoot });
  }
} catch (error) {
  if (error.stdout) {
    try {
      const results = JSON.parse(error.stdout.toString());
      for (const result of results) {
        const info = blockInfoMap.get(result.filePath);
        if (info && result.messages.length > 0) {
          for (const msg of result.messages) {
            const actualLine = info.startLine + msg.line;
            console.error(`\x1b[31m[ESLint Error]\x1b[0m ${info.mdPath}:${actualLine} - ${msg.message} (${msg.ruleId})`);
            hasErrors = true;
          }
        }
      }
    } catch (e) {
      console.error(error.stdout.toString());
      hasErrors = true;
    }
  } else {
    console.error(error.message);
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error('\n\x1b[31mValidation failed with errors in markdown code blocks.\x1b[0m');
  process.exit(1);
} else {
  console.log('\x1b[32mValidation passed successfully.\x1b[0m');
}
