import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 300; // Set max duration to 300 seconds (5 minutes)
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { query, brands } = await request.json();
    
    console.log('Processing query:', query);
    console.log('Checking brands:', brands);

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that analyzes text to identify mentions of specific brands."
        },
        {
          role: "user",
          content: query
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
      timeout: 180000, // 3 minute timeout
    });

    const response = completion.choices[0].message.content;
    
    // Process brand mentions
    const brandMentions = brands.map(brand => {
      const mentioned = response.toLowerCase().includes(brand.toLowerCase());
      const count = mentioned ? 
        (response.toLowerCase().match(new RegExp(brand.toLowerCase(), 'g')) || []).length : 0;
      
      return {
        name: brand,
        mentioned,
        count,
        positions: mentioned ? 
          [...response.toLowerCase().matchAll(new RegExp(brand.toLowerCase(), 'g'))].map(m => m.index) : []
      };
    });

    return NextResponse.json({ response, brandMentions });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'An error occurred processing your request' },
      { status: 500 }
    );
  }
} 