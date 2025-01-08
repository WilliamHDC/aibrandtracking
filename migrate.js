require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function migrate() {
  console.log('Starting migration...');
  
  const sql = neon(DATABASE_URL);

  try {
    // Drop existing tables if they exist
    console.log('Dropping existing tables...');
    await sql`DROP TABLE IF EXISTS topics CASCADE`;
    await sql`DROP TABLE IF EXISTS projects CASCADE`;
    
    // Create projects table
    console.log('Creating projects table...');
    await sql`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        brand TEXT NOT NULL,
        competitors JSONB DEFAULT '[]',
        brands JSONB DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('Created projects table');

    // Create topics table
    console.log('Creating topics table...');
    await sql`
      CREATE TABLE IF NOT EXISTS topics (
        id SERIAL PRIMARY KEY,
        project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        queries JSONB DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('Created topics table');

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

migrate().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});