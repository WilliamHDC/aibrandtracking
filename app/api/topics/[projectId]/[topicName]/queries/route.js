import { NextResponse } from 'next/server';
import { db } from '../../../../../../lib/db';
import { topics } from '../../../../../../lib/schema';

// POST to add new queries to a topic
export async function POST(req, { params }) {
  try {
    const { projectId, topicName } = params;
    const { queries: newQueries } = await req.json();
    
    // First get existing queries
    const topic = await db.select()
      .from(topics)
      .where({ 
        projectId: projectId,
        name: topicName 
      })
      .first();
    
    // Combine existing and new queries
    const updatedQueries = [...(topic.queries || []), ...newQueries];
    
    // Update the topic with new queries
    const updatedTopic = await db.update(topics)
      .set({ queries: updatedQueries })
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