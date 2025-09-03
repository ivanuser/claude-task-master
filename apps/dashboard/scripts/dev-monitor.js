#!/usr/bin/env node

/**
 * Development Monitor for Task Master Dashboard
 * Monitors file changes and provides development insights
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DevMonitor {
	constructor() {
		this.projectRoot = path.join(__dirname, '..');
		this.monorepoRoot = path.join(__dirname, '../../..');
		this.isRunning = false;
	}

	async start() {
		console.log('🔍 Task Master Dashboard - Development Monitor');
		console.log('Monitoring project health and Task Master integration...\n');

		this.isRunning = true;
		await this.runMonitoringLoop();
	}

	async runMonitoringLoop() {
		while (this.isRunning) {
			try {
				await this.checkHealth();
				await this.sleep(30000); // Check every 30 seconds
			} catch (error) {
				console.error('❌ Monitor error:', error.message);
				await this.sleep(10000); // Wait 10 seconds before retrying
			}
		}
	}

	async checkHealth() {
		const timestamp = new Date().toLocaleTimeString();
		const checks = [];

		// Check Next.js dev server
		try {
			const response = await this.checkUrl('http://localhost:3001');
			checks.push(`✅ Next.js server (${response}ms)`);
		} catch (error) {
			checks.push('❌ Next.js server not responding');
		}

		// Check Task Master CLI accessibility
		try {
			execSync('task-master --version', { 
				cwd: this.monorepoRoot, 
				stdio: 'ignore',
				timeout: 5000
			});
			checks.push('✅ Task Master CLI');
		} catch (error) {
			checks.push('❌ Task Master CLI not accessible');
		}

		// Check for TypeScript errors
		try {
			execSync('npm run type-check', { 
				cwd: this.projectRoot, 
				stdio: 'ignore',
				timeout: 10000
			});
			checks.push('✅ TypeScript validation');
		} catch (error) {
			checks.push('❌ TypeScript errors detected');
		}

		// Check Task Master tasks file
		const tasksPath = path.join(this.monorepoRoot, '.taskmaster', 'tasks', 'tasks.json');
		if (fs.existsSync(tasksPath)) {
			const stats = fs.statSync(tasksPath);
			const lastModified = this.timeSince(stats.mtime);
			checks.push(`📝 Tasks file (updated ${lastModified})`);
		} else {
			checks.push('❌ Tasks file not found');
		}

		// Print status
		console.clear();
		console.log('🔍 Task Master Dashboard - Development Monitor\n');
		console.log(`⏰ Last check: ${timestamp}`);
		console.log(`📊 Status:`);
		checks.forEach(check => console.log(`   ${check}`));
		
		// Additional info
		this.printAdditionalInfo();
	}

	async checkUrl(url, timeout = 5000) {
		const startTime = Date.now();
		
		return new Promise((resolve, reject) => {
			const http = require('http');
			const req = http.get(url, { timeout }, (res) => {
				const responseTime = Date.now() - startTime;
				resolve(responseTime);
				req.destroy();
			});

			req.on('error', reject);
			req.on('timeout', () => {
				req.destroy();
				reject(new Error('Request timeout'));
			});
		});
	}

	timeSince(date) {
		const seconds = Math.floor((new Date() - date) / 1000);
		
		let interval = Math.floor(seconds / 31536000);
		if (interval > 1) return interval + " years ago";
		
		interval = Math.floor(seconds / 2592000);
		if (interval > 1) return interval + " months ago";
		
		interval = Math.floor(seconds / 86400);
		if (interval > 1) return interval + " days ago";
		
		interval = Math.floor(seconds / 3600);
		if (interval > 1) return interval + " hours ago";
		
		interval = Math.floor(seconds / 60);
		if (interval > 1) return interval + " minutes ago";
		
		return Math.floor(seconds) + " seconds ago";
	}

	printAdditionalInfo() {
		console.log('\n📋 Quick Commands:');
		console.log('   Ctrl+C - Stop monitor');
		console.log('   npm run taskmaster:status - View tasks');
		console.log('   npm run taskmaster:next - Get next task');
		console.log('\n💡 Dashboard URL: http://localhost:3001');
	}

	sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	stop() {
		this.isRunning = false;
		console.log('\n👋 Development monitor stopped');
	}
}

// Handle graceful shutdown
process.on('SIGINT', () => {
	console.log('\n🛑 Shutting down monitor...');
	process.exit(0);
});

process.on('SIGTERM', () => {
	console.log('\n🛑 Shutting down monitor...');
	process.exit(0);
});

// Start monitor if called directly
if (require.main === module) {
	const monitor = new DevMonitor();
	monitor.start().catch(console.error);
}

module.exports = DevMonitor;