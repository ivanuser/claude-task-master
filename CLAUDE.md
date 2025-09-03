# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md

## Project Overview

Task Master AI is a task management system for AI-driven development that integrates with Claude Code via both CLI and MCP (Model Context Protocol). It provides structured task organization, PRD parsing, dependency management, and AI-powered task analysis.

## Essential Development Commands

### Common Commands
```bash
# Testing
npm test                    # Run all unit tests with Jest
npm run test:watch         # Run tests in watch mode  
npm run test:coverage      # Generate coverage report
npm run test:e2e          # Run end-to-end tests

# Code Quality
npm run format            # Format code with Biome
npm run format-check      # Check code formatting

# MCP Development
npm run inspector         # Launch MCP inspector for debugging
npm run mcp-server        # Start MCP server directly

# Release Management
npm run changeset         # Create a changeset for releases
npm run release          # Publish release via changesets
```

### Test-Driven Development
- Tests are organized in `tests/` with unit, integration, and e2e subdirectories
- Use `npm test` to run the full suite
- For specific test files: `node --experimental-vm-modules node_modules/.bin/jest path/to/test.js`
- Mock file system operations using `mock-fs` package
- Test fixtures are in `tests/fixtures/`

## Architecture Overview

### Core Architecture
Task Master follows a modular architecture with clear separation of concerns:

1. **CLI Layer** (`bin/task-master.js` → `scripts/dev.js`)
   - Command parsing via Commander.js  
   - Environment loading (`.env` files)
   - CLI-specific user interaction

2. **Core Logic** (`scripts/modules/`)
   - `task-manager.js` - CRUD operations on tasks
   - `ai-services-unified.js` - Centralized AI provider interface
   - `config-manager.js` - Configuration management
   - `dependency-manager.js` - Task dependency handling
   - `ui.js` - CLI output formatting

3. **MCP Server** (`mcp-server/`)
   - FastMCP-based server for Claude Code integration
   - Tools in `mcp-server/src/tools/` map to CLI commands
   - Direct functions in `mcp-server/src/core/direct-functions/` provide core logic access

4. **AI Providers** (`src/ai-providers/`)
   - Provider-specific implementations using Vercel AI SDK
   - Support for Anthropic, OpenAI, Google, Perplexity, etc.

### Key Data Structures

#### Tagged Task Lists System
Task Master uses a tagged task system for organizing tasks across contexts:

```json
{
  "master": {
    "tasks": [/* task objects */]
  },
  "feature-branch": {
    "tasks": [/* separate context */] 
  }
}
```

- **Backward Compatibility**: Legacy format `{"tasks": [...]}` is automatically migrated
- **Tag Resolution**: Provides transparent legacy format access to existing code
- **Multi-Context Support**: Different branches/features can have isolated task lists

#### Task Structure
```json
{
  "id": "1.2",
  "title": "Implement user authentication", 
  "description": "Set up JWT-based auth system",
  "status": "pending|in-progress|done|deferred|cancelled|blocked",
  "priority": "low|medium|high|critical",
  "dependencies": ["1.1"],
  "subtasks": [],
  "details": "Implementation details...",
  "testStrategy": "Testing approach..."
}
```

### File System Structure

```
project/
├── .taskmaster/                    # Task Master project files
│   ├── tasks/
│   │   ├── tasks.json             # Main task database (tagged format)
│   │   └── task-*.md              # Individual task files (auto-generated)
│   ├── docs/prd.txt               # Product Requirements Document  
│   ├── config.json                # AI model configuration
│   └── state.json                 # Current tag and migration state
├── src/                           # Source code
│   ├── ai-providers/              # AI provider implementations
│   ├── constants/                 # Shared constants
│   ├── profiles/                  # IDE/editor-specific configurations
│   └── task-master.js             # Core TaskMaster class
├── scripts/                       # CLI implementation
│   └── modules/                   # Core business logic modules
├── mcp-server/                    # MCP server for Claude Code
│   ├── src/tools/                 # MCP tool implementations
│   └── src/core/direct-functions/ # Core logic wrappers for MCP
└── tests/                         # Test suite
    ├── unit/                      # Unit tests
    ├── integration/               # Integration tests
    └── e2e/                       # End-to-end tests
```

### AI Services Integration

The unified AI service layer (`scripts/modules/ai-services-unified.js`) provides:
- Provider abstraction using Vercel AI SDK
- Role-based model selection (main, research, fallback) 
- Automatic fallback and retry logic
- API key resolution from environment variables
- Streaming and non-streaming response handling

## Development Patterns

### Adding MCP Tools
To add new MCP functionality:

1. **Create Core Logic** in `scripts/modules/task-manager/your-feature.js`
2. **Create Direct Function** in `mcp-server/src/core/direct-functions/your-feature.js`:
   - Use `findTasksJsonPath(args, log)` for path resolution
   - Implement silent mode with `enableSilentMode()`/`disableSilentMode()`
   - Return `{success, data/error, fromCache}` format
3. **Create MCP Tool** in `mcp-server/src/tools/your-feature.js`:
   - Define Zod schema with optional `projectRoot`
   - Use `withNormalizedProjectRoot` HOF wrapper
   - Handle async operations with `AsyncOperationManager` if needed
4. **Register Tool** in `mcp-server/src/tools/index.js`

### Silent Mode Pattern for MCP
MCP direct functions must prevent console output:

```javascript
export async function yourFeatureDirect(args, log) {
  try {
    const tasksPath = findTasksJsonPath(args, log);
    
    enableSilentMode();
    try {
      const result = await coreFunction(tasksPath, ...otherArgs);
      return { success: true, data: result, fromCache: false };
    } finally {
      disableSilentMode();
    }
  } catch (error) {
    log.error(`Error: ${error.message}`);
    return { success: false, error: { code: 'ERROR', message: error.message }, fromCache: false };
  }
}
```

### Testing Patterns
- **Unit Tests**: Mock external dependencies, focus on single module behavior
- **Integration Tests**: Test interactions between modules  
- **Tagged System Tests**: Verify migration and multi-context functionality
- **E2E Tests**: Test complete CLI workflows end-to-end
- Use `mock-fs` for file system mocking
- Fixtures in `tests/fixtures/` for reusable test data

## Code Style

### Formatting
- Uses Biome for formatting (configured in `biome.json`)
- Tab indentation, single quotes, no trailing commas
- Line width: 80 characters

### Module Organization  
- **Kebab-case** for file names (`your-feature.js`)
- **CamelCase** for function names (`yourFeatureDirect`)
- Clear separation between CLI, core logic, and MCP layers
- Explicit dependency injection for testability

### Error Handling
- Use structured error objects with `code` and `message`
- Implement graceful fallbacks for AI service failures
- Proper cleanup in try/finally blocks for resource management

## Changeset Guidelines

When creating changesets, focus on user-facing impact rather than implementation details. Changesets should describe what the end-user is getting or what issue is being fixed from their perspective.

## Important Notes

- Never edit `tasks.json` manually - use CLI commands or MCP tools
- API keys are stored in `.env` files, not in configuration
- The tagged task system provides backward compatibility automatically
- All MCP tools support the tagged task format transparently
- Use `--research` flag with AI-powered commands for enhanced analysis
- Test both legacy and tagged data formats when modifying task handling code