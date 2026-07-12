import { Coins } from "lucide-react";
import { type Translations } from "@/lib/locales";

interface BetControlsProps {
  betAmount: string;
  t: Translations;
  variant?: 'badge' | 'row';
}

export function BetControls({ betAmount, t, variant = 'badge' }: BetControlsProps) {
  if (!betAmount) return null;

  if (variant === 'row') {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{t.betSize}</span>
        <span className="bet-badge">
          <Coins size={13} color="#ffd000" style={{ marginRight: '4px' }} />
          {betAmount}
        </span>
      </div>
    );
  }

  return (
    <span className="bet-badge" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <Coins size={13} color="#ffd000" />
      <span>{betAmount}</span>
    </span>
  );
}
