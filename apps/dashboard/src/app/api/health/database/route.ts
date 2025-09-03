import { NextResponse } from 'next/server';
import { getDatabaseHealth } from '@/lib/database';
import { getRedisHealth } from '@/lib/redis';

export async function GET() {
	try {
		const [databaseHealth, redisHealth] = await Promise.all([
			getDatabaseHealth(),
			getRedisHealth().catch(() => ({
				status: 'disabled',
				message: 'Redis is not configured or not running',
				timestamp: new Date().toISOString()
			}))
		]);

		const overallStatus = databaseHealth.status === 'healthy' ? 'healthy' : 'unhealthy';

		const response = {
			status: overallStatus,
			timestamp: new Date().toISOString(),
			services: {
				database: databaseHealth,
				cache: redisHealth
			},
			environment: {
				nodeEnv: process.env.NODE_ENV,
				databaseType: process.env.DATABASE_TYPE,
				cacheEnabled: process.env.ENABLE_CACHE === 'true'
			}
		};

		const statusCode = overallStatus === 'healthy' ? 200 : 503;
		return NextResponse.json(response, { status: statusCode });
	} catch (error) {
		console.error('Health check failed:', error);
		
		return NextResponse.json({
			status: 'error',
			timestamp: new Date().toISOString(),
			error: error instanceof Error ? error.message : 'Unknown error occurred',
			services: {
				database: { status: 'error' },
				cache: { status: 'unknown' }
			}
		}, { status: 500 });
	}
}