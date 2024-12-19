import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 60; // Set max duration to 60 seconds (Vercel hobby plan limit)
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
      timeout: 55000, // 55 second timeout (to ensure we stay within Vercel's 60s limit)
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