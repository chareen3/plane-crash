import { RefreshCw } from "lucide-react";
import { type Translations } from "@/lib/locales";

interface ConnectionStatusProps {
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  latency: number;
  lastSyncedRound: number | null;
  triggerReconnect: () => void;
  t: Translations;
  showButton?: boolean;
  buttonText?: string;
  buttonStyle?: React.CSSProperties;
}

export function ConnectionStatus({
  connectionStatus,
  latency,
  lastSyncedRound,
  triggerReconnect,
  t,
  showButton = true,
  buttonText,
  buttonStyle,
}: ConnectionStatusProps) {
  const btnTxt = buttonText || t.reconnect;

  return (
    <>
      {connectionStatus === 'connected' ? (
        <div className="live-badge connected" style={{ borderColor: 'rgba(0,229,160,0.25)', color: '#00e5a0', background: 'rgba(0,229,160,0.1)' }}>
          <span className="live-dot synced" style={{ background: '#00e5a0', boxShadow: '0 0 6px #00e5a0', animation: 'pulse 1.5s infinite' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>{t.synced}</span>
            {latency > 0 && <span style={{ fontSize: '9px', opacity: 0.7, background: 'rgba(0,229,160,0.15)', padding: '2px 6px', borderRadius: '10px' }}>{latency}ms</span>}
          </div>
        </div>
      ) : connectionStatus === 'connecting' ? (
        <div className="live-badge connecting" style={{ borderColor: 'rgba(255,208,0,0.25)', color: '#ffd000', background: 'rgba(255,208,0,0.1)' }}>
          <span className="live-dot trying" style={{ background: '#ffd000', boxShadow: '0 0 6px #ffd000', animation: 'pulse 1.5s infinite' }} />
          <span>{t.connecting}</span>
        </div>
      ) : (
        <div className="live-badge disconnected" style={{ borderColor: 'rgba(255,51,102,0.25)', color: '#ff3366', background: 'rgba(255,51,102,0.1)' }}>
          <span className="live-dot off" style={{ background: '#ff3366' }} />
          <span>{t.disconnected} {lastSyncedRound ? `(${t.tableGameId}: #${lastSyncedRound})` : ''}</span>
        </div>
      )}

      {showButton && connectionStatus !== 'connected' && (
        <button
          type="button"
          className="ui-btn ui-btn-accent reconnect-btn"
          onClick={triggerReconnect}
          style={buttonStyle}
        >
          <RefreshCw size={14} className={connectionStatus === 'connecting' ? 'spin' : ''} />
          <span className="ui-btn-label">{btnTxt}</span>
        </button>
      )}
    </>
  );
}
