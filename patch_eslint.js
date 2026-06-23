const fs = require('fs');
let config = JSON.parse(fs.readFileSync('.eslintrc.json', 'utf8'));
config.rules["@typescript-eslint/no-unused-vars"] = "off";
if (config.overrides && config.overrides[0]) {
  config.overrides[0].rules["@typescript-eslint/no-unused-vars"] = "off";
}
fs.writeFileSync('.eslintrc.json', JSON.stringify(config, null, 2));
