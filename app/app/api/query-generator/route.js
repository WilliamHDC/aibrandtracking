import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req) {
  try {
    const body = await req.json();
    const { brand, competitors, keywords } = body;

    if (!brand || !competitors || !keywords) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const prompt = `
      Generate detailed search queries that potential customers would use when researching ${brand} and its competitors (${competitors.join(', ')}).
      Focus on specific problems, features, and use cases for each keyword.

      Keywords: ${keywords.join(', ')}

      For each keyword, generate 8-10 detailed queries that:
      1. Focus on specific features and benefits
      2. Address common user problems and concerns
      3. Compare performance in specific conditions
      4. Ask about real-world usage and experiences
      5. Seek detailed technical information

      Examples of the type of queries to generate:
      - "Which running shoes provide the best arch support for my foot type?"
      - "What features should I look for in shoes designed for marathon training?"
      - "Which shoes offer the best cushioning for long-distance runs?"
      - "What is the typical durability in miles of marathon running shoes?"
      - "Which shoes help reduce fatigue during long runs?"
      - "What are the most recommended shoes for technical trail running?"
      - "Which trail running shoes perform best on wet surfaces?"
      - "How do different brands compare for ankle support in trail running?"

      Format the response as a JSON object where each keyword is a key and its value is an array of queries.
      Do not include brand names in every query - mix branded and unbranded searches.
      Focus on detailed, specific questions that real users would ask.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a search behavior expert who understands how users research products online. Generate detailed, specific queries that real users would type when researching products and solutions."
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