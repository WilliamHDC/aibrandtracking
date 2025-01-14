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

      RESPONSE FORMAT:
      Return a valid JSON object where each keyword is a property and its value is an array of queries.
      Example format:
      {
        "keyword1": ["query1", "query2", "query3"],
        "keyword2": ["query1", "query2", "query3"]
      }

      For each keyword, generate 5-7 detailed, brand-neutral queries that:
      1. Address specific user problems and pain points
      2. Compare features and capabilities
      3. Ask about real-world performance and experiences
      4. Focus on specific use cases
      5. Question durability and value

      IMPORTANT RULES:
      - Generate ALL queries in the specified language
      - DO NOT include any brand names
      - DO NOT mention competitors
      - Focus on generic, problem-focused searches
      - Use natural language patterns for the specified language
      - ENSURE response is valid JSON format
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a multilingual search expert who generates valid JSON responses. Always ensure your response is properly formatted JSON.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7  // Reduced for more consistent formatting
    });

    const responseText = completion.choices[0].message.content;
    console.log('OpenAI raw response:', responseText);
    
    // Try to clean the response before parsing
    const cleanedResponse = responseText.trim();
    
    try {
      const queries = JSON.parse(cleanedResponse);
      return NextResponse.json(queries);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Raw Response:', cleanedResponse);
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate queries' },
      { status: 500 }
    );
  }
}