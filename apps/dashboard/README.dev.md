# Task Master Dashboard - Development Guide

## Quick Start

### 1. Environment Setup

```bash
# Copy environment variables
npm run setup:env

# Run development setup
npm run dev:setup

# Start development server
npm run dev
```

### 2. Development Server

The dashboard runs on **port 3001** to avoid conflicts with other Next.js applications.

- **Development**: http://localhost:3001
- **API Routes**: http://localhost:3001/api/*

## Available Scripts

### Core Development
- `npm run dev` - Start development server on port 3001
- `npm run dev:debug` - Start with Node.js debugging enabled
- `npm run dev:turbo` - Start with Turbo mode (experimental faster builds)
- `npm run build` - Build production application
- `npm run start` - Start production server

### Code Quality
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run lint:strict` - Run ESLint with zero warnings tolerance
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check if code is properly formatted
- `npm run type-check` - Run TypeScript type checking
- `npm run validate` - Run all quality checks (lint + type-check + format)

### Development Tools
- `npm run dev:setup` - Run interactive development setup
- `npm run dev:monitor` - Start development health monitor
- `npm run setup:env` - Copy .env.example to .env.local
- `npm run clean` - Clean build artifacts
- `npm run clean:all` - Clean everything including node_modules

### Task Master Integration
- `npm run taskmaster:status` - View current tasks
- `npm run taskmaster:next` - Get next available task
- `npm run taskmaster:sync` - Sync with Task Master data

## Environment Configuration

### Required Files

1. **`.env.local`** - Your local development environment
   ```bash
   # Copy from template
   cp .env.example .env.local
   ```

2. **Parent Project `.env`** - API keys are inherited from `../../.env`

### Key Environment Variables

```bash
# Development
NODE_ENV=development
PORT=3001
NEXT_PUBLIC_DEV_MODE=true

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_TASKMASTER_API_URL=http://localhost:8080

# Task Master Integration
TASKMASTER_PROJECT_ROOT=../../
TASKMASTER_CONFIG_PATH=../../.taskmaster/config.json
TASKMASTER_TASKS_PATH=../../.taskmaster/tasks/tasks.json

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_REAL_TIME_UPDATES=true
NEXT_PUBLIC_ENABLE_DARK_MODE=true
```

## Development Workflow

### 1. Starting Development

```bash
# First time setup
npm run dev:setup

# Daily development
npm run dev

# With monitoring
npm run dev:monitor  # In separate terminal
```

### 2. Code Quality Workflow

```bash
# Before committing
npm run validate

# Fix issues
npm run lint:fix
npm run format
```

### 3. Task Master Integration

```bash
# Check current tasks
npm run taskmaster:status

# Get next task to work on
npm run taskmaster:next

# Sync after Task Master changes
npm run taskmaster:sync
```

## Project Structure

```
apps/dashboard/
├── src/
│   ├── app/                 # Next.js 13+ App Router
│   ├── components/          # React components
│   ├── lib/                # Utilities and configurations
│   ├── services/           # API services
│   ├── store/              # State management
│   ├── styles/             # Global styles
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Helper functions
├── scripts/                # Development scripts
│   ├── dev-setup.js        # Interactive setup
│   └── dev-monitor.js      # Health monitoring
├── public/                 # Static assets
├── .env.example            # Environment template
├── dev.config.js           # Development configuration
├── next.config.js          # Next.js configuration
├── tailwind.config.js      # Tailwind CSS configuration
└── tsconfig.json          # TypeScript configuration
```

## Development Tools

### 1. Health Monitoring

```bash
npm run dev:monitor
```

Monitors:
- Next.js development server health
- Task Master CLI accessibility
- TypeScript compilation status
- Task Master data file changes

### 2. Interactive Setup

```bash
npm run dev:setup
```

Performs:
- Prerequisites check
- Environment setup
- Task Master validation
- Development tools configuration

## Integration Points

### Task Master CLI Integration

The dashboard integrates with Task Master CLI through:

1. **File System**: Direct access to `.taskmaster/` directory
2. **CLI Commands**: Wrapper scripts for common operations
3. **Real-time Updates**: File watching for task changes

### API Routes

Future API routes will be available at:
- `/api/tasks` - Task management
- `/api/projects` - Project operations
- `/api/analytics` - Analytics data

## Troubleshooting

### Common Issues

1. **Port 3001 already in use**
   ```bash
   # Find and kill process
   lsof -ti:3001 | xargs kill -9
   ```

2. **TypeScript errors**
   ```bash
   # Check for issues
   npm run type-check
   
   # Fix and re-check
   npm run type-check:watch
   ```

3. **Task Master CLI not found**
   ```bash
   # Install globally
   npm install -g task-master-ai
   
   # Or use npx
   npx task-master-ai --version
   ```

4. **Environment variables not loading**
   - Ensure `.env.local` exists
   - Check parent project `.env` for API keys
   - Restart development server after changes

### Debug Mode

Start with debugging enabled:
```bash
npm run dev:debug
```

Then attach debugger in VS Code or Chrome DevTools.

## Performance Optimization

### Development Speed

- Use `npm run dev:turbo` for faster builds (experimental)
- Enable webpack cache in `dev.config.js`
- Use `npm run type-check:watch` in separate terminal

### Production Builds

```bash
# Analyze bundle size
npm run build:analyze

# Test production build locally
npm run build && npm run start
```

## Contributing

1. **Code Style**: Prettier + ESLint configuration is enforced
2. **Type Safety**: All code must pass TypeScript checks
3. **Testing**: Run `npm run validate` before commits
4. **Task Master**: Use Task Master workflow for feature development

## Useful Commands

```bash
# Quick health check
curl http://localhost:3001/api/health

# View Next.js build info
npm run build -- --debug

# Clear all caches
npm run clean:all && npm install

# Check for outdated packages
npm outdated
```