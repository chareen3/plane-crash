import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    // 1. Fetch the latest 20 rounds from Supabase
    const { data: rounds, error } = await supabase
      .from('crash_rounds')
      .select('*')
      .order('round_number', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!rounds || rounds.length === 0) {
      return NextResponse.json({ prediction: "Not enough data to analyze." });
    }

    // 2. Format rounds for the AI prompt
    const recentHistory = rounds.map(r => r.crash_point).reverse().join(', ');
    
    // 3. Construct prompt
    const prompt = `
You are an analytical AI observing a sequence of crash game multipliers. 
Recent crash points (oldest to newest): [${recentHistory}].

Analyze the recent volatility and pattern. 
Classify the next round into a risk bucket: LOW RISK (likely < 2.0x), MEDIUM RISK (likely 2.0x - 5.0x), HIGH RISK (likely > 5.0x).
Provide a short 2-sentence summary of the recent sequence and a warning if it's highly unstable.
Remember to position this as pattern analysis and state that outcomes are not guaranteed.
`;

    // 4. Call OpenRouter API
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemma-4-26b-a4b-it:free",
        messages: [
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const errData = await response.text();
      return NextResponse.json({ error: `OpenRouter API error: ${errData}` }, { status: 500 });
    }

    const aiData = await response.json();
    const predictionText = aiData.choices?.[0]?.message?.content || "No prediction received.";

    return NextResponse.json({ prediction: predictionText });

  } catch (err: any) {
    console.error('API /predict error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
