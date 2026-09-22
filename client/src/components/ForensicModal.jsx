import { useState } from "react";
import { downloadMyDataPdf } from "../api";
import VideoTimeline from "./VideoTimeline";
import "./forensic.css";

function Section({ title, children }) {
  return (
    <div className="fr-section">
      <div className="fr-section-title">{title}</div>
      {children}
    </div>
  );
}

function MetaRow({ label, value }) {
  if (value == null || value === "") return null;
  return (
    <div className="fr-meta-row">
      <span className="fr-meta-label">{label}</span>
      <span className="fr-meta-value">{value}</span>
    </div>
  );
}

function AudioWaveform() {
  // Visual waveform representation (indicative — classifier does not return sample data)
  const bars = Array.from({ length: 48 }, (_, i) =>
    Math.max(0.08, Math.min(1, 0.3 + (Math.sin(i * 0.7) * 0.5 + 0.5) * 0.7))
  );
  return (
    <div className="fr-waveform" title="Visual waveform representation">
      {bars.map((h, i) => (
        <div key={i} className="fr-wave-bar" style={{ height: Math.round(h * 100) + "%" }} />
      ))}
    </div>
  );
}

export default function ForensicModal({ result, onClose }) {
  const [dlPdf, setDlPdf] = useState(false);
  if (!result) return null;
  const isReal = result.label === "REAL";
  const isVideo = result.mediaType === "video";
  const isAudio = result.mediaType === "audio";
  const meta = result.metadata || {};
  const analyzedAt = result.analyzedAt
    ? new Date(result.analyzedAt).toLocaleString()
    : new Date().toLocaleString();
  const hasFrames = isVideo && Array.isArray(result.frameBreakdown) && result.frameBreakdown.length > 0;

  const handleDownload = async () => {
    setDlPdf(true);
    try {
      await downloadMyDataPdf();
    } catch (e) {
      alert(e.message || "Download failed.");
    } finally {
      setDlPdf(false);
    }
  };

  return (
    <div className="fr-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="fr-modal" role="dialog" aria-label="Forensic Report">
        {/* ── Header ── */}
        <div className="fr-header">
          <div className="fr-header-brand">
            <span className="fr-brand-dot" />
            <span className="fr-header-title">TrueLense Forensic Report</span>
          </div>
          <div className="fr-header-actions">
            <button
              className="btn btn-primary"
              onClick={handleDownload}
              disabled={dlPdf}
              id="forensic-download-btn"
              style={{ fontSize: 13, padding: "7px 14px", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              {dlPdf ? "Generating…" : "Download Full Report"}
            </button>
            <button className="fr-close-btn" onClick={onClose} aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="fr-body">

          {/* Detection Result */}
          <Section title="Detection Result">
            <div className={"fr-verdict " + (isReal ? "real" : "ai")}>
              <span className={"fr-verdict-dot " + (isReal ? "real" : "ai")} />
              <span className="fr-verdict-label">{result.label}</span>
              <span className="fr-verdict-conf">{(result.confidencePct || 0).toFixed(1)}% confidence</span>
            </div>
            <div className="fr-bars">
              <div className="fr-bar-row">
                <span className="fr-bar-lbl">REAL</span>
                <div className="fr-bar-track"><div className="fr-bar-fill real" style={{ width: (result.realProbabilityPct || 0) + "%" }} /></div>
                <span className="fr-bar-pct">{(result.realProbabilityPct || 0).toFixed(1)}%</span>
              </div>
              <div className="fr-bar-row">
                <span className="fr-bar-lbl">AI</span>
                <div className="fr-bar-track"><div className="fr-bar-fill ai" style={{ width: (result.aiProbabilityPct || 0) + "%" }} /></div>
                <span className="fr-bar-pct">{(result.aiProbabilityPct || 0).toFixed(1)}%</span>
              </div>
            </div>
          </Section>

          {/* File Information */}
          <Section title="File Information">
            <MetaRow label="File Name" value={result.originalName} />
            <MetaRow label="Media Type" value={(result.mediaType || "image").toUpperCase()} />
            <MetaRow label="Format" value={meta.fileFormat} />
            <MetaRow
              label="File Size"
              value={meta.fileSizeFormatted || (result.fileSize ? (result.fileSize / 1024).toFixed(1) + " KB" : null)}
            />
            <MetaRow label="Resolution" value={meta.resolution} />
            <MetaRow label="Duration" value={meta.durationFormatted} />
          </Section>

          {/* Audio Information */}
          {isAudio && (
            <Section title="Audio Information">
              <MetaRow label="Sample Rate" value={meta.sampleRate} />
              <MetaRow label="Channels" value={meta.channels} />
              <MetaRow label="Bitrate" value={meta.audioBitrate} />
              <MetaRow label="Duration" value={meta.durationFormatted} />
              <MetaRow label="Format" value={meta.fileFormat} />
              <MetaRow
                label="File Size"
                value={meta.fileSizeFormatted || (result.fileSize ? (result.fileSize / 1024).toFixed(1) + " KB" : null)}
              />
              <div style={{ marginTop: 16 }}>
                <div className="fr-section-sub">Waveform (visual representation)</div>
                <AudioWaveform />
              </div>
            </Section>
          )}

          {/* Video Frame Analysis + Timeline */}
          {isVideo && hasFrames && (
            <Section title={`Frame Analysis — ${result.framesAnalyzed} frames sampled`}>
              <VideoTimeline frames={result.frameBreakdown} />
            </Section>
          )}

          {/* Technical Metadata */}
          {(meta.videoCodec || meta.fps || meta.creationDate) && (
            <Section title="Technical Metadata">
              <MetaRow label="Video Codec" value={meta.videoCodec} />
              <MetaRow label="Frame Rate" value={meta.fps ? meta.fps + " FPS" : null} />
              <MetaRow label="Media Created" value={meta.creationDate ? new Date(meta.creationDate).toLocaleString() : null} />
            </Section>
          )}

          {/* Detection Evidence */}
          <Section title="Detection Evidence">
            <p className="fr-evidence-text">
              {isAudio
                ? "Acoustic neural vocoder artifacts, spectral flatness dynamics, and frequency roll-off patterns were analyzed to determine authenticity."
                : isVideo
                ? `${result.framesAnalyzed} frames were sampled at even intervals and each independently scored using the Sightengine AI detection model. Frame scores were averaged for the final verdict.`
                : "The full image including subjects, background, textures, and noise distribution was analyzed using the Sightengine AI detection model. Pixel-level artifacts and generative model signatures were evaluated."}
            </p>
          </Section>

          {/* Analysis Summary */}
          <Section title="Analysis Summary">
            <p className="fr-evidence-text">
              {"TrueLense analyzed \"" + (result.originalName || "the file") + "\" and determined it is " + result.label + " with " + (result.confidencePct || 0).toFixed(1) + "% confidence. "}
              {isReal
                ? "No significant AI generation artifacts were detected."
                : "AI generation artifacts were detected. The file shows characteristics consistent with synthetic generation."}
            </p>
            <MetaRow label="Analysis Date/Time" value={analyzedAt} />
            <MetaRow label="Detection Provider" value={isAudio ? "TrueLense Acoustic Classifier" : "Sightengine AI Detector"} />
            {result.id && <MetaRow label="Analysis ID" value={result.id} />}
          </Section>

        </div>
      </div>
    </div>
  );
}
