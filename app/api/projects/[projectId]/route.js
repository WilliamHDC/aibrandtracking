import { NextResponse } from 'next/server';
import { db, query, pool } from '../../../../lib/db.js';
import { projects, topics, analysisResults } from '../../../../lib/schema.js';
import { eq } from 'drizzle-orm';

export async function GET(request, { params }) {
  try {
    const { projectId } = params;
    const result = await db.select().from(projects).where(eq(projects.id, projectId));
    
    if (!result.length) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Failed to fetch project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const { projectId } = params;
    console.log('Starting delete with projectId:', projectId);

    // First delete analysis results
    console.log('1. Attempting to delete analysis results');
    await db.delete(analysisResults)
      .where(eq(analysisResults.projectId, projectId));

    // Then delete topics
    console.log('2. Attempting to delete topics');
    await db.delete(topics)
      .where(eq(topics.projectId, projectId));

    // Finally delete the project
    console.log('3. Attempting to delete project');
    await db.delete(projects)
      .where(eq(projects.id, projectId));

    console.log('4. All deletions successful');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', {
      message: error.message,
      stack: error.stack,
      params: params
    });
    
    return NextResponse.json(
      { error: 'Failed to delete project', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { projectId } = params;
    const data = await request.json();
    
    const result = await db
      .update(projects)
      .set({
        name: data.name,
        description: data.description,
        brand: data.brand,
        competitors: data.competitors,
        brands: data.brands,
        updatedAt: new Date()
      })
      .where(eq(projects.id, projectId))
      .returning();

    if (!result.length) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Failed to update project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}