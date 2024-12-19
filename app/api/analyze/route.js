import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

function analyzeBrandMentions(text, brandsToTrack = []) {
  console.log('Analyzing brands:', brandsToTrack);
  
  // Ensure brandsToTrack is an array
  if (!Array.isArray(brandsToTrack)) {
    console.error('brandsToTrack is not an array:', brandsToTrack);
    brandsToTrack = [];
  }
  
  const results = [];
  
  for (const brand of brandsToTrack) {
    const mentions = [];
    // Make brand matching case-insensitive
    const regex = new RegExp(`\\b${brand}\\b`, 'gi');
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      const position = match.index;
      const totalLength = text.length;
      const positionScore = 1 - (position / totalLength) * 0.8;
      
      mentions.push({
        position,
        positionScore
      });
    }
    
    results.push({
      name: brand,  // Keep original case from setup
      mentioned: mentions.length > 0,
      count: mentions.length,
      positionScore: mentions.length > 0 
        ? mentions.reduce((sum, m) => sum + m.positionScore, 0) / mentions.length 
        : 0,
      positions: mentions.map(m => m.position)
    });
  }
  
  return results;
}

export async function POST(request) {
  try {
    const { query, brands } = await request.json();
    
    if (!Array.isArray(brands)) {
      throw new Error('brands must be an array');
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: query }],
      temperature: 0.7,
      max_tokens: 500
    });

    const analysis = response.choices[0].message.content;
    
    const brandMentions = analyzeBrandMentions(analysis, brands);

    return NextResponse.json({
      response: analysis,
      brandMentions
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 