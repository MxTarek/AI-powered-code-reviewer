const fs = require('fs-extra');
const path = require('path');
const traverse = require('@babel/traverse').default;
const t = require('@babel/types');
const Parser = require('tree-sitter'); // For queries

const config = require('../../config/config.json');
const CONTEXT_OUTPUT = path.join(__dirname, '../../', config.tempDir, 'context.json');

// Re-use language configs from parser (extend as needed)
const languageMap = require('../parser').languageMap; // Assume exported, or copy here

// Tree-sitter queries (basic examples; expand for more)
const tsQueries = {
  javascript: `
    (function_declaration name: (identifier) @func.name
      parameters: (formal_parameters) @func.params)
    (class_declaration name: (identifier) @class.name)
    (variable_declaration (variable_declarator name: (identifier) @var.name))
    (import_statement) @import
    (export_statement) @export
  `,
  python: `
    (function_definition name: (identifier) @func.name
      parameters: (parameters) @func.params)
    (class_definition name: (identifier) @class.name)
    (assignment left: (identifier) @var.name)
    (import_statement) @import
  `,
  // Add for java, cpp, etc. similarly
};

/**
 * Extracts from Babel AST (JS/TS).
 * @param {object} ast - Babel AST.
 * @returns {object} Extracted context.
 */
function extractFromBabel(ast) {
  const context = {
    functions: [],
    classes: [],
    variables: [],
    imports: [],
    exports: []
  };

  traverse(ast, {
    FunctionDeclaration(path) {
      context.functions.push({
        name: path.node.id.name,
        params: path.node.params.map(p => p.name),
        // Add more: body length, returns, etc.
      });
    },
    ClassDeclaration(path) {
      context.classes.push({
        name: path.node.id.name,
        // Methods: path.get('body').get('body').filter(m => t.isClassMethod(m))
      });
    },
    VariableDeclaration(path) {
      path.node.declarations.forEach(decl => {
        if (t.isIdentifier(decl.id)) {
          context.variables.push({ name: decl.id.name });
        }
      });
    },
    ImportDeclaration(path) {
      context.imports.push({
        source: path.node.source.value,
        specifiers: path.node.specifiers.map(s => s.local.name)
      });
    },
    ExportNamedDeclaration(path) {
      if (path.node.declaration) {
        context.exports.push({ name: path.node.declaration.id.name });
      }
    },
    // Add more visitors: CallExpression for calls, etc.
  });

  return context;
}

/**
 * Extracts from Tree-sitter tree (other langs).
 * @param {string} treeSexp - Tree-sitter sexp string.
 * @param {string} lang - Language key.
 * @returns {object} Extracted context.
 */
function extractFromTreeSitter(treeSexp, lang) {
  const context = {
    functions: [],
    classes: [],
    variables: [],
    imports: [],
    exports: [] // Exports vary by lang
  };

  // For simplicity, parse sexp or use query (better: load tree and query)
  // Note: To query properly, we'd need the actual Tree object, but since parser outputs toString(), this is placeholder.
  // In production, modify parser to output tree object instead of string for non-Babel.
  // For now, regex/placeholder for demo.
  console.warn(`Tree-sitter extraction for ${lang} is basic; enhance with full queries.`);

  // Example regex for funcs (improve with actual query execution)
  const funcRegex = /function_declaration.*name: \(identifier "([^"]+)"\)/g;
  let match;
  while ((match = funcRegex.exec(treeSexp))) {
    context.functions.push({ name: match[1] });
  }

  // TODO: Implement full query: parser.query(tsQueries[lang]).matches(tree)
  return context;
}

/**
 * Extracts context from parsed data.
 * @param {string} parsedPath - Path to parsed.json.
 * @returns {Promise<string>} Path to context.json.
 */
async function extractContext(parsedPath) {
  const parsedData = await fs.readJson(parsedPath);
  const allContext = {};

  for (const [file, astOrTree] of Object.entries(parsedData)) {
    const ext = path.extname(file).toLowerCase();
    const langConfig = languageMap[ext];
    if (!langConfig) continue;

    if (langConfig.babel) {
      allContext[file] = extractFromBabel(astOrTree);
    } else {
      allContext[file] = extractFromTreeSitter(astOrTree, langConfig.lang.name); // Assume lang has name
    }
  }

  await fs.writeJson(CONTEXT_OUTPUT, allContext, { spaces: 2 });
  console.log(`Context extracted. Output: ${CONTEXT_OUTPUT}`);
  return CONTEXT_OUTPUT;
}

module.exports = { extractContext };