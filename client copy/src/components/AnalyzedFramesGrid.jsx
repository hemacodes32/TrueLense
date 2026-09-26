function formatTimestamp(sec) {
  if (sec === null || sec === undefined) return '—';
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(1);
  return `${m}:${s.padStart(4, '0')}`;
}

export default function AnalyzedFramesGrid({ frames }) {
  if (!frames || frames.length === 0) return null;

  return (
    <div className="frames-section">
      <div className="frames-heading">
        <h3>Analyzed frames</h3>
        <p>The {frames.length} sampled frames Sightengine scored, each with its own result.</p>
      </div>

      <div className="frames-grid">
        {frames.map((f) => {
          const isReal = f.label === 'REAL';
          return (
            <div className="frame-card" key={f.frame}>
              <div className="frame-thumb">
                <img src={f.thumbUrl} alt={`Frame ${f.frame + 1}`} />
                <span className="frame-number">#{f.frame + 1}</span>
                <span className="frame-timestamp mono">{formatTimestamp(f.timestampSec)}</span>
              </div>
              <div className="frame-info">
                <span className={`frame-badge ${isReal ? 'real' : 'ai'}`}>{f.label}</span>
                
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
