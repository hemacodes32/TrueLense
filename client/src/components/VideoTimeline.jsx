/**
 * VideoTimeline – reusable heatmap + frame chip grid for video analysis results.
 * Accepts `frames` array from the API's frameBreakdown field.
 */
export default function VideoTimeline({ frames }) {
  if (!frames || frames.length === 0) return null;

  // Build timestamp label (MM:SS) from seconds
  function fmtTs(sec) {
    if (sec == null) return null;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // Decide which frame indices to show labels for (max ~5)
  const labelStep = Math.max(1, Math.floor(frames.length / 4));

  return (
    <div className="vt-root">
      {/* ── Heatmap bar ── */}
      <div className="vt-heatmap">
        {frames.map((f, i) => (
          <div
            key={i}
            className={`vt-seg ${f.label === 'REAL' ? 'real' : 'ai'}`}
            style={{ flex: 1 }}
            title={`Frame ${i + 1}${fmtTs(f.timestampSec) ? ' @ ' + fmtTs(f.timestampSec) : ''}: ${f.label} (${Math.round(f.confidencePct || 0)}%)`}
          />
        ))}
      </div>

      {/* ── Timestamp labels beneath bar ── */}
      <div className="vt-ts-row">
        {frames.map((f, i) => {
          const show = i === 0 || i === frames.length - 1 || i % labelStep === 0;
          const ts = fmtTs(f.timestampSec) || `F${i + 1}`;
          return (
            <span
              key={i}
              className="vt-ts-label"
              style={{ visibility: show ? 'visible' : 'hidden', flex: 1 }}
            >
              {ts}
            </span>
          );
        })}
      </div>

      {/* ── REAL/AI section summary ── */}
      <div className="vt-legend">
        <span className="vt-legend-dot real" />
        <span className="vt-legend-txt">REAL frames</span>
        <span className="vt-legend-dot ai" style={{ marginLeft: 16 }} />
        <span className="vt-legend-txt">AI-GENERATED frames</span>
      </div>

      {/* ── Frame chip grid ── */}
      <div className="vt-chips">
        {frames.map((f, i) => (
          <div key={i} className={`vt-chip ${f.label === 'REAL' ? 'real' : 'ai'}`}>
            {f.thumbUrl && (
              <img
                src={f.thumbUrl}
                alt={`Frame ${i + 1}`}
                className="vt-chip-thumb"
                loading="lazy"
              />
            )}
            <div className="vt-chip-body">
              <span className="vt-chip-num">#{i + 1}</span>
              {fmtTs(f.timestampSec) && (
                <span className="vt-chip-ts">{fmtTs(f.timestampSec)}</span>
              )}
              <span className={`vt-chip-badge ${f.label === 'REAL' ? 'real' : 'ai'}`}>
                {f.label}
              </span>
              <span className="vt-chip-conf">{Math.round(f.confidencePct || 0)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
