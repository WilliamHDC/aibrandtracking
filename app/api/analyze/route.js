import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { query, brands } = await req.json();

    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: "You are a helpful assistant that analyzes text." },
        { role: "user", content: query }
      ],
      model: "gpt-3.5-turbo",
    });

    const response = completion.choices[0].message.content;

    // Process brand mentions with relative positioning
    const brandMentions = brands.map(brand => {
      const mentions = [];
      const regex = new RegExp(`\\b${brand}\\b`, 'gi');
      let match;
      
      // Find all occurrences of the brand
      while ((match = regex.exec(response)) !== null) {
        mentions.push(match.index);
      }

      return {
        name: brand,
        mentioned: mentions.length > 0,
        count: mentions.length,
        positions: mentions,
        brandPosition: null  // We'll fill this in next
      };
    });

    // Sort all brand occurrences to determine relative positions
    const allBrandOccurrences = brandMentions
      .filter(b => b.mentioned)
      .map(brand => {
        // Take only the first occurrence for each brand
        return {
          name: brand.name,
          position: brand.positions[0]
        };
      })
      .sort((a, b) => a.position - b.position);

    // Assign relative brand positions
    allBrandOccurrences.forEach((occurrence, index) => {
      const brandMention = brandMentions.find(b => b.name === occurrence.name);
      if (brandMention) {
        brandMention.brandPosition = index + 1; // 1-based position
      }
    });

    return NextResponse.json({
      response,
      brandMentions
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
} 