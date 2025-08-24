const fs = require('fs-extra');
const path = require('path');

const directories = [
  'cli',
  'services/input-handler',
  'services/parser',
  'services/context',
  'services/scanner',
  'services/injector',
  'services/docs',
  'scheduler',
  'config',
  'output',
  'temp'
];

directories.forEach(dir => {
  fs.ensureDirSync(path.join(__dirname, dir));
});

console.log('Project structure created.');