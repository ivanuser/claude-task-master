#!/usr/bin/env tsx

import { testDatabaseConnection } from '../src/lib/database';
import { testRedisConnection as testRedis } from '../src/lib/redis';

async function main() {
    console.log('🔍 Testing database connections...\n');

    // Test PostgreSQL connection
    console.log('Testing PostgreSQL connection...');
    try {
        const dbResult = await testDatabaseConnection();
        console.log('✅ PostgreSQL:', JSON.stringify(dbResult, null, 2));
    } catch (error) {
        console.error('❌ PostgreSQL failed:', error);
    }

    // Test Redis connection
    console.log('\nTesting Redis connection...');
    try {
        const redisResult = await testRedis();
        console.log('✅ Redis:', JSON.stringify(redisResult, null, 2));
    } catch (error) {
        console.error('❌ Redis failed:', error);
    }

    console.log('\n🎉 Connection tests completed!');
    process.exit(0);
}

main().catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});