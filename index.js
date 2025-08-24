const fs = require('fs-extra');
const path = require('path');
const config = require('./config/config.json');

// Services
const { handleInput } = require('./services/input-handler');
const { parseCodebase } = require('./services/parser');
// const { extractContext } = require('./services/context');
// const { scanForIssues } = require('./services/scanner');
// const { injectComments } = require('./services/injector');
// const { generateDocs } = require('./services/docs');

async function main(input) {
  try {
    console.log('Starting ICADG analysis...');

    // Step 1: Handle input
    const tempPath = await handleInput(input);
    
    // Step 2: Parse codebase
    const parsedPath = await parseCodebase(tempPath);
    
    // TODO: Chain other steps here (context, scanning, etc.)
    
    // Cleanup temp (optional, based on config)
    // await fs.remove(tempPath);
    
    console.log('Analysis complete. Outputs in:', config.outputDir);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

// CLI handling
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node index.js <zip-path-or-git-url>');
  process.exit(1);
}
main(args[0]);