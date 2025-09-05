-- DevAtlas Database Initialization
-- Created by Balaji Koneti

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create database if it doesn't exist (handled by POSTGRES_DB)
-- The database 'devatlas' will be created automatically by PostgreSQL

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE devatlas TO postgres;
