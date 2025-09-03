import { PrismaClient } from '../../generated/prisma';

// Extend the global namespace to include prisma
declare global {
	var __prisma: PrismaClient | undefined;
}

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit during hot reloads
export const prisma = globalThis.__prisma ?? new PrismaClient({
	log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
	datasources: {
		db: {
			url: process.env.DATABASE_URL
		}
	}
});

if (process.env.NODE_ENV !== 'production') {
	globalThis.__prisma = prisma;
}

// Database connection utilities
export async function connectDatabase() {
	try {
		await prisma.$connect();
		console.log('✅ Database connected successfully');
		return true;
	} catch (error) {
		console.error('❌ Database connection failed:', error);
		throw error;
	}
}

export async function disconnectDatabase() {
	try {
		await prisma.$disconnect();
		console.log('✅ Database disconnected successfully');
		return true;
	} catch (error) {
		console.error('❌ Database disconnection failed:', error);
		throw error;
	}
}

export async function testDatabaseConnection() {
	try {
		// Test basic connection
		await prisma.$queryRaw`SELECT 1 as test`;
		
		// Get database info
		const result = await prisma.$queryRaw`
			SELECT 
				current_database() as database_name,
				current_user as user_name,
				version() as version
		` as Array<{
			database_name: string;
			user_name: string;
			version: string;
		}>;
		
		console.log('✅ Database test successful:', result[0]);
		return {
			connected: true,
			info: result[0]
		};
	} catch (error) {
		console.error('❌ Database test failed:', error);
		return {
			connected: false,
			error: error instanceof Error ? error.message : String(error)
		};
	}
}

// Health check for the database
export async function getDatabaseHealth() {
	try {
		const startTime = Date.now();
		
		// Test query execution time
		await prisma.$queryRaw`SELECT 1 as health_check`;
		
		const responseTime = Date.now() - startTime;
		
		// Get connection info
		const connectionInfo = await prisma.$queryRaw`
			SELECT 
				count(*) as active_connections
			FROM pg_stat_activity 
			WHERE state = 'active'
		` as Array<{ active_connections: bigint }>;
		
		return {
			status: 'healthy',
			responseTime,
			activeConnections: Number(connectionInfo[0].active_connections),
			timestamp: new Date().toISOString()
		};
	} catch (error) {
		return {
			status: 'unhealthy',
			error: error instanceof Error ? error.message : String(error),
			timestamp: new Date().toISOString()
		};
	}
}

// Database configuration validation
export function validateDatabaseConfig() {
	const requiredEnvVars = [
		'DATABASE_URL',
		'POSTGRES_HOST',
		'POSTGRES_PORT', 
		'POSTGRES_DB',
		'POSTGRES_USER',
		'POSTGRES_PASSWORD'
	];
	
	const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
	
	if (missingVars.length > 0) {
		throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
	}
	
	// Validate DATABASE_URL format
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl?.startsWith('postgresql://')) {
		throw new Error('DATABASE_URL must be a valid PostgreSQL connection string');
	}
	
	return {
		valid: true,
		config: {
			host: process.env.POSTGRES_HOST,
			port: parseInt(process.env.POSTGRES_PORT!),
			database: process.env.POSTGRES_DB,
			user: process.env.POSTGRES_USER,
			poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10'),
			timeout: parseInt(process.env.DATABASE_TIMEOUT || '10000')
		}
	};
}

// Export the prisma client as default
export default prisma;