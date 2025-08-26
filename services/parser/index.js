const fs = require('fs-extra');
const path = require('path');
const babelParser = require('@babel/parser');
const Parser = require('tree-sitter');

// Load language grammars
const JavaScript = require('tree-sitter-javascript');
const Python = require('tree-sitter-python');
const Java = require('tree-sitter-java');
const Cpp = require('tree-sitter-cpp');
const Html = require('tree-sitter-html');
const Css = require('tree-sitter-css');

const config = require('../../config/config.json');
const PARSED_OUTPUT = path.join(__dirname, '../../', config.tempDir, 'parsed.json');

const languageMap = {
  '.js': { parser: new Parser(), lang: JavaScript, langName: 'javascript', babel: true },
  '.jsx': { parser: new Parser(), lang: JavaScript, langName: 'javascript', babel: true, plugins: ['jsx'] },
  '.ts': { parser: new Parser(), lang: JavaScript, langName: 'javascript', babel: true, plugins: ['typescript'] },
  '.tsx': { parser: new Parser(), lang: JavaScript, langName: 'javascript', babel: true, plugins: ['typescript', 'jsx'] },
  '.py': { parser: new Parser(), lang: Python, langName: 'python' },
  '.java': { parser: new Parser(), lang: Java, langName: 'java' },
  '.cpp': { parser: new Parser(), lang: Cpp, langName: 'cpp' },
  '.hpp': { parser: new Parser(), lang: Cpp, langName: 'cpp' },
  '.html': { parser: new Parser(), lang: Html, langName: 'html' },
  '.css': { parser: new Parser(), lang: Css, langName: 'css' }
};


/**
 * Initializes parsers for each language.
 */
function initParsers() {
  Object.values(languageMap).forEach(({ parser, lang }) => {
    if (parser && lang) parser.setLanguage(lang);
  });
}

/**
 * Parses a single file.
 * @param {string} filePath - Path to the file.
 * @returns {object|null} Parsed AST or null if unsupported/error.
 */
async function parseFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const langConfig = languageMap[ext];
  if (!langConfig) return null;

  try {
    const code = await fs.readFile(filePath, 'utf8');
    
    if (langConfig.babel) {
      // Use Babel for richer JS/TS AST
      return babelParser.parse(code, {
        sourceType: 'module',
        plugins: langConfig.plugins || []
      });
    } else {
      // Use Tree-sitter for other languages
      const tree = langConfig.parser.parse(code);
      return tree.rootNode.toString(); // Or serialize to JSON if needed: tree.rootNode
    }
  } catch (err) {
    console.warn(`Failed to parse ${filePath}: ${err.message}`);
    return null;
  }
}

/**
 * Traverses and parses the codebase.
 * @param {string} dirPath - Temp dir path.
 * @returns {Promise<string>} Path to parsed JSON output.
 */
async function parseCodebase(dirPath) {
  initParsers();
  const parsedData = {};
  const files = await fs.readdir(dirPath, { recursive: true });

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if ((await fs.stat(fullPath)).isFile()) {
      const ast = await parseFile(fullPath);
      if (ast) {
        parsedData[file] = ast; // Key by relative path
      }
    }
  }

  await fs.writeJson(PARSED_OUTPUT, parsedData, { spaces: 2 });
  console.log(`Codebase parsed. Output: ${PARSED_OUTPUT}`);
  return PARSED_OUTPUT;
}

module.exports = { parseCodebase, languageMap };
