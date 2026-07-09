import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateProbability, calculateEV } from '../../../lib/crashMath';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const multiplier = parseFloat(url.searchParams.get('m') || '1.50');
    const bet = parseFloat(url.searchParams.get('bet') || '1.00');
    const preset = url.searchParams.get('preset') || 'custom';
    const sessionId = url.searchParams.get('sessionId') || 'anonymous';

    // 1. Fetch game configuration from game_config table
    const { data: configData, error: configError } = await supabase
      .from('game_config')
      .select('rtp, house_edge')
      .eq('provider', 'default')
      .maybeSingle();

    if (configError) {
      console.error('[EVALUATE API] Error fetching game_config:', configError);
    }

    const rtp = configData ? Number(configData.rtp) : 97.0;
    const house_edge = configData ? Number(configData.house_edge) : 3.0;

    // 2. Compute theoretical math
    const prob_win_theoretical = calculateProbability(multiplier, rtp);
    const ev_theoretical = calculateEV(multiplier, rtp);

    // 3. Fetch recent crash rounds for history analytics
    const { data: recentRounds, error: roundsError } = await supabase
      .from('crash_rounds')
      .select('crash_point')
      .order('created_at', { ascending: false })
      .limit(50);

    if (roundsError) {
      console.error('[EVALUATE API] Error fetching recent rounds:', roundsError);
    }

    let cold_streak = false;
    let high_volatility = false;
    let prob_win_historical = 0;
    let ev_historical = 0;

    if (recentRounds && recentRounds.length > 0) {
      // Cold Streak: Last 5 rounds all crashed below 1.50x
      const last5 = recentRounds.slice(0, 5);
      cold_streak = last5.length >= 5 && last5.every(r => Number(r.crash_point) < 1.50);

      // High Volatility: 4 or more rounds in last 20 went >= 5.00x
      const last20 = recentRounds.slice(0, 20);
      const highRoundsCount = last20.filter(r => Number(r.crash_point) >= 5.00).length;
      high_volatility = highRoundsCount >= 4;

      // Historical hit rate for this target multiplier over last 50 rounds
      const hitCount = recentRounds.filter(r => Number(r.crash_point) >= multiplier).length;
      prob_win_historical = hitCount / recentRounds.length;

      // Historical EV: (P_historical * (M - 1)) + ((1 - P_historical) * -1)
      const evHistVal = (prob_win_historical * (multiplier - 1)) + ((1 - prob_win_historical) * -1);
      ev_historical = Math.round(evHistVal * 1000) / 1000;
    }

    // 4. Log evaluation into strategy_eval table
    const evalRecord = {
      user_session_id: sessionId,
      target_multiplier: multiplier,
      prob_win: Math.round(prob_win_theoretical * 1000) / 10, // store as percentage 0-100
      ev: ev_theoretical,
      chosen_preset: preset,
    };

    const { error: insertError } = await supabase
      .from('strategy_eval')
      .insert(evalRecord);

    if (insertError) {
      console.error('[EVALUATE API] Error logging to strategy_eval:', insertError);
    }

    return NextResponse.json({
      rtp,
      house_edge,
      multiplier,
      bet,
      preset,
      prob_win_theoretical,
      ev_theoretical,
      prob_win_historical,
      ev_historical,
      cold_streak,
      high_volatility,
      recent_rounds_count: recentRounds ? recentRounds.length : 0,
    });

  } catch (err: any) {
    console.error('[EVALUATE API] Internal error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
