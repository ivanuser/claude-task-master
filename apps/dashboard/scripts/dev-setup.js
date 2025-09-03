#!/usr/bin/env node

/**
 * Development Setup Script for Task Master Dashboard
 * This script helps set up the development environment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
	reset: '\x1b[0m',
	bright: '\x1b[1m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	cyan: '\x1b[36m'
};

const log = {
	info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
	success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
	warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
	error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
	header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}`)
};

class DevSetup {
	constructor() {
		this.projectRoot = path.join(__dirname, '..');
		this.monorepoRoot = path.join(__dirname, '../../..');
	}

	async run() {
		log.header('🚀 Task Master Dashboard - Development Setup');
		
		try {
			await this.checkPrerequisites();
			await this.setupEnvironment();
			await this.validateTaskMaster();
			await this.setupDevelopmentTools();
			await this.printSummary();
		} catch (error) {
			log.error(`Setup failed: ${error.message}`);
			process.exit(1);
		}
	}

	async checkPrerequisites() {
		log.header('Checking Prerequisites');

		// Check Node.js version
		const nodeVersion = process.version;
		log.info(`Node.js version: ${nodeVersion}`);
		
		const majorVersion = parseInt(nodeVersion.slice(1));
		if (majorVersion < 18) {
			log.warning('Node.js 18+ is recommended for optimal performance');
		} else {
			log.success('Node.js version is compatible');
		}

		// Check npm
		try {
			const npmVersion = execSync('npm --version', { encoding: 'utf-8' }).trim();
			log.success(`npm version: ${npmVersion}`);
		} catch (error) {
			log.error('npm not found');
			throw new Error('npm is required');
		}

		// Check if we're in a git repository
		try {
			execSync('git rev-parse --git-dir', { cwd: this.monorepoRoot, stdio: 'ignore' });
			log.success('Git repository detected');
		} catch (error) {
			log.warning('Not in a git repository');
		}
	}

	async setupEnvironment() {
		log.header('Setting up Environment');

		const envExamplePath = path.join(this.projectRoot, '.env.example');
		const envLocalPath = path.join(this.projectRoot, '.env.local');

		if (!fs.existsSync(envExamplePath)) {
			log.error('.env.example not found');
			throw new Error('Environment example file missing');
		}

		if (!fs.existsSync(envLocalPath)) {
			fs.copyFileSync(envExamplePath, envLocalPath);
			log.success('Created .env.local from .env.example');
			log.info('Please update .env.local with your specific configuration');
		} else {
			log.info('.env.local already exists');
		}

		// Check for parent project .env
		const parentEnvPath = path.join(this.monorepoRoot, '.env');
		if (fs.existsSync(parentEnvPath)) {
			log.success('Found parent project .env file');
			log.info('API keys from parent project will be inherited');
		} else {
			log.warning('Parent project .env not found');
			log.info('You may need to configure API keys manually');
		}
	}

	async validateTaskMaster() {
		log.header('Validating Task Master Integration');

		// Check for Task Master CLI
		try {
			const version = execSync('task-master --version', { 
				cwd: this.monorepoRoot, 
				encoding: 'utf-8' 
			}).trim();
			log.success(`Task Master CLI found: ${version}`);
		} catch (error) {
			log.warning('Task Master CLI not found in PATH');
			log.info('Make sure to run: npm install -g task-master-ai');
		}

		// Check for Task Master config
		const configPath = path.join(this.monorepoRoot, '.taskmaster', 'config.json');
		if (fs.existsSync(configPath)) {
			log.success('Task Master configuration found');
		} else {
			log.warning('Task Master not initialized');
			log.info('Run: task-master init in the project root');
		}

		// Check for tasks file
		const tasksPath = path.join(this.monorepoRoot, '.taskmaster', 'tasks', 'tasks.json');
		if (fs.existsSync(tasksPath)) {
			const tasks = JSON.parse(fs.readFileSync(tasksPath, 'utf-8'));
			log.success(`Found ${tasks.tasks ? tasks.tasks.length : 0} tasks`);
		} else {
			log.info('No tasks file found - this is normal for new projects');
		}
	}

	async setupDevelopmentTools() {
		log.header('Setting up Development Tools');

		// Install dependencies if needed
		const packageJsonPath = path.join(this.projectRoot, 'package.json');
		const nodeModulesPath = path.join(this.projectRoot, 'node_modules');
		
		if (!fs.existsSync(nodeModulesPath)) {
			log.info('Installing dependencies...');
			execSync('npm install', { cwd: this.projectRoot, stdio: 'inherit' });
			log.success('Dependencies installed');
		} else {
			log.info('Dependencies already installed');
		}

		// Check TypeScript configuration
		const tsconfigPath = path.join(this.projectRoot, 'tsconfig.json');
		if (fs.existsSync(tsconfigPath)) {
			log.success('TypeScript configuration found');
			try {
				execSync('npm run type-check', { cwd: this.projectRoot, stdio: 'ignore' });
				log.success('TypeScript validation passed');
			} catch (error) {
				log.warning('TypeScript validation failed - check your code');
			}
		}

		// Check Next.js configuration
		const nextConfigPath = path.join(this.projectRoot, 'next.config.js');
		if (fs.existsSync(nextConfigPath)) {
			log.success('Next.js configuration found');
		}

		// Check Tailwind CSS configuration
		const tailwindConfigPath = path.join(this.projectRoot, 'tailwind.config.js');
		if (fs.existsSync(tailwindConfigPath)) {
			log.success('Tailwind CSS configuration found');
		}
	}

	async printSummary() {
		log.header('🎉 Setup Complete!');

		console.log(`
${colors.bright}Quick Start Commands:${colors.reset}

  ${colors.cyan}npm run dev${colors.reset}              Start development server
  ${colors.cyan}npm run dev:debug${colors.reset}        Start with debugging enabled
  ${colors.cyan}npm run dev:turbo${colors.reset}        Start with Turbo mode (experimental)
  
${colors.bright}Development Tools:${colors.reset}

  ${colors.cyan}npm run lint${colors.reset}             Run ESLint
  ${colors.cyan}npm run format${colors.reset}           Format code with Prettier
  ${colors.cyan}npm run type-check${colors.reset}       Check TypeScript types
  ${colors.cyan}npm run validate${colors.reset}         Run all checks

${colors.bright}Task Master Integration:${colors.reset}

  ${colors.cyan}npm run taskmaster:status${colors.reset} View current tasks
  ${colors.cyan}npm run taskmaster:next${colors.reset}   Get next task to work on
  ${colors.cyan}npm run taskmaster:sync${colors.reset}   Sync with Task Master

${colors.bright}URLs:${colors.reset}

  ${colors.cyan}http://localhost:3001${colors.reset}     Dashboard application
  
${colors.bright}Next Steps:${colors.reset}

  1. Update .env.local with your configuration
  2. Run 'npm run dev' to start the development server
  3. Open http://localhost:3001 in your browser
`);

		if (!fs.existsSync(path.join(this.projectRoot, '.env.local'))) {
			log.warning('Remember to configure your .env.local file!');
		}
	}
}

// Run the setup if called directly
if (require.main === module) {
	const setup = new DevSetup();
	setup.run().catch((error) => {
		console.error('Setup failed:', error);
		process.exit(1);
	});
}

module.exports = DevSetup;