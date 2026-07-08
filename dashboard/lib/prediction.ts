import { createClient } from '@supabase/supabase-js';

// Setup Supabase Client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type TimeSlot = 'night' | 'morning' | 'afternoon' | 'evening';

export function getSriLankaTimeSlot(): TimeSlot {
  const hour = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Colombo',
    hour: 'numeric',
    hour12: false
  });
  const h = parseInt(hour);
  if (h >= 0 && h < 6) return 'night';      // Low traffic
  if (h >= 6 && h < 12) return 'morning';    // EU waking up
  if (h >= 12 && h < 18) return 'afternoon';  // Peak traffic
  return 'evening';                            // EU winding down
}

export function analyzePattern(data: any[]) {
  if (!data || data.length === 0) {
    return {
      prediction: 'NO_DATA',
      avg_crash: 0,
      pct_below_2x: 0,
      confidence: 0
    };
  }

  const crashPoints = data.map(r => Number(r.crash_point || r.crash_val || 0)).filter(c => !isNaN(c));
  if (crashPoints.length === 0) {
    return {
      prediction: 'NO_DATA',
      avg_crash: 0,
      pct_below_2x: 0,
      confidence: 0
    };
  }

  const count = crashPoints.length;
  const avg = crashPoints.reduce((sum, val) => sum + val, 0) / count;
  const below2x = crashPoints.filter(c => c < 2.0).length;
  const pctBelow2x = (below2x / count) * 100;

  // Let's compute some simple pattern metrics
  let prediction = 'NORMAL';
  if (pctBelow2x > 60) {
    prediction = 'CONSERVATIVE'; // High probability of low outcomes
  } else if (pctBelow2x < 45 && avg > 2.2) {
    prediction = 'AGGRESSIVE'; // volatile/high crash opportunities
  }

  return {
    prediction,
    avg_crash: Math.round(avg * 100) / 100,
    pct_below_2x: Math.round(pctBelow2x * 10) / 10,
    confidence: Math.min(100, Math.max(10, Math.round((1 - Math.abs(50 - pctBelow2x) / 50) * 100)))
  };
}

export async function getPrediction(supabaseClient: any, timeSlot: TimeSlot) {
  const currentHour = new Date().getHours();
  // Get last 200 rounds for this time slot (Sri Lanka hour matching current hour)
  const { data, error } = await supabaseClient
    .from('crash_rounds')
    .select('crash_point, hour_sl')
    .eq('hour_sl', currentHour) // match current SL hour
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('getPrediction query error:', error);
  }

  return analyzePattern(data || []);
}
