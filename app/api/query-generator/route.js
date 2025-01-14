import OpenAI from 'openai';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 120000,
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

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 50000);
    });

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
    `;

    const completion = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a search query generator. You MUST respond with ONLY valid JSON, no additional text or explanations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 2000,
      }),
      timeoutPromise
    ]);

    const responseText = completion.choices[0].message.content;
    
    const cleanedResponse = responseText.trim();
    if (!cleanedResponse.startsWith('{')) {
      console.error('Invalid response format:', cleanedResponse);
      return NextResponse.json(
        { error: 'Received invalid response format from AI' },
        { status: 500 }
      );
    }

    try {
      const queries = JSON.parse(cleanedResponse);
      if (typeof queries !== 'object' || queries === null) {
        throw new Error('Response is not an object');
      }
      return NextResponse.json(queries);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Raw Response:', cleanedResponse);
      return NextResponse.json(
        { error: 'Failed to parse AI response into valid JSON' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('API Error:', error);
    
    if (error.message === 'Request timeout') {
      return NextResponse.json(
        { error: 'Request timed out. Please try again.' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate queries' },
      { status: 500 }
    );
  }
}