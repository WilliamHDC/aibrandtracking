import { NextResponse } from 'next/server';
import db from '../../../lib/db';

export async function POST(req) {
  try {
    const { projectId, name, queries = [] } = await req.json();
    console.log('Adding topic:', { projectId, name, queries });

    // Validate input
    if (!projectId || !name) {
      return NextResponse.json(
        { error: 'Project ID and topic name are required' },
        { status: 400 }
      );
    }

    // Check if project exists
    const projectCheck = await db.execute(
      'SELECT id FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const result = await db.execute(`
      INSERT INTO topics (project_id, name, queries)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [
      projectId,
      name,
      JSON.stringify(queries)
    ]);

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Failed to add topic:', error);
    
    // Handle unique constraint violations
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A topic with this name already exists for this project' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to add topic', details: error.message },
      { status: 500 }
    );
  }
}

// GET all topics (optional, if needed)
export async function GET() {
  try {
    const result = await db.execute(`
      SELECT t.*, p.name as project_name 
      FROM topics t 
      JOIN projects p ON t.project_id = p.id 
      ORDER BY t.created_at DESC
    `);
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Failed to fetch topics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch topics', details: error.message },
      { status: 500 }
    );
  }
}