import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const { data: rounds, error } = await supabase
      .from('crash_rounds')
      .select('crash_point, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    if (!rounds || rounds.length === 0) {
      return NextResponse.json({ error: 'No rounds found' }, { status: 404 });
    }

    // Zone Hit Rate — % of rounds that crashed ABOVE 1.5x (safe zone baseline)
    const safeZone = 1.5;
    const hitsAboveSafe = rounds.filter(r => r.crash_point >= safeZone).length;
    const zoneHitRate = ((hitsAboveSafe / rounds.length) * 100).toFixed(1);

    // Streak analysis — longest run without early crash (<1.3x)
    let streak = 0, maxStreak = 0;
    
    // Reverse the array to iterate in chronological order (oldest first)
    const chronologicalRounds = [...rounds].reverse();
    
    chronologicalRounds.forEach(r => {
      if (r.crash_point >= 1.3) { 
        streak++; 
        maxStreak = Math.max(maxStreak, streak);
      } else {
        streak = 0;
      }
    });

    // Average multiplier
    const avgMultiplier = (rounds.reduce((s, r) => s + Number(r.crash_point), 0) / rounds.length).toFixed(2);

    // Accuracy: when we predicted swing target X, did crash happen ABOVE it?
    const { data: predictions, error: predictionsError } = await supabase
      .from('predictions')
      .select('round_number, cashout_target, tier_swing, swing_target, predicted_multiplier, should_bet, confidence')
      .limit(500)
      .order('round_number', { ascending: false });
      
      if (predictionsError) {
        console.error('Error fetching predictions:', predictionsError);
      }
      
      // We already have `rounds` as actuals (last 100).
      // Let's get up to 500 actuals to match predictions
      const { data: actuals, error: actualsError } = await supabase
        .from('crash_rounds')
        .select('round_number, crash_point')
        .order('round_number', { ascending: false })
        .limit(500);
  
      let realHitRate = '0.0';
      let totalBetRounds = 0;
      let successfulHits = 0;
  
      if (predictions && actuals) {
        // Match predictions to actuals
        const matched = predictions.map(p => {
          // A prediction for round X is checked against actual round X
          const actual = actuals.find(r => r.round_number === p.round_number);
          if (!actual) return null;
          const target = p.tier_swing || p.swing_target
            ? Number(p.tier_swing || p.swing_target)
            : Number(p.cashout_target || p.predicted_multiplier || 1.10);
          return {
            predicted: target,
            actual: actual.crash_point,
            hit: Number(actual.crash_point) >= target, // did it stay above our target?
            shouldBet: p.should_bet !== false
          };
        }).filter(Boolean) as any[];
      
      const betRounds = matched.filter(m => m.shouldBet);
      totalBetRounds = betRounds.length;
      successfulHits = betRounds.filter(m => m.hit).length;
      
      if (totalBetRounds > 0) {
        realHitRate = ((successfulHits / totalBetRounds) * 100).toFixed(1);
      }
    }

    return NextResponse.json({
      zoneHitRate,
      maxStreak,
      currentStreak: streak,
      avgMultiplier,
      totalAnalyzed: rounds.length,
      accuracy: {
        realHitRate,
        totalBetRounds,
        successfulHits
      }
    });

  } catch (err: any) {
    console.error('Error fetching stats:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
