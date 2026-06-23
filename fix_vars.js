const fs = require('fs');

function replaceUnused(file, str) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(str, `// eslint-disable-next-line @typescript-eslint/no-unused-vars\n${str}`);
  fs.writeFileSync(file, content);
}

replaceUnused('src/taskpane/core/services/__tests__/ct-import-service.test.ts', 'const _name: any =');
replaceUnused('src/taskpane/core/services/__tests__/ct-import-service.test.ts', 'const _colCount: any =');
replaceUnused('src/taskpane/core/services/__tests__/diff-engine.test.ts', 'const _t1: any =');
replaceUnused('src/taskpane/core/services/__tests__/diff-engine.test.ts', 'const _t2: any =');

let ctContent = fs.readFileSync('src/taskpane/core/services/__tests__/ct-import-service.test.ts', 'utf8');
ctContent = ctContent.replaceAll('const _clearType: any =', '// eslint-disable-next-line @typescript-eslint/no-unused-vars\nconst _clearType: any =');
fs.writeFileSync('src/taskpane/core/services/__tests__/ct-import-service.test.ts', ctContent);

let loc = fs.readFileSync('src/taskpane/core/locale-config.ts', 'utf8');
loc = loc.replaceAll('catch () {', 'catch (e) { // eslint-disable-line @typescript-eslint/no-unused-vars');
fs.writeFileSync('src/taskpane/core/locale-config.ts', loc);

let val = fs.readFileSync('src/taskpane/core/services/validation-engine.ts', 'utf8');
val = val.replaceAll('catch () {', 'catch (e) { // eslint-disable-line @typescript-eslint/no-unused-vars');
fs.writeFileSync('src/taskpane/core/services/validation-engine.ts', val);

