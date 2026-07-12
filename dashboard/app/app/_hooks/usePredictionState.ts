import { useState, useRef, useCallback } from "react";
import { type Prediction } from "../_lib/dashboard-types";

export function usePredictionState(activeGame: string, fetchWinRate: () => void) {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [timeData, setTimeData] = useState<any>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predStatus, setPredStatus] = useState<'idle' | 'predicting' | 'done'>('idle');

  const isPredictingRef = useRef(false);

  const runPrediction = useCallback(async () => {
    if (isPredictingRef.current) return;
    isPredictingRef.current = true;
    setPredStatus('predicting');
    setIsPredicting(true);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch(`/api/predict?game=${activeGame}&tz=${encodeURIComponent(tz)}`);
      if (res.ok) {
        const d = await res.json();
        if (d.risk || d.strategy) {
          const mapped: Prediction = {
            ...d,
            predicted_risk: d.risk ?? d.predicted_risk,
            strategy: d.strategy ?? 'CONSERVATIVE',
            should_bet: d.should_bet ?? true,
            cashout_target: d.cashout_target ?? d.predicted_multiplier ?? 1.2,
          };
          setPrediction(mapped);
          if (d.timeData) setTimeData(d.timeData);
          setPredStatus('done');
        } else {
          setPredStatus('idle');
        }
      }
    } catch {
      setPredStatus('idle');
    } finally {
      setIsPredicting(false);
      isPredictingRef.current = false;
    }
  }, [activeGame]);

  return {
    prediction,
    setPrediction,
    timeData,
    setTimeData,
    isPredicting,
    predStatus,
    setPredStatus,
    runPrediction,
  };
}
export type UsePredictionStateReturn = ReturnType<typeof usePredictionState>;
