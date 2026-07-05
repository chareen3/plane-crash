"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Brain, Activity, TrendingUp, AlertTriangle } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

type Round = {
  id: string;
  round_number: number;
  crash_point: number;
  created_at: string;
};

export default function Dashboard() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [prediction, setPrediction] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    // Initial fetch
    const fetchRounds = async () => {
      const { data } = await supabase
        .from('crash_rounds')
        .select('*')
        .order('round_number', { ascending: false })
        .limit(20);
      
      if (data) {
        setRounds(data);
      }
    };

    fetchRounds();

    // Subscribe to realtime inserts
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'crash_rounds' },
        (payload) => {
          const newRound = payload.new as Round;
          setRounds((prev) => [newRound, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/predict');
      const data = await res.json();
      if (data.prediction) {
        setPrediction(data.prediction);
      } else {
        setPrediction("Error generating prediction.");
      }
    } catch (err) {
      console.error(err);
      setPrediction("Failed to connect to AI service.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const chartData = [...rounds].reverse().map(r => ({
    name: r.round_number,
    crash: r.crash_point
  }));

  const avgCrash = rounds.length > 0 
    ? (rounds.reduce((acc, curr) => acc + Number(curr.crash_point), 0) / rounds.length).toFixed(2)
    : "0.00";

  return (
    <div className="container">
      <header className="header">
        <h1 className="title">Plane Crash AI Dashboard</h1>
        <button 
          className="btn" 
          onClick={handleAnalyze} 
          disabled={isAnalyzing || rounds.length === 0}
        >
          <Brain size={18} />
          {isAnalyzing ? "Analyzing..." : "Ask AI"}
        </button>
      </header>

      {prediction && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2 className="card-title"><Brain size={20} /> AI Risk Analysis</h2>
          <div className="ai-prediction">
            {prediction}
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '1rem', fontStyle: 'italic' }}>
            * Important: AI cannot truly predict gambling/crash game outcomes. This is a pattern analysis based on recent volatility.
          </p>
        </div>
      )}

      <div className="grid">
        <div className="card">
          <h2 className="card-title"><Activity size={20} /> Avg Last 20</h2>
          <p className="stats-value">{avgCrash}x</p>
        </div>
        
        <div className="card">
          <h2 className="card-title"><AlertTriangle size={20} /> Latest Round</h2>
          <p className={`stats-value ${rounds[0]?.crash_point >= 2 ? 'success' : 'danger'}`}>
            {rounds[0]?.crash_point ? `${rounds[0].crash_point}x` : '-'}
          </p>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="card">
          <h2 className="card-title"><TrendingUp size={20} /> Recent Trend</h2>
          <div style={{ height: 300, width: '100%' }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Line type="monotone" dataKey="crash" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">Live Feed</h2>
          {rounds.length === 0 ? (
            <p style={{ color: '#64748b' }}>Waiting for rounds...</p>
          ) : (
            <ul className="list">
              {rounds.map((round) => (
                <li key={round.id} className="list-item">
                  <span style={{ color: '#94a3b8' }}>#{round.round_number}</span>
                  <span className={`multiplier ${round.crash_point >= 2 ? 'success' : 'danger'}`}>
                    {round.crash_point.toFixed(2)}x
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
