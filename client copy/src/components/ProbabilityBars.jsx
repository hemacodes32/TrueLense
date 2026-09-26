export default function ProbabilityBars({ realPct, aiPct }) {
  return (
    <div className="bars">
      <div className="bar-row">
        <div className="bar-label">
          <span>Real</span>
          <span style={{ color: 'var(--accent-real)' }}>{realPct.toFixed(1)}%</span>
        </div>
        <div className="bar-track">
          <div className="bar-fill real" style={{ width: `${realPct}%` }} />
        </div>
      </div>
      <div className="bar-row">
        <div className="bar-label">
          <span>AI-generated</span>
          <span style={{ color: 'var(--accent-ai)' }}>{aiPct.toFixed(1)}%</span>
        </div>
        <div className="bar-track">
          <div className="bar-fill ai" style={{ width: `${aiPct}%` }} />
        </div>
      </div>
    </div>
  );
}
