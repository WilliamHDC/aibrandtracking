import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { topics } from '@/lib/schema';

// DELETE a topic
export async function DELETE(req, { params }) {
  try {
    const { projectId, topicName } = params;
    
    await db.delete(topics)
      .where({ 
        projectId: projectId,
        name: topicName 
      });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH to update topic
export async function PATCH(req, { params }) {
  try {
    const { projectId, topicName } = params;
    const data = await req.json();
    
    const updatedTopic = await db.update(topics)
      .set(data)
      .where({ 
        projectId: projectId,
        name: topicName 
      })
      .returning();
    
    return NextResponse.json(updatedTopic[0]);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}