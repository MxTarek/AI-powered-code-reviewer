const fs = require('fs-extra');
const path = require('path');
const AdmZip = require('adm-zip');
const simpleGit = require('simple-git');
const config = require('../../config/config.json');

const TEMP_DIR = path.join(__dirname, '../../', config.tempDir);

/**
 * Prepares the temp directory.
 */
async function prepareTempDir() {
  await fs.emptyDir(TEMP_DIR);
}

/**
 * Validates if the directory contains code files.
 */
async function validateCodebase(dirPath) {
  const files = await fs.readdir(dirPath, { recursive: true });
  const codeExtensions = ['.js', '.ts', '.py', '.java', '.cpp', '.html', '.css'];
  return files.some(file => codeExtensions.includes(path.extname(file).toLowerCase()));
}

/**
 * Handles zip or Git input.
 * @param {string} input - Zip path or Git URL.
 * @returns {Promise<string>} Temp dir path.
 */
async function handleInput(input) {
  await prepareTempDir();

  if (input.endsWith('.zip')) {
    if (!fs.existsSync(input)) throw new Error(`Zip not found: ${input}`);
    const zip = new AdmZip(input);
    zip.extractAllTo(TEMP_DIR, true);
    console.log(`Zip extracted to ${TEMP_DIR}`);
  } else if (input.startsWith('http') || input.startsWith('git@')) {
    const git = simpleGit();
    await git.clone(input, TEMP_DIR);
    console.log(`Repo cloned to ${TEMP_DIR}`);
  } else {
    throw new Error('Invalid input: Zip path or Git URL required.');
  }

  if (!await validateCodebase(TEMP_DIR)) {
    await fs.remove(TEMP_DIR);
    throw new Error('Invalid codebase: No source files found.');
  }

  return TEMP_DIR;
}

module.exports = { handleInput };