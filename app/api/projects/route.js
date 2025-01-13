import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// Log that this file is being loaded
console.log('Loading projects route handler...');

// Create the pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// GET all projects
export async function GET() {
  console.log('GET /api/projects called');
  
  try {
    // Test the connection first
    const testResult = await pool.query('SELECT NOW()');
    console.log('Database connection test successful:', testResult.rows[0]);
    
    // Only select fields needed for navigation
    const { rows } = await pool.query(`
      SELECT id, name, brand 
      FROM projects 
      ORDER BY name ASC`
    );
    console.log('Projects query successful, row count:', rows.length);
    
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Database error:', error);
    
    return NextResponse.json({
      error: 'Database error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// POST new project
export async function POST(req) {
  try {
    const data = await req.json();
    
    const result = await pool.query(
      `INSERT INTO projects (id, name, brand, competitors, brands)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.id || Date.now().toString(),
        data.name,
        data.brand,
        JSON.stringify(data.competitors || []),
        JSON.stringify(data.brands || [])
      ]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('POST /api/projects error:', error);
    return NextResponse.json({
      error: 'Failed to create project',
      message: error.message
    }, { status: 500 });
  }
}

// PUT to update project
export async function PUT(req) {
  try {
    const data = await req.json();
    console.log('Updating project:', data);

    const result = await pool.query(`
      UPDATE projects 
      SET name = $2, 
          brand = $3, 
          competitors = $4,
          brands = $5,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [
      data.id,
      data.name,
      data.brand,
      JSON.stringify(data.competitors),
      JSON.stringify(data.brands)
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to update project:', error);
    return NextResponse.json(
      { error: 'Failed to update project', details: error.message },
      { status: 500 }
    );
  }
}