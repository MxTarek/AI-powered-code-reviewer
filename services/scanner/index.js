const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const config = require('../../config/config.json');

const OUTPUT_DIR = path.join(__dirname, '../../', config.outputDir);
const ISSUES_OUTPUT = path.join(OUTPUT_DIR, 'issues.json');

/**
 * Builds a prompt for LLM analysis.
 * @param {string} file - File path.
 * @param {object} context - Extracted context for the file.
 * @param {string} code - Original code snippet.
 * @returns {string} Prompt string.
 */
function buildPrompt(file, context, code) {
  return `
Analyze the following code from ${file} for potential issues, bugs, security vulnerabilities, performance improvements, and best practices suggestions. Provide concise, actionable insights.

Context:
Functions: ${JSON.stringify(context.functions)}
Classes: ${JSON.stringify(context.classes)}
Imports: ${JSON.stringify(context.imports)}

Code:
${code}

Respond in JSON format: {
  "issues": [
    {"type": "bug|security|performance|best-practice", "description": "...", "line": number, "suggestion": "..."}
  ]
}
`;
}

/**
 * Calls the LLM API (Ollama or Azure).
 * @param {string} prompt - The prompt.
 * @returns {Promise<object>} Parsed JSON response.
 */
async function callLLM(prompt) {
  let endpoint, headers, body;

  if (config.ollama && config.ollama.url && config.ollama.apiKey) {
    endpoint = `${config.ollama.url}/api/generate`; // Adjust if using /chat
    headers = { 'Authorization': `Bearer ${config.ollama.apiKey}`, 'Content-Type': 'application/json' };
    body = { model: config.ollama.model, prompt: prompt, stream: false };
  } else if (config.azureOpenAI && config.azureOpenAI.endpoint && config.azureOpenAI.apiKey) {
    endpoint = `${config.azureOpenAI.endpoint}/openai/deployments/${config.azureOpenAI.model}/chat/completions?api-version=2023-05-15`;
    headers = { 'api-key': config.azureOpenAI.apiKey, 'Content-Type': 'application/json' };
    body = { messages: [{ role: 'user', content: prompt }], temperature: 0.7 };
  } else {
    throw new Error('No valid LLM config found.');
  }

  try {
    const response = await axios.post(endpoint, body, { headers });
    if (config.ollama) {
      return JSON.parse(response.data.response); // Adjust based on Ollama response format
    } else {
      let content = response.data.choices[0].message.content;
      // Remove markdown code fences ``` and language annotation
      content = content.replace(/^```[a-z]*\n/, '');
      content = content.replace(/\n```$/, '');
      return JSON.parse(content);
    }
  } catch (err) {
    throw new Error(`LLM call failed: ${err.message}`);
  }
}

/**
 * Scans the codebase using LLM.
 * @param {string} contextPath - Path to context.json.
 * @param {string} tempPath - Temp dir path.
 * @returns {Promise<string>} Path to issues.json.
 */
async function scanForIssues(contextPath, tempPath) {
  await fs.ensureDir(OUTPUT_DIR);
  const contextData = await fs.readJson(contextPath);
  const allIssues = {};

  for (const [relFile, ctx] of Object.entries(contextData)) {
    const fullFile = path.join(tempPath, relFile);
    if (!await fs.pathExists(fullFile)) continue;

    const code = await fs.readFile(fullFile, 'utf8');
    const prompt = buildPrompt(relFile, ctx, code); // For large files, chunk by function later

    try {
      const analysis = await callLLM(prompt);
      allIssues[relFile] = analysis.issues || [];
    } catch (err) {
      console.warn(`Scan failed for ${relFile}: ${err.message}`);
      allIssues[relFile] = [{ type: 'error', description: err.message }];
    }
  }

  await fs.writeJson(ISSUES_OUTPUT, allIssues, { spaces: 2 });
  console.log(`Scan complete. Issues: ${ISSUES_OUTPUT}`);
  return ISSUES_OUTPUT;
}

module.exports = { scanForIssues };