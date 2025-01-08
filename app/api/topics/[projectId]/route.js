import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// GET all topics for a project
export async function GET(req, { params }) {
  try {
    const { projectId } = params;
    console.log('Fetching topics for project:', projectId);

    const { rows } = await pool.query(`
      SELECT * FROM topics 
      WHERE project_id = $1 
      ORDER BY created_at ASC
    `, [projectId]);

    // Convert to the expected format
    const topicsWithQueries = {};
    rows.forEach(topic => {
      topicsWithQueries[topic.name] = Array.isArray(topic.queries) ? topic.queries : [];
    });
    
    return NextResponse.json(topicsWithQueries);
  } catch (error) {
    console.error('Failed to fetch topics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch topics', details: error.message },
      { status: 500 }
    );
  }
}

// POST new topic
export async function POST(req, { params }) {
  try {
    const { projectId } = params;
    const { name, queries = [] } = await req.json();
    
    // Validate input
    if (!name) {
      return NextResponse.json(
        { error: 'Topic name is required' },
        { status: 400 }
      );
    }

    const { rows } = await pool.query(`
      INSERT INTO topics (project_id, name, queries)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [
      projectId,
      name,
      JSON.stringify(queries)
    ]);

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Failed to create topic:', error);
    
    // Handle unique constraint violations
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A topic with this name already exists for this project' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create topic', details: error.message },
      { status: 500 }
    );
  }
}

// PUT to update topic
export async function PUT(req, { params }) {
  try {
    const { projectId } = params;
    const { name, queries } = await req.json();

    const { rows } = await pool.query(`
      UPDATE topics 
      SET queries = $3,
          updated_at = CURRENT_TIMESTAMP
      WHERE project_id = $1 AND name = $2
      RETURNING *
    `, [
      projectId,
      name,
      JSON.stringify(queries)
    ]);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Failed to update topic:', error);
    return NextResponse.json(
      { error: 'Failed to update topic', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE topic
export async function DELETE(req, { params }) {
  try {
    const { projectId } = params;
    const { name } = await req.json();

    const { rows } = await pool.query(`
      DELETE FROM topics 
      WHERE project_id = $1 AND name = $2
      RETURNING *
    `, [projectId, name]);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete topic:', error);
    return NextResponse.json(
      { error: 'Failed to delete topic', details: error.message },
      { status: 500 }
    );
  }
}