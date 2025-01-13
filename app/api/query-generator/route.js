import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req) {
  try {
    const body = await req.json();
    const { brand, competitors, keywords, language } = body;

    if (!brand || !competitors || !keywords || !language) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const prompt = `
      Generate search queries that will help monitor market presence for ${brand} and its competitors (${competitors.join(', ')}).
      The goal is to find where these brands appear naturally in search results, so DO NOT include any brand names in the queries themselves.

      Keywords: ${keywords.join(', ')}
      Language: Generate all queries in ${language === 'en' ? 'English' : 
                language === 'sv' ? 'Swedish' :
                language === 'no' ? 'Norwegian' :
                language === 'da' ? 'Danish' :
                language === 'fi' ? 'Finnish' : 'English'}

      For each keyword, generate 8-10 detailed, brand-neutral queries that:
      1. Address specific user problems and pain points
      2. Compare features and capabilities
      3. Ask about real-world performance and experiences
      4. Seek technical specifications and details
      5. Focus on specific use cases and scenarios
      6. Question durability and reliability
      7. Explore value for money

      IMPORTANT RULES:
      - Generate ALL queries in the specified language
      - DO NOT include any brand names in the queries
      - DO NOT mention competitors in the queries
      - Focus on generic, problem-focused searches
      - Use industry-standard terminology
      - Think about what users would search before knowing specific brands
      - Use natural language patterns common in the specified language

      Format the response as a JSON object where each keyword is a key and its value is an array of brand-neutral queries.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a multilingual search behavior expert. Generate brand-neutral queries in ${language === 'en' ? 'English' : 
            language === 'sv' ? 'Swedish' :
            language === 'no' ? 'Norwegian' :
            language === 'da' ? 'Danish' :
            language === 'fi' ? 'Finnish' : 'English'} that will help discover where brands appear naturally in search results.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.8
    });

    const responseText = completion.choices[0].message.content;
    console.log('OpenAI raw response:', responseText);
    
    const queries = JSON.parse(responseText);
    return NextResponse.json(queries);

  } catch (error) {
    console.error('Detailed error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate queries' },
      { status: 500 }
    );
  }
}