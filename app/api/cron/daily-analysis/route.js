import { NextResponse } from 'next/server';

async function runAnalysisForProject(project) {
  try {
    // Get project topics
    const topicsRes = await fetch(`${process.env.VERCEL_URL}/api/topics/${project.id}`);
    const topics = await topicsRes.json();
    
    const results = {};
    
    // Run analysis for each topic and query
    for (const topic of Object.entries(topics)) {
      const [topicName, queries] = topic;
      const topicId = topicName.toLowerCase().replace(/\s+/g, '-');
      results[topicId] = { queries: [] };
      
      for (const query of Array.isArray(queries) ? queries : [queries]) {
        const response = await fetch(`${process.env.VERCEL_URL}/api/analyze/${project.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            query,
            brands: [project.brand, ...(project.competitors || [])]
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          results[topicId].queries.push({
            query,
            response: data.response,
            brandMentions: data.brandMentions
          });
        }
      }
    }
    
    // Save results
    await fetch(`${process.env.VERCEL_URL}/api/analysis/${project.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        results,
        timestamp: new Date().toISOString()
      }),
    });
    
    return { success: true, projectId: project.id };
  } catch (error) {
    console.error(`Failed to run analysis for project ${project.id}:`, error);
    return { success: false, projectId: project.id, error: error.message };
  }
}

export async function GET(req) {
  try {
    // Add this log
    console.log('CRON_SECRET:', process.env.CRON_SECRET);
    
    // Verify cron secret to prevent unauthorized access
    const authHeader = req.headers.get('authorization');
    console.log('Received auth header:', authHeader);  // Add this log too
    
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Get all projects through API
    const projectsRes = await fetch(`${process.env.VERCEL_URL}/api/projects`);
    console.log('Projects response:', await projectsRes.clone().json());
    const projects = await projectsRes.json();
    
    // Run analysis for all projects (removed active filter)
    const results = await Promise.all(
      projects.map(project => runAnalysisForProject(project))
    );

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Daily analysis failed:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}