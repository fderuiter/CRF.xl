const { execSync } = require('child_process');

try {
  // Execute ts-prune. Note: ts-prune exits with 1 if it finds ANY dead code.
  execSync('npx ts-prune -p tsconfig.json', { stdio: 'pipe' });
  console.log('No dead code detected.');
  process.exit(0);
} catch (e) {
  const output = e.stdout ? e.stdout.toString() : '';
  const lines = output.split('\n').filter(Boolean);
  
  const failingLines = lines.filter(line => {
    // Ignore test files
    if (line.includes('test') || line.includes('__tests__') || line.includes('.test.')) return false;
    
    // We only enforce on UI components, core parser, and mapping services
    const isComponent = line.includes('src/taskpane/components/');
    const isParser = line.includes('src/taskpane/core/parser/');
    const isMapping = line.includes('cdisc-ct-mapping-service');
    
    if (isComponent || isParser || isMapping) {
      return true;
    }
    
    return false;
  });

  if (failingLines.length > 0) {
    console.error('Dead code detected in monitored directories:');
    console.error(failingLines.join('\n'));
    process.exit(1);
  } else {
    console.log('No dead code detected in target services.');
    process.exit(0);
  }
}
