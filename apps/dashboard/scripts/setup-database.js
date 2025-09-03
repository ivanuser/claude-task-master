#!/usr/bin/env node

/**
 * Database Setup Script for Task Master Dashboard
 * 
 * This script helps setup the PostgreSQL database and Redis for development.
 * It includes validation, connection testing, and setup instructions.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI colors
const colors = {
	reset: '\x1b[0m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	magenta: '\x1b[35m',
	cyan: '\x1b[36m',
	bold: '\x1b[1m'
};

function log(message, color = 'reset') {
	console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
	console.log('\n' + '='.repeat(60));
	log(message, 'bold');
	console.log('='.repeat(60));
}

function logStep(step, message) {
	log(`${step}. ${message}`, 'cyan');
}

function logSuccess(message) {
	log(`✅ ${message}`, 'green');
}

function logError(message) {
	log(`❌ ${message}`, 'red');
}

function logWarning(message) {
	log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
	log(`ℹ️  ${message}`, 'blue');
}

// Check if command exists
function commandExists(command) {
	try {
		execSync(`which ${command}`, { stdio: 'ignore' });
		return true;
	} catch {
		return false;
	}
}

// Check if PostgreSQL is running
function isPostgreSQLRunning() {
	try {
		execSync('pg_isready -q', { stdio: 'ignore' });
		return true;
	} catch {
		return false;
	}
}

// Check if Redis is running
function isRedisRunning() {
	try {
		execSync('redis-cli ping', { stdio: 'ignore' });
		return true;
	} catch {
		return false;
	}
}

// Validate environment file
function validateEnvironment() {
	logStep(1, 'Validating environment configuration');
	
	const envPath = path.join(process.cwd(), '.env.local');
	if (!fs.existsSync(envPath)) {
		logError('Missing .env.local file');
		logInfo('Copy .env.example to .env.local and configure database settings');
		return false;
	}
	
	// Read environment variables
	const envContent = fs.readFileSync(envPath, 'utf8');
	const requiredVars = [
		'DATABASE_URL',
		'POSTGRES_HOST',
		'POSTGRES_PORT',
		'POSTGRES_DB',
		'POSTGRES_USER',
		'POSTGRES_PASSWORD',
		'REDIS_URL'
	];
	
	const missingVars = [];
	requiredVars.forEach(varName => {
		const regex = new RegExp(`^${varName}=(.+)$`, 'm');
		const match = envContent.match(regex);
		if (!match || !match[1].trim()) {
			missingVars.push(varName);
		}
	});
	
	if (missingVars.length > 0) {
		logError(`Missing or empty environment variables: ${missingVars.join(', ')}`);
		return false;
	}
	
	logSuccess('Environment configuration is valid');
	return true;
}

// Check system prerequisites  
function checkPrerequisites() {
	logStep(2, 'Checking system prerequisites');
	
	const requirements = [
		{ name: 'Node.js', command: 'node', version: '--version' },
		{ name: 'npm', command: 'npm', version: '--version' },
		{ name: 'PostgreSQL', command: 'psql', version: '--version' },
		{ name: 'Redis CLI', command: 'redis-cli', version: '--version' }
	];
	
	let allPresent = true;
	
	requirements.forEach(req => {
		if (commandExists(req.command)) {
			try {
				const version = execSync(`${req.command} ${req.version}`, { encoding: 'utf8' }).trim();
				logSuccess(`${req.name}: ${version.split('\n')[0]}`);
			} catch {
				logSuccess(`${req.name}: Available`);
			}
		} else {
			logError(`${req.name} is not installed or not in PATH`);
			allPresent = false;
		}
	});
	
	return allPresent;
}

// Check database services
function checkServices() {
	logStep(3, 'Checking database services');
	
	let servicesOk = true;
	
	// Check PostgreSQL
	if (isPostgreSQLRunning()) {
		logSuccess('PostgreSQL is running');
	} else {
		logError('PostgreSQL is not running');
		logInfo('Start PostgreSQL with: brew services start postgresql (macOS) or systemctl start postgresql (Linux)');
		servicesOk = false;
	}
	
	// Check Redis
	if (isRedisRunning()) {
		logSuccess('Redis is running');
	} else {
		logWarning('Redis is not running (optional for development)');
		logInfo('Start Redis with: brew services start redis (macOS) or systemctl start redis (Linux)');
	}
	
	return servicesOk;
}

// Test database connection
async function testDatabaseConnection() {
	logStep(4, 'Testing database connection');
	
	try {
		// Load environment variables
		require('dotenv').config({ path: '.env.local' });
		
		// Import and test database connection
		const { testDatabaseConnection, validateDatabaseConfig } = require('../src/lib/database');
		
		// Validate configuration
		validateDatabaseConfig();
		logSuccess('Database configuration is valid');
		
		// Test connection
		const result = await testDatabaseConnection();
		if (result.connected) {
			logSuccess(`Connected to database: ${result.info.database_name}`);
			logInfo(`Database version: ${result.info.version.split(' ')[0]} ${result.info.version.split(' ')[1]}`);
			logInfo(`Connected as user: ${result.info.user_name}`);
			return true;
		} else {
			logError(`Database connection failed: ${result.error}`);
			return false;
		}
	} catch (error) {
		logError(`Database test failed: ${error.message}`);
		return false;
	}
}

// Test Redis connection
async function testRedisConnection() {
	logStep(5, 'Testing Redis connection');
	
	try {
		const { testRedisConnection, validateRedisConfig } = require('../src/lib/redis');
		
		// Validate configuration
		const config = validateRedisConfig();
		logSuccess(`Redis configuration is valid (${config.config.host}:${config.config.port})`);
		
		if (!config.config.enabled) {
			logWarning('Redis caching is disabled in configuration');
			return true;
		}
		
		// Test connection
		const result = await testRedisConnection();
		if (result.connected) {
			logSuccess(`Redis connection successful, test value: ${result.testValue}`);
			return true;
		} else {
			logWarning(`Redis connection failed: ${result.error}`);
			logInfo('Redis is optional for development, you can continue without it');
			return true; // Non-blocking for development
		}
	} catch (error) {
		logWarning(`Redis test failed: ${error.message}`);
		logInfo('Redis is optional for development, you can continue without it');
		return true; // Non-blocking for development
	}
}

// Setup database schema
async function setupSchema() {
	logStep(6, 'Setting up database schema');
	
	try {
		// Check if prisma client is generated
		const clientPath = path.join(process.cwd(), 'generated/prisma');
		if (!fs.existsSync(clientPath)) {
			logInfo('Generating Prisma client...');
			execSync('npx prisma generate', { stdio: 'inherit' });
			logSuccess('Prisma client generated');
		}
		
		// Run migrations
		logInfo('Running database migrations...');
		execSync('npx prisma migrate dev --name init', { stdio: 'inherit' });
		logSuccess('Database schema created successfully');
		
		return true;
	} catch (error) {
		logError(`Schema setup failed: ${error.message}`);
		logInfo('You may need to create the database manually first');
		return false;
	}
}

// Create database if it doesn't exist
function createDatabaseIfNeeded() {
	logStep(7, 'Ensuring database exists');
	
	try {
		// Load environment variables
		require('dotenv').config({ path: '.env.local' });
		
		const dbName = process.env.POSTGRES_DB;
		const user = process.env.POSTGRES_USER;
		const host = process.env.POSTGRES_HOST;
		const port = process.env.POSTGRES_PORT;
		
		// Try to connect to the specific database
		try {
			execSync(`psql -h ${host} -p ${port} -U ${user} -d ${dbName} -c "SELECT 1;" > /dev/null 2>&1`);
			logSuccess(`Database '${dbName}' exists and is accessible`);
			return true;
		} catch {
			// Database doesn't exist, try to create it
			logInfo(`Creating database '${dbName}'...`);
			try {
				execSync(`psql -h ${host} -p ${port} -U ${user} -d postgres -c "CREATE DATABASE ${dbName};" > /dev/null 2>&1`);
				logSuccess(`Database '${dbName}' created successfully`);
				return true;
			} catch (createError) {
				logError(`Failed to create database: ${createError.message}`);
				logInfo('You may need to create the database manually:');
				logInfo(`  psql -U ${user} -c "CREATE DATABASE ${dbName};"`);
				return false;
			}
		}
	} catch (error) {
		logError(`Database creation check failed: ${error.message}`);
		return false;
	}
}

// Main setup function
async function main() {
	logHeader('Task Master Dashboard - Database Setup');
	
	console.log('This script will help you setup PostgreSQL and Redis for development.\n');
	
	let success = true;
	
	// Run all checks and setup steps
	success &= validateEnvironment();
	success &= checkPrerequisites();
	success &= checkServices();
	
	if (success) {
		success &= createDatabaseIfNeeded();
		success &= await testDatabaseConnection();
		success &= await testRedisConnection();
		
		if (success) {
			success &= await setupSchema();
		}
	}
	
	// Final status
	console.log('\n' + '='.repeat(60));
	if (success) {
		logSuccess('Database setup completed successfully!');
		console.log('\nYou can now start the development server:');
		logInfo('  npm run dev');
	} else {
		logError('Database setup encountered issues.');
		console.log('\nPlease fix the issues above and run this script again.');
	}
	console.log('='.repeat(60));
	
	process.exit(success ? 0 : 1);
}

// Handle script execution
if (require.main === module) {
	main().catch(error => {
		logError(`Setup script failed: ${error.message}`);
		process.exit(1);
	});
}

module.exports = {
	validateEnvironment,
	checkPrerequisites,
	checkServices,
	testDatabaseConnection,
	testRedisConnection
};