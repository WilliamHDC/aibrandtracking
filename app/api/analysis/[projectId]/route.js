import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export async function POST(req, { params }) {
  try {
    const { projectId } = params;
    const data = await req.json();
    
    // Calculate aggregated data for the chart
    const brandData = {};
    Object.values(data.results || {}).forEach(topic => {
      topic.queries.forEach(query => {
        query.brandMentions.forEach(brand => {
          if (brand.mentioned) {
            brandData[brand.name] = (brandData[brand.name] || 0) + (brand.count || 1);
          }
        });
      });
    });
    
    const timestamp = new Date().toISOString();

    // Always create a new record instead of potentially overwriting
    const { rows } = await pool.query(`
      INSERT INTO analysis_results (
        id,
        project_id,
        results,
        data,
        timestamp,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `, [
      uuidv4(), // Generate a new unique ID for each analysis
      projectId,
      JSON.stringify(data.results || {}),
      JSON.stringify(brandData),
      timestamp
    ]);

    console.log('Insert successful:', rows[0]);
    
    return NextResponse.json({
      ...rows[0],
      data: brandData,
      timestamp
    });

  } catch (error) {
    console.error('Failed to save analysis results:', error);
    return NextResponse.json(
      { error: 'Failed to save analysis results' },
      { status: 500 }
    );
  }
}

export async function GET(req, { params }) {
  try {
    const { projectId } = params;
    
    // Get last 30 results for historical data
    const { rows } = await pool.query(`
      SELECT * FROM analysis_results 
      WHERE project_id = $1 
      ORDER BY created_at DESC 
      LIMIT 30
    `, [projectId]);

    if (!rows.length) {
      return NextResponse.json(null);
    }

    // Latest result for current analysis display
    const latestResult = rows[0];
    
    // Calculate brand data for latest result if it doesn't exist
    if (!latestResult.data) {
      const brandData = {};
      Object.values(latestResult.results || {}).forEach(topic => {
        topic.queries.forEach(query => {
          query.brandMentions.forEach(brand => {
            if (brand.mentioned) {
              brandData[brand.name] = (brandData[brand.name] || 0) + (brand.count || 1);
            }
          });
        });
      });
      latestResult.data = brandData;
    }

    // Process historical data for the graph
    const historicalData = rows.map(row => ({
      timestamp: row.created_at.toISOString(),
      results: row.results,
      data: row.data || {}
    })).reverse(); // Reverse to get chronological order

    return NextResponse.json({
      ...latestResult,
      timestamp: latestResult.created_at.toISOString(),
      data: latestResult.data || {},
      history: historicalData // Add historical data to response
    });

  } catch (error) {
    console.error('Failed to fetch analysis results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analysis results' },
      { status: 500 }
    );
  }
}