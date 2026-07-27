# Ollama + WSL Lab Generator Snapshot

## Project Path

/mnt/d/ollama

## Goal

Build a local LLM-based vulnerable lab generator using Ollama.  
The LLM generates candidate labs only.  
The deterministic validator decides whether the lab is acceptable.

## Current Focus

Attack type: XSS  
Framework: Node.js + Express  
Runtime: WSL Ubuntu  
LLM: Ollama local model

## Required Lab Structure

Each generated lab should include:

- vulnerable files
- solution files
- functional tests
- security payloads
- metadata

## Required Node.js Rule

Every generated Express app must support:

process.env.PORT

Example:

const PORT = process.env.PORT || 3000;

## Validation Flow

1. Static schema validation
2. Safe file/path validation
3. Materialize files under generated/
4. Install dependencies using npm install --ignore-scripts
5. Start vulnerable app on dynamic port
6. Run functional tests
7. Confirm vulnerability exists before patch
8. Apply solution files
9. Start patched app on separate dynamic port
10. Confirm vulnerability is fixed
11. Accept or reject the lab

## Runtime Folder Note

If inside /mnt/d/ollama:

LATEST=$(ls -td .runtime-runs/xss-preview-card-node-express-intermediate-* | head -1)

If already inside /mnt/d/ollama/.runtime-runs:

LATEST=$(ls -td xss-preview-card-node-express-intermediate-* | head -1)

## Integration Note

Generated labs will only appear in the platform UI after integration.  
The current generator creates lab files, but the platform still needs to read the metadata and start/preview the lab.

## Next Plan

1. Examine advanced XSS lab
2. Generate intermediate SQL injection lab
3. Generate advanced SQL injection lab
4. Validate both
5. Integrate generated labs into the platform
