#!/usr/bin/env tsx

import { prisma } from '../src/lib/database';
import { getRedisHealth } from '../src/lib/redis';

async function checkDatabasePerformance() {
    console.log('🔍 Database Performance Analysis\n');

    try {
        // Test query performance
        const startTime = Date.now();
        
        // Simple performance test
        await prisma.$queryRaw`SELECT 1 as test`;
        const queryTime = Date.now() - startTime;
        
        // Get connection pool info (approximation)
        const connectionInfo = await prisma.$queryRaw`
            SELECT 
                count(*) as active_connections,
                current_database() as database_name
            FROM pg_stat_activity 
            WHERE state = 'active'
        ` as Array<{ active_connections: bigint, database_name: string }>;

        // Get database size
        const dbSize = await prisma.$queryRaw`
            SELECT pg_size_pretty(pg_database_size(current_database())) as size
        ` as Array<{ size: string }>;

        // Get table sizes
        const tableSizes = await prisma.$queryRaw`
            SELECT 
                schemaname,
                tablename,
                pg_size_pretty(pg_total_relation_size('"'||schemaname||'"."'||tablename||'"')) as size,
                pg_total_relation_size('"'||schemaname||'"."'||tablename||'"') as size_bytes
            FROM pg_tables 
            WHERE schemaname = 'public'
            ORDER BY size_bytes DESC
        ` as Array<{
            schemaname: string,
            tablename: string,
            size: string,
            size_bytes: bigint
        }>;

        console.log('📊 Database Performance Metrics:');
        console.log(`├─ Query Response Time: ${queryTime}ms`);
        console.log(`├─ Active Connections: ${connectionInfo[0].active_connections}`);
        console.log(`├─ Database Name: ${connectionInfo[0].database_name}`);
        console.log(`└─ Database Size: ${dbSize[0].size}\n`);

        console.log('📋 Table Sizes:');
        tableSizes.forEach((table, index) => {
            const isLast = index === tableSizes.length - 1;
            const prefix = isLast ? '└─' : '├─';
            console.log(`${prefix} ${table.tablename}: ${table.size}`);
        });

    } catch (error) {
        console.error('❌ Database performance check failed:', error);
    }
}

async function checkRedisPerformance() {
    console.log('\n🔍 Redis Performance Analysis\n');

    try {
        const redisHealth = await getRedisHealth();
        console.log('📊 Redis Performance Metrics:');
        console.log(`├─ Status: ${redisHealth.status}`);
        console.log(`├─ Response Time: ${redisHealth.responseTime}ms`);
        console.log(`├─ Version: ${redisHealth.version}`);
        console.log(`└─ Ping: ${redisHealth.ping}`);
    } catch (error) {
        console.error('❌ Redis performance check failed:', error);
    }
}

async function main() {
    console.log('🚀 Task Master Database Performance Check\n');
    
    await checkDatabasePerformance();
    await checkRedisPerformance();
    
    console.log('\n✅ Performance check completed!');
    
    // Close connections
    await prisma.$disconnect();
    process.exit(0);
}

main().catch((error) => {
    console.error('❌ Performance check failed:', error);
    process.exit(1);
});