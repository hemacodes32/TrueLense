/* ================================================================
   StatsDashboard – per-user statistics page
   ================================================================ */

import { useEffect, useState } from 'react';
import { fetchUserStats } from '../api';
import './stats.css';

/* ── Tiny SVG line-chart ──────────────────────────────────────── */
function ConfidenceGraph({ history }) {
  if (!history || history.length === 0) {
    return (
      <div className="sg-empty">
        <span>No analyses yet — your confidence history will appear here.</span>
      </div>
    );
  }

  const W = 600;
  const H = 160;
  const PAD = { top: 16, right: 16, bottom: 32, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  // Sort chronologically
  const sorted = [...history].sort((a, b) => new Date(a.analyzedAt) - new Date(b.analyzedAt));

  const pts = sorted.map((item, i) => {
    const x = PAD.left + (sorted.length === 1 ? innerW / 2 : (i / (sorted.length - 1)) * innerW);
    const y = PAD.top + innerH - (item.confidencePct / 100) * innerH;
    return { x, y, item };
  });

  const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ');

  // Y-axis ticks
  const yTicks = [0, 25, 50, 75, 100];

  // X-axis: show first, last, and a few middle labels
  const xLabelIndices = new Set([0, sorted.length - 1]);
  if (sorted.length > 4) {
    const mid = Math.floor(sorted.length / 2);
    xLabelIndices.add(mid);
  }

  function fmtDate(iso) {
    try {
      return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (_) { return ''; }
  }

  return (
    <div className="sg-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="sg-svg" aria-label="Confidence history chart">
        {/* Y-axis grid lines */}
        {yTicks.map((t) => {
          const y = PAD.top + innerH - (t / 100) * innerH;
          return (
            <g key={t}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} className="sg-grid" />
              <text x={PAD.left - 6} y={y + 4} className="sg-axis-lbl" textAnchor="end">{t}%</text>
            </g>
          );
        })}

        {/* Area fill */}
        <defs>
          <linearGradient id="sgGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6C7CFF" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#6C7CFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        {pts.length > 1 && (
          <polygon
            points={[
              `${pts[0].x},${PAD.top + innerH}`,
              ...pts.map((p) => `${p.x},${p.y}`),
              `${pts[pts.length - 1].x},${PAD.top + innerH}`,
            ].join(' ')}
            fill="url(#sgGrad)"
          />
        )}

        {/* Line */}
        {pts.length > 1 && (
          <polyline points={polyline} className="sg-line" fill="none" />
        )}

        {/* Dots */}
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={pts.length < 20 ? 4 : 3}
            className={`sg-dot ${p.item.label === 'REAL' ? 'real' : 'ai'}`}
          />
        ))}

        {/* X-axis labels */}
        {pts.map((p, i) =>
          xLabelIndices.has(i) ? (
            <text key={i} x={p.x} y={H - 4} className="sg-axis-lbl" textAnchor="middle">
              {fmtDate(p.item.analyzedAt)}
            </text>
          ) : null
        )}
      </svg>
    </div>
  );
}

/* ── Stat card ───────────────────────────────────────────────── */
function StatCard({ value, label, sub, accent }) {
  return (
    <div className={`stats-card ${accent || ''}`}>
      <div className="stats-card-val">{value}</div>
      <div className="stats-card-lbl">{label}</div>
      {sub && <div className="stats-card-sub">{sub}</div>}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────── */
export default function StatsDashboard({ history: historyProp }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('all'); // 'all' | '30' | '7'

  useEffect(() => {
    setLoading(true);
    fetchUserStats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="stats-loading">
        <span className="spinner" style={{ width: 22, height: 22 }} />
        <span>Loading statistics…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-banner" style={{ margin: 0 }}>
        Failed to load statistics: {error}
      </div>
    );
  }

  const s = stats || { total: 0, images: 0, videos: 0, audio: 0, real: 0, aiGenerated: 0, avgConfidence: 0, history: [] };

  // Filter history for graph
  const now = Date.now();
  const filterMs = period === '7' ? 7 * 86400_000 : period === '30' ? 30 * 86400_000 : null;
  const graphHistory = filterMs
    ? s.history.filter((h) => now - new Date(h.analyzedAt).getTime() < filterMs)
    : s.history;

  const realPct = s.total > 0 ? ((s.real / s.total) * 100).toFixed(0) : 0;
  const aiPct = s.total > 0 ? ((s.aiGenerated / s.total) * 100).toFixed(0) : 0;

  return (
    <div className="stats-page">
      {/* ── Summary cards ── */}
      <div className="stats-grid">
        <StatCard value={s.total} label="Total Analyses" />
        <StatCard value={s.images} label="Images" sub="🖼" />
        <StatCard value={s.videos} label="Videos" sub="🎥" />
        <StatCard value={s.audio} label="Audio Files" sub="🎵" />
        <StatCard value={s.real} label="Marked REAL" accent="real" />
        <StatCard value={s.aiGenerated} label="Marked AI-Generated" accent="ai" />
      </div>

      {/* ── Breakdown bar ── */}
      {s.total > 0 && (
        <div className="stats-section">
          <div className="stats-section-title">Result Breakdown</div>
          <div className="stats-breakdown-bar-wrap">
            <div className="stats-breakdown-bar">
              {s.real > 0 && (
                <div
                  className="sbb-seg real"
                  style={{ width: `${realPct}%` }}
                  title={`REAL: ${s.real} (${realPct}%)`}
                />
              )}
              {s.aiGenerated > 0 && (
                <div
                  className="sbb-seg ai"
                  style={{ width: `${aiPct}%` }}
                  title={`AI-GENERATED: ${s.aiGenerated} (${aiPct}%)`}
                />
              )}
            </div>
            <div className="stats-breakdown-labels">
              {s.real > 0 && (
                <span className="sbl real">REAL — {s.real} ({realPct}%)</span>
              )}
              {s.aiGenerated > 0 && (
                <span className="sbl ai">AI-GENERATED — {s.aiGenerated} ({aiPct}%)</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Avg confidence ── */}
      <div className="stats-section stats-avg-row">
        <div className="stats-section-title">Average Confidence</div>
        <div className="stats-avg-val">{s.avgConfidence}%</div>
        <div className="stats-avg-track">
          <div className="stats-avg-fill" style={{ width: `${s.avgConfidence}%` }} />
        </div>
      </div>

      {/* ── Confidence history graph ── */}
      <div className="stats-section">
        <div className="stats-section-header">
          <div className="stats-section-title">Confidence History</div>
          <div className="stats-period-btns">
            {[['all', 'All time'], ['30', 'Last 30 days'], ['7', 'Last 7 days']].map(([v, lbl]) => (
              <button
                key={v}
                className={`stats-period-btn ${period === v ? 'active' : ''}`}
                onClick={() => setPeriod(v)}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>
        <div className="stats-graph-wrap">
          <ConfidenceGraph history={graphHistory} />
        </div>
        <div className="stats-graph-legend">
          <span className="sg-dot real" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%' }} />
          <span> REAL  </span>
          <span className="sg-dot ai" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', marginLeft: 12 }} />
          <span> AI-GENERATED</span>
        </div>
      </div>

      {/* ── Media type breakdown ── */}
      {s.total > 0 && (
        <div className="stats-section">
          <div className="stats-section-title">Media Breakdown</div>
          <div className="stats-media-grid">
            {[
              { type: 'Images', count: s.images, icon: '🖼', pct: ((s.images / s.total) * 100).toFixed(0) },
              { type: 'Videos', count: s.videos, icon: '🎥', pct: ((s.videos / s.total) * 100).toFixed(0) },
              { type: 'Audio', count: s.audio, icon: '🎵', pct: ((s.audio / s.total) * 100).toFixed(0) },
            ].map(({ type, count, icon, pct }) => (
              <div key={type} className="stats-media-row">
                <span className="stats-media-icon">{icon}</span>
                <span className="stats-media-type">{type}</span>
                <div className="stats-media-track">
                  <div className="stats-media-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="stats-media-count">{count}</span>
                <span className="stats-media-pct">{pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
