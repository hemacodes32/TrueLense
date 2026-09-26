import { useEffect, useMemo, useState } from 'react';
import ResultCard from './ResultCard';
import { analyzeFile } from '../api';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AnalyzePanel({ file, onReset, onAnalyzed }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [statusText, setStatusText] = useState('');

  const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);
  const isAudio = file.type.startsWith('audio/') || ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg'].some((e) => file.name.toLowerCase().endsWith(e));
  const isVideo = !isAudio && (file.type.startsWith('video/') || ['.mp4', '.mov', '.webm', '.avi', '.mkv'].some((e) => file.name.toLowerCase().endsWith(e)));

  useEffect(() => {
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    setResult(null);
    setError(null);
  }, [file]);

  useEffect(() => {
    if (!analyzing) return;
    const initialText = isAudio ? 'Decoding audio waveform…' : isVideo ? 'Sampling frames…' : 'Analyzing image…';
    const nextText = isAudio ? 'Evaluating neural vocoder & acoustic features…' : isVideo ? 'Scoring sampled frames…' : 'Scoring image…';

    setStatusText(initialText);
    const t = setTimeout(() => {
      setStatusText(nextText);
    }, 1400);
    return () => clearTimeout(t);
  }, [analyzing, isVideo, isAudio]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const data = await analyzeFile(file);
      setResult(data);
      onAnalyzed?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="analyze-panel">
      <div className="preview-wrap">
        {isAudio ? (
          <div className="audio-preview-box" style={{
            padding: '48px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            minHeight: 220,
            background: 'rgba(255, 255, 255, 0.02)',
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.15)',
              color: '#818CF8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13"/>
                <circle cx="6" cy="18" r="3"/>
                <circle cx="18" cy="16" r="3"/>
              </svg>
            </div>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8, color: 'var(--text-primary)', textAlign: 'center' }}>
              {file.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Audio Track · {formatBytes(file.size)}
            </div>
            <audio src={previewUrl} controls style={{ width: '100%', maxWidth: 420 }} />
          </div>
        ) : isVideo ? (
          <video src={previewUrl} controls={!analyzing} />
        ) : (
          <img src={previewUrl} alt="Upload preview" />
        )}

        <div className="preview-toolbar">
          {!analyzing && (
            <button className="icon-btn" title="Remove file" onClick={onReset}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        {analyzing && (
          <div className="scan-overlay">
            <div className="scan-line" />
            <div className="scan-status">
              <span className="spinner" />
              {statusText}
            </div>
          </div>
        )}
      </div>

      <div className="panel-footer">
        <div className="file-meta">
          <div className="name">{file.name}</div>
          <div className="sub">{formatBytes(file.size)} · {isAudio ? 'Audio' : isVideo ? 'Video' : 'Image'}</div>
        </div>
        <div className="panel-actions">
          <button className="btn btn-ghost" onClick={onReset} disabled={analyzing}>
            Choose another
          </button>
          <button className="btn btn-primary" onClick={handleAnalyze} disabled={analyzing || !!result}>
            {analyzing ? 'Analyzing…' : result ? 'Analyzed' : 'Analyze'}
          </button>
        </div>
      </div>

      {error && <div className="error-banner" style={{ margin: '0 20px 20px' }}>{error}</div>}

      {result && <ResultCard result={result} />}
    </div>
  );
}
