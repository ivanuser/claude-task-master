/**
 * Development Configuration for Task Master Dashboard
 * This file contains development-specific settings and utilities
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Development server configuration
const DEV_CONFIG = {
	// Server settings
	server: {
		port: process.env.PORT || 3001,
		hostname: process.env.HOSTNAME || 'localhost',
		https: false, // Set to true if you need HTTPS in development
		cors: {
			origin: [
				'http://localhost:3000',
				'http://localhost:3001',
				'http://127.0.0.1:3000',
				'http://127.0.0.1:3001'
			],
			credentials: true
		}
	},

	// Hot reloading settings
	hotReload: {
		enabled: true,
		watchFiles: [
			'src/**/*.{js,jsx,ts,tsx}',
			'public/**/*',
			'.env.local',
			'next.config.js',
			'tailwind.config.js'
		],
		ignored: ['node_modules/**', '.next/**', '.git/**']
	},

	// Performance optimization for development
	optimization: {
		// Disable source maps in development for faster builds (can be enabled for debugging)
		sourceMaps: process.env.ENABLE_SOURCE_MAPS === 'true',
		// Enable webpack cache for faster rebuilds
		webpackCache: true,
		// Enable SWC minification
		swcMinify: true
	},

	// Logging configuration
	logging: {
		level: process.env.LOG_LEVEL || 'info',
		prettyPrint: true,
		timestamp: true
	},

	// Task Master integration paths
	taskMaster: {
		projectRoot: path.resolve(__dirname, '../..'),
		configPath: path.resolve(__dirname, '../../.taskmaster/config.json'),
		tasksPath: path.resolve(__dirname, '../../.taskmaster/tasks/tasks.json'),
		docsPath: path.resolve(__dirname, '../../.taskmaster/docs')
	},

	// API mocking (for development without backend)
	mockApi: {
		enabled: process.env.ENABLE_API_MOCKING === 'true',
		delay: 500, // Simulate network delay
		failureRate: 0.1 // 10% failure rate for testing error handling
	}
};

// Utility functions for development
const DevUtils = {
	/**
	 * Check if Task Master CLI is available
	 */
	checkTaskMasterCLI() {
		try {
			execSync('task-master --version', { stdio: 'pipe' });
			return true;
		} catch (error) {
			console.warn('⚠️  Task Master CLI not found. Some features may not work.');
			return false;
		}
	},

	/**
	 * Validate environment configuration
	 */
	validateEnvironment() {
		const required = ['NODE_ENV'];
		const missing = required.filter((key) => !process.env[key]);

		if (missing.length > 0) {
			console.error('❌ Missing required environment variables:', missing);
			return false;
		}

		// Check if .env.local exists and suggest creating it
		const envLocalPath = path.join(__dirname, '.env.local');
		if (!fs.existsSync(envLocalPath)) {
			console.warn(
				'💡 Consider creating .env.local from .env.example for local development'
			);
		}

		return true;
	},

	/**
	 * Setup development database (if needed)
	 */
	setupDevDatabase() {
		const dbPath = process.env.DATABASE_URL?.replace('sqlite://', '');
		if (dbPath && !fs.existsSync(dbPath)) {
			console.log('🗄️  Setting up development database...');
			// Database setup logic would go here
		}
	},

	/**
	 * Print development startup information
	 */
	printStartupInfo() {
		console.log('🚀 Task Master Dashboard - Development Mode');
		console.log(`📍 Server: http://${DEV_CONFIG.server.hostname}:${DEV_CONFIG.server.port}`);
		console.log(`🔧 Node Environment: ${process.env.NODE_ENV}`);
		console.log(`📁 Project Root: ${DEV_CONFIG.taskMaster.projectRoot}`);

		if (this.checkTaskMasterCLI()) {
			console.log('✅ Task Master CLI available');
		}

		if (process.env.NEXT_PUBLIC_DEBUG_MODE === 'true') {
			console.log('🐛 Debug mode enabled');
		}

		console.log('---');
	},

	/**
	 * Watch for Task Master file changes
	 */
	setupTaskMasterWatcher() {
		if (typeof window === 'undefined' && fs.existsSync(DEV_CONFIG.taskMaster.tasksPath)) {
			const chokidar = require('chokidar');
			const watcher = chokidar.watch([
				DEV_CONFIG.taskMaster.tasksPath,
				DEV_CONFIG.taskMaster.configPath
			]);

			watcher.on('change', (path) => {
				console.log(`📝 Task Master file changed: ${path}`);
				// Could trigger refresh of task data in the dashboard
			});

			return watcher;
		}
	}
};

// Development startup checks
if (process.env.NODE_ENV === 'development') {
	DevUtils.validateEnvironment();
	DevUtils.setupDevDatabase();
	DevUtils.printStartupInfo();
}

module.exports = {
	DEV_CONFIG,
	DevUtils
};