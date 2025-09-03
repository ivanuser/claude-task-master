-- Task Master Database Initialization Script
-- This script is executed when the PostgreSQL container starts

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set up database configuration
ALTER DATABASE mydb SET timezone TO 'UTC';

-- Create indexes for performance (will be created by Prisma migrations but good to have here too)
-- Note: These will be created by Prisma, this is just for reference

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'Task Master database initialized successfully';
END $$;