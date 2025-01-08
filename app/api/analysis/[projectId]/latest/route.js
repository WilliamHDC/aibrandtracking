import { NextResponse } from 'next/server';
import { query } from '../../../../../lib/db.js';

export async function GET(request, { params }) {
  try {
    const { projectId } = params;
    console.log('\n==================================');
    console.log('🚀 API CALL START:', new Date().toISOString());
    console.log('📊 Project ID:', projectId);
    console.log('1. API called with projectId:', projectId);

    // Add competitors to the query
    const analysisQuery = `
      SELECT 
        p.id as project_id,
        p.name as project_name,
        p.brand,
        p.competitors,
        ar.results,
        ar.created_at
      FROM projects p
      LEFT JOIN analysis_results ar ON ar.project_id = p.id
      WHERE p.id = $1
        AND ar.id IS NOT NULL
      ORDER BY ar.created_at DESC
      LIMIT 1;
    `;

    console.log('🔍 Executing query for project:', projectId);
    const analysisResult = await query(analysisQuery, [projectId]);
    console.log('📝 Query result:', JSON.stringify(analysisResult.rows[0], null, 2));
    console.log('Full analysis result:', JSON.stringify(analysisResult.rows[0], null, 2));
    console.log('2. Database result:', analysisResult.rows[0]);

    if (!analysisResult.rows.length) {
      console.log('⚠️ No analysis found for project:', projectId);
      return NextResponse.json({
        results: {},
        timestamp: null,
        message: 'No analysis results found'
      });
    }

    const row = analysisResult.rows[0];
    
    // Calculate visibility score for the primary brand
    let totalScore = 0;
    let totalQueries = 0;

    // Process queries and calculate score
    Object.values(row.results || {}).forEach(topicData => {
      if (!topicData.queries) return;
      
      topicData.queries.forEach(query => {
        totalQueries++;
        const brandMention = query.brandMentions?.find(m => 
          m.name.toLowerCase() === row.brand.toLowerCase()
        );
        
        if (!brandMention?.mentioned) return;

        const position = brandMention.brandPosition;
        if (position === 1) totalScore += 1.0;
        else if (position === 2) totalScore += 0.75;
        else if (position === 3) totalScore += 0.5;
        else if (position === 4) totalScore += 0.25;
        else totalScore += 0.1;
      });
    });

    const visibilityScore = totalQueries > 0 
      ? Math.round((totalScore / totalQueries * 100) * 10) / 10 
      : 0;

    const response = {
      results: row.results || {},
      timestamp: row.created_at,
      visibilityScore: visibilityScore  // Add the calculated score to the response
    };

    console.log('3. Sending response:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ API Error:', {
      projectId: params.projectId,
      message: error.message,
      code: error.code
    });
    
    return NextResponse.json({
      results: {},
      timestamp: null,
      message: `Database error: ${error.message}`
    }, { status: 200 });
  }
}