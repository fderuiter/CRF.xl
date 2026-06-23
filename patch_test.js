const fs = require('fs');
const file = 'src/taskpane/core/services/__tests__/migration-pipeline.test.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  '// Node environment doesn\'t have sessionStorage — verify graceful no-op\n  it("gracefully handles missing sessionStorage", () => {',
  `// Node environment doesn't have sessionStorage — verify graceful no-op
  it("gracefully handles missing sessionStorage", () => {
    const originalSessionStorage = global.sessionStorage;
    Object.defineProperty(global, 'sessionStorage', { value: undefined, configurable: true });`
);

code = code.replace(
  'expect(loadImportManifest()).toBeNull();\n  });',
  `expect(loadImportManifest()).toBeNull();
    Object.defineProperty(global, 'sessionStorage', { value: originalSessionStorage, configurable: true });
  });`
);

fs.writeFileSync(file, code);
