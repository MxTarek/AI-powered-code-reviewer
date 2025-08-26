# API Documentation for code-intel-engine Service Modules

This document describes the main methods and interfaces exported by the primary service modules of the project.

---

## services/input-handler

### handleInput(input: string): Promise<string>
- Accepts a path to a zip file or a Git repository URL as input.
- Extracts the zip or clones the Git repo into a temporary directory (configured in `config/tempDir`).
- Validates that the extracted directory has source code files.
- Returns the path to the extracted/cloned temporary directory.

---

## services/parser

### parseCodebase(dirPath: string): Promise<string>
- Accepts the path to the extracted codebase directory.
- Uses Babel (for JS/TS) or Tree-sitter (for other supported languages) to parse each file into an AST representation.
- Aggregates all parsed ASTs in a JSON structure.
- Writes parsed data to `parsed.json` inside the temporary directory.
- Returns the path to the `parsed.json`.

### languageMap (exported constant)
- Maps file extensions (e.g., `.js`, `.py`) to parser configs.
- Helps identify which parser and plugins to use per file type.

---

## services/context

### extractContext(parsedPath: string): Promise<string>
- Reads the parsed AST JSON from `parsed.json`.
- For JS/TS ASTs, uses Babel traverse to extract lists of functions, classes, variables, imports, exports.
- For other languages, performs basic extractions from Tree-sitter JSON representations.
- Produces a consolidated context JSON describing code structure by file.
- Writes context data to `context.json` inside the temporary directory.
- Returns the path to the `context.json`.

---

## services/scanner

### scanForIssues(contextPath: string, tempPath: string): Promise<string>
- Loads the context JSON and iterates over each file context.
- Reads the original source file corresponding to the context.
- Builds a prompt combining code context and code snippet.
- Sends prompts to the configured LLM API (Ollama or Azure OpenAI) via HTTP POST requests.
- Parses LLM JSON responses listing issues detected in the code.
- Aggregates all issues and writes them in a JSON report to the output directory configured in `config/outputDir`.
- Returns the path to the issues JSON report.

---

If you'd like, I can also help generate similar markdown for the other planned modules (`injector`, `docs`) or for the example web service in `temp/src`. Let me know!