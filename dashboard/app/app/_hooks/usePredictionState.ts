import { useState, useRef, useCallback } from "react";
import { type Prediction } from "../_lib/dashboard-types";
import { normalizePrediction } from "../_lib/normalize-prediction";

export function usePredictionState(activeGame: string, fetchWinRate: () => void) {
  const [prediction, setPredictionRaw] = useState<Prediction | null>(null);
  const [timeData, setTimeData] = useState<any>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predStatus, setPredStatus] = useState<'idle' | 'predicting' | 'done'>('idle');

  const isPredictingRef = useRef(false);

  /** Always store normalized predictions so the AI coach never gets bad shapes. */
  const setPrediction = useCallback((p: Prediction | null | any) => {
    if (p == null) {
      setPredictionRaw(null);
      return;
    }
    setPredictionRaw(normalizePrediction(p));
  }, []);

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
        // Accept any payload that normalizes into a coach-ready prediction
        const mapped = normalizePrediction(d);
        if (mapped) {
          setPredictionRaw(mapped);
          if (d.timeData) setTimeData(d.timeData);
          setPredStatus('done');
        } else {
          setPredStatus('idle');
        }
      } else {
        setPredStatus('idle');
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
