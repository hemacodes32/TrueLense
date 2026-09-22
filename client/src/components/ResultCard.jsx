import { useState } from 'react';
import ProbabilityBars from './ProbabilityBars';
import AnalyzedFramesGrid from './AnalyzedFramesGrid';
import ForensicModal from './ForensicModal';

export default function ResultCard({ result }) {
  const [showForensic, setShowForensic] = useState(false);
  if (!result) return null;
  const isReal = result.label === 'REAL';
  const isVideo = result.mediaType === 'video';
  const isAudio = result.mediaType === 'audio';
  const meta = result.metadata;

  return (
    <>
      <div className="result">
        <div className={`result-label ${isReal ? 'real' : 'ai'}`}>
          <span className={`result-dot ${isReal ? 'real' : 'ai'}`} />
          {result.label}
        </div>
        <div className="result-confidence">
          <b>{result.confidencePct.toFixed(1)}%</b> confidence
        </div>

        <ProbabilityBars realPct={result.realProbabilityPct} aiPct={result.aiProbabilityPct} />

        <div className="result-meta">
          {isVideo
            ? `Analyzed ${result.framesAnalyzed} sampled frame${result.framesAnalyzed === 1 ? '' : 's'} across the full video`
            : isAudio
            ? 'Analyzed acoustic waveform, vocoder frequency roll-off, and spectral flatness dynamics'
            : 'Analyzed the full image, including subjects and background'}
        </div>

        {isVideo && <AnalyzedFramesGrid frames={result.frameBreakdown} />}

        {meta && (
          <div className="result-metadata-box">
            <div className="metadata-title">File &amp; Stream Metadata</div>
            <div className="metadata-grid">
              {meta.fileFormat && (
                <div className="metadata-chip">
                  <span className="lbl">Format:</span>
                  <span className="val">{meta.fileFormat}</span>
                </div>
              )}
              {(meta.fileSizeFormatted || result.fileSize) && (
                <div className="metadata-chip">
                  <span className="lbl">Size:</span>
                  <span className="val">{meta.fileSizeFormatted || `${(result.fileSize / 1024).toFixed(1)} KB`}</span>
                </div>
              )}
              {meta.resolution && (
                <div className="metadata-chip">
                  <span className="lbl">Resolution:</span>
                  <span className="val">{meta.resolution}</span>
                </div>
              )}
              {meta.durationFormatted && (
                <div className="metadata-chip">
                  <span className="lbl">Duration:</span>
                  <span className="val">{meta.durationFormatted}</span>
                </div>
              )}
              {meta.sampleRate && (
                <div className="metadata-chip">
                  <span className="lbl">Sample Rate:</span>
                  <span className="val">{meta.sampleRate}</span>
                </div>
              )}
              {meta.channels && (
                <div className="metadata-chip">
                  <span className="lbl">Channels:</span>
                  <span className="val">{meta.channels}</span>
                </div>
              )}
              {meta.audioBitrate && (
                <div className="metadata-chip">
                  <span className="lbl">Audio Bitrate:</span>
                  <span className="val">{meta.audioBitrate}</span>
                </div>
              )}
              {meta.videoCodec && (
                <div className="metadata-chip">
                  <span className="lbl">Video Codec:</span>
                  <span className="val">{meta.videoCodec}</span>
                </div>
              )}
              {meta.fps && (
                <div className="metadata-chip">
                  <span className="lbl">FPS:</span>
                  <span className="val">{meta.fps}</span>
                </div>
              )}
              {meta.creationDate && (
                <div className="metadata-chip">
                  <span className="lbl">Created:</span>
                  <span className="val">{new Date(meta.creationDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Detailed Analysis button ── */}
        <div style={{ marginTop: 20 }}>
          <button
            id="detailed-analysis-btn"
            className="btn btn-ghost"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            onClick={() => setShowForensic(true)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="11" y1="8" x2="11" y2="14"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
            Detailed Analysis
          </button>
        </div>
      </div>

      {showForensic && (
        <ForensicModal result={result} onClose={() => setShowForensic(false)} />
      )}
    </>
  );
}
