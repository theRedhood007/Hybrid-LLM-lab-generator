# Hybrid LLM Lab Generator

A hybrid Large Language Model (LLM) pipeline that automatically generates secure coding laboratories for the RedBlue Code training platform.

Instead of asking an LLM to generate an entire application, the system separates the generation process into structured stages. The LLM produces a validated lab specification, while deterministic local compilers generate the application source code, Docker configuration, functional tests, security tests, and deployment artifacts.

This hybrid architecture significantly improves consistency, validation success rate, reproducibility, and scalability compared to direct end-to-end code generation.

---

## Key Features

- Hybrid LLM + deterministic compiler architecture
- Automated secure coding lab generation
- Structured Lab Specification (LabSpec) generation
- Static specification validation
- Automatic source code compilation
- Runtime validation
- Platform publishing pipeline
- Support for multiple vulnerability scenarios and difficulty levels 

## Why a Hybrid Approach?

Early experiments used direct end-to-end generation, where the LLM was responsible for producing the complete lab application, configuration files, tests, and metadata.

This approach caused several reliability problems:

- Invalid JSON and malformed configuration files
- Inconsistent project structures
- Missing dependencies and required files
- Incorrect routes and test expectations
- Weak difficulty separation between generated labs
- Repeated validator failures
- High output variability between attempts

The final architecture limits the LLM to generating a structured LabSpec. Deterministic local components then compile that specification into a complete lab.

This separation gives the system a clear responsibility boundary:

- **LLM:** generates the scenario, learning objectives, routes, inputs, payloads, and expected behavior
- **Compiler:** generates the source code, package files, tests, Docker configuration, and lab definition
- **Validators:** verify specification quality, static structure, and runtime behavior

---

## Generation Pipeline

```text
User Request
      │
      ▼
Prompt Builder
      │
      ▼
Qwen2.5-Coder (Ollama)
      │
      ▼
LabSpec Generation
      │
      ▼
LabSpec Validation
      │
      ▼
Compiler
      │
      ├──────────────┐
      ▼              ▼
Static Validation   Runtime Validation
      │              │
      └──────┬───────┘
             ▼
      Publish to Platform
```

### Pipeline Stages

1. **Prompt Builder**
   - Constructs a structured prompt from the requested vulnerability, scenario, and difficulty.

2. **LLM Generation**
   - Qwen2.5-Coder generates a structured Lab Specification (LabSpec) instead of application source code.

3. **Specification Validation**
   - Ensures the generated specification satisfies schema requirements before compilation.

4. **Compiler**
   - Converts the validated LabSpec into a complete runnable lab, including:
     - Vulnerable application
     - Secure solution
     - Functional tests
     - Security tests
     - Docker configuration
     - Platform metadata

5. **Static Validation**
   - Verifies project structure, required files, configuration consistency, and generated artifacts.

6. **Runtime Validation**
   - Executes the generated lab inside Docker and confirms that functional behavior and security tests behave as expected.

7. **Publishing**
   - Publishes the validated lab into the RedBlue Code platform, making it available for learners.

---

## Project Structure

```
.
├── src/                     # Core generation and validation pipeline
├── prompts/                 # Prompt templates used for LLM generation
├── requests/                # Example generation requests
├── hybrid-generator/        # Early LabSpec prototype implementation
├── generated/               # Generated labs (ignored in Git)
├── generated-specs/         # Generated LabSpecs (ignored in Git)
├── package.json             # Project configuration
└── README.md
```

### Important Components

| Component | Responsibility |
|-----------|----------------|
| `generateLabSpec.js` | Generates a LabSpec using the LLM |
| `validateLabSpec.js` | Validates the generated specification |
| `compileSpecToLab.js` | Compiles a LabSpec into a runnable lab |
| `generateSpecAndPublish.js` | Executes the complete generation pipeline |
| `runtimeValidateLab.js` | Executes runtime validation |
| `validateLab.js` | Performs static validation |
| `publishToPlatform.js` | Publishes validated labs to the RedBlue Code platform |
| `judgeLab.js` | Evaluates generated labs during generation and retry loops |
| `ollamaClient.js` | Handles communication with the Ollama API |

---

## Installation

### Prerequisites

- Node.js 20+
- Ollama
- Qwen2.5-Coder model
- Git

### Clone the repository

```bash
git clone https://github.com/theRedhood007/Hybrid-LLM-lab-generator.git
cd Hybrid-LLM-lab-generator
```

### Install dependencies

```bash
npm install
```

### Configure environment

Create a `.env` file:

```env
OLLAMA_URL=http://localhost:11434/api/generate
OLLAMA_MODEL=qwen2.5-coder:1.5b
```

### Verify installation

```bash
npm run
```

You should see the available generation, validation, compilation, and publishing scripts.

---

## Usage

### Start Ollama

Make sure Ollama is running and the required model is installed:

```bash
ollama serve
```

In another terminal:

```bash
ollama pull qwen2.5-coder:1.5b
```

### Run the Complete Hybrid Pipeline

Provide one of the request JSON files to the publishing pipeline:

```bash
npm run generate:publish -- requests/xss-beginner-sports-store-request.json
```

This command performs the following stages:

1. Generates a structured LabSpec using Ollama
2. Validates the LabSpec
3. Compiles the specification into a runnable lab
4. Performs static validation
5. Publishes the validated lab to the RedBlue Code platform

Generated specifications are written to:

```text
generated-specs/
```

Compiled lab definitions are written to:

```text
generated/
```

### Run Individual Pipeline Stages

Generate a LabSpec:

```bash
npm run generate:spec -- requests/xss-beginner-sports-store-request.json
```

Validate a generated LabSpec:

```bash
npm run validate:spec -- generated-specs/sports-store-search.labSpec.json
```

Compile a validated LabSpec:

```bash
npm run compile:spec -- generated-specs/sports-store-search.labSpec.json
```

Validate a compiled lab:

```bash
npm run validate:lab -- generated/xss-sports-store-search-node-express-beginner.json
```

Run runtime validation:

```bash
npm run validate:runtime -- generated/xss-sports-store-search-node-express-beginner.json
```

### Request Format

A generation request is supplied as a JSON file:

```json
{
  "vulnerabilityType": "xss",
  "difficulty": "beginner",
  "scenarioId": "sports-store-search",
  "businessContext": "Online sportswear store"
}
```

The request controls the vulnerability type, difficulty level, scenario, and business context used during LabSpec generation.

---

## Technology Stack

| Category             | Technologies                 |
| -------------------- | ---------------------------- |
| Programming Language | JavaScript (Node.js)         |
| Runtime              | Node.js 20+                  |
| AI Model             | Qwen2.5-Coder 1.5B           |
| LLM Runtime          | Ollama                       |
| Validation           | AJV (JSON Schema Validation) |
| Formatting           | Prettier                     |
| Data Format          | JSON                         |
| Platform Integration | RedBlue Code Platform        |
| Version Control      | Git & GitHub                 |

---

## Repository Status

This repository contains the standalone Hybrid LLM generation pipeline developed for the RedBlue Code platform.

The generator produces structured Lab Specifications (LabSpecs), validates them, compiles them into complete secure coding laboratories, and publishes validated labs to the platform.

---

## Future Work

Future improvements include:

* Support for additional vulnerability categories (SQL Injection, CSRF, SSRF, Command Injection)
* Multi-language lab generation
* Retrieval-Augmented Generation (RAG) for improved consistency
* Model-independent generation backends
* MCP (Model Context Protocol) integration for external tooling
* Automated self-correction based on validator feedback
* Expanded scenario library and difficulty profiles
