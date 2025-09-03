import Redis from 'ioredis';

// Create Redis client instance
let redis: Redis | null = null;

export function createRedisClient(): Redis {
	if (redis) {
		return redis;
	}

	const redisConfig = {
		host: process.env.REDIS_HOST || 'localhost',
		port: parseInt(process.env.REDIS_PORT || '6379'),
		password: process.env.REDIS_PASSWORD || undefined,
		retryDelayOnFailover: 100,
		enableReadyCheck: false,
		maxRetriesPerRequest: 3,
		lazyConnect: true,
		keepAlive: 30000,
		connectTimeout: 10000,
		commandTimeout: 5000
	};

	redis = new Redis(redisConfig);

	// Event handlers
	redis.on('connect', () => {
		console.log('✅ Redis connected successfully');
	});

	redis.on('ready', () => {
		console.log('✅ Redis ready for commands');
	});

	redis.on('error', (error) => {
		console.error('❌ Redis connection error:', error);
	});

	redis.on('close', () => {
		console.log('⚠️  Redis connection closed');
	});

	redis.on('reconnecting', (ms: number) => {
		console.log(`🔄 Redis reconnecting in ${ms}ms...`);
	});

	return redis;
}

export function getRedisClient(): Redis {
	if (!redis) {
		redis = createRedisClient();
	}
	return redis;
}

// Cache utilities
export class CacheService {
	private redis: Redis;
	private defaultTTL: number;

	constructor() {
		this.redis = getRedisClient();
		this.defaultTTL = parseInt(process.env.CACHE_TTL || '3600'); // 1 hour default
	}

	async get<T = any>(key: string): Promise<T | null> {
		try {
			const value = await this.redis.get(key);
			return value ? JSON.parse(value) : null;
		} catch (error) {
			console.error(`Cache get error for key ${key}:`, error);
			return null;
		}
	}

	async set(key: string, value: any, ttl?: number): Promise<boolean> {
		try {
			const serializedValue = JSON.stringify(value);
			const expiration = ttl || this.defaultTTL;
			
			const result = await this.redis.setex(key, expiration, serializedValue);
			return result === 'OK';
		} catch (error) {
			console.error(`Cache set error for key ${key}:`, error);
			return false;
		}
	}

	async del(key: string): Promise<boolean> {
		try {
			const result = await this.redis.del(key);
			return result === 1;
		} catch (error) {
			console.error(`Cache delete error for key ${key}:`, error);
			return false;
		}
	}

	async exists(key: string): Promise<boolean> {
		try {
			const result = await this.redis.exists(key);
			return result === 1;
		} catch (error) {
			console.error(`Cache exists error for key ${key}:`, error);
			return false;
		}
	}

	async flush(): Promise<boolean> {
		try {
			const result = await this.redis.flushdb();
			return result === 'OK';
		} catch (error) {
			console.error('Cache flush error:', error);
			return false;
		}
	}

	async keys(pattern = '*'): Promise<string[]> {
		try {
			return await this.redis.keys(pattern);
		} catch (error) {
			console.error(`Cache keys error for pattern ${pattern}:`, error);
			return [];
		}
	}

	async mget(keys: string[]): Promise<Array<any | null>> {
		try {
			const values = await this.redis.mget(...keys);
			return values.map(value => value ? JSON.parse(value) : null);
		} catch (error) {
			console.error('Cache mget error:', error);
			return new Array(keys.length).fill(null);
		}
	}

	async mset(keyValuePairs: Record<string, any>, ttl?: number): Promise<boolean> {
		try {
			const pipeline = this.redis.pipeline();
			const expiration = ttl || this.defaultTTL;

			for (const [key, value] of Object.entries(keyValuePairs)) {
				pipeline.setex(key, expiration, JSON.stringify(value));
			}

			const results = await pipeline.exec();
			return results?.every(([err, result]) => !err && result === 'OK') || false;
		} catch (error) {
			console.error('Cache mset error:', error);
			return false;
		}
	}

	// Increment/Decrement operations
	async incr(key: string): Promise<number> {
		try {
			return await this.redis.incr(key);
		} catch (error) {
			console.error(`Cache incr error for key ${key}:`, error);
			return 0;
		}
	}

	async decr(key: string): Promise<number> {
		try {
			return await this.redis.decr(key);
		} catch (error) {
			console.error(`Cache decr error for key ${key}:`, error);
			return 0;
		}
	}

	// List operations
	async lpush(key: string, ...values: any[]): Promise<number> {
		try {
			const serializedValues = values.map(v => JSON.stringify(v));
			return await this.redis.lpush(key, ...serializedValues);
		} catch (error) {
			console.error(`Cache lpush error for key ${key}:`, error);
			return 0;
		}
	}

	async lrange(key: string, start = 0, stop = -1): Promise<any[]> {
		try {
			const values = await this.redis.lrange(key, start, stop);
			return values.map(value => JSON.parse(value));
		} catch (error) {
			console.error(`Cache lrange error for key ${key}:`, error);
			return [];
		}
	}
}

// Health check for Redis
export async function getRedisHealth() {
	try {
		const redis = getRedisClient();
		const startTime = Date.now();
		
		// Test ping
		const pong = await redis.ping();
		const responseTime = Date.now() - startTime;
		
		// Get Redis info
		const info = await redis.info('server');
		const redisVersion = info.match(/redis_version:(.+)/)?.[1]?.trim();
		
		return {
			status: 'healthy',
			responseTime,
			version: redisVersion,
			ping: pong,
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

// Test Redis connection
export async function testRedisConnection() {
	try {
		const redis = getRedisClient();
		await redis.connect();
		
		// Test basic operations
		await redis.set('test_key', 'test_value');
		const value = await redis.get('test_key');
		await redis.del('test_key');
		
		console.log('✅ Redis test successful, value:', value);
		return {
			connected: true,
			testValue: value
		};
	} catch (error) {
		console.error('❌ Redis test failed:', error);
		return {
			connected: false,
			error: error instanceof Error ? error.message : String(error)
		};
	}
}

// Validate Redis configuration
export function validateRedisConfig() {
	const config = {
		host: process.env.REDIS_HOST || 'localhost',
		port: parseInt(process.env.REDIS_PORT || '6379'),
		password: process.env.REDIS_PASSWORD,
		enabled: process.env.ENABLE_CACHE === 'true'
	};

	if (isNaN(config.port) || config.port <= 0 || config.port > 65535) {
		throw new Error('REDIS_PORT must be a valid port number');
	}

	return {
		valid: true,
		config
	};
}

// Export singleton cache service instance
export const cacheService = new CacheService();

// Cleanup function
export async function disconnectRedis() {
	if (redis) {
		try {
			await redis.quit();
			redis = null;
			console.log('✅ Redis disconnected successfully');
		} catch (error) {
			console.error('❌ Redis disconnection failed:', error);
			throw error;
		}
	}
}