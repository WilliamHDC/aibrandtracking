import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { query, brands } = await request.json();
    
    console.log('Processing query:', query);
    console.log('Checking brands:', brands);
    console.log('OpenAI API Key exists:', !!process.env.OPENAI_API_KEY);

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }

    try {
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
        timeout: 55000,
      });

      const response = completion.choices[0].message.content;
      
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
      
    } catch (openaiError) {
      console.error('OpenAI API Error:', openaiError);
      return NextResponse.json(
        { error: `OpenAI API Error: ${openaiError.message}` },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Request processing error:', error);
    return NextResponse.json(
      { error: `Request processing error: ${error.message}` },
      { status: 500 }
    );
  }
} 