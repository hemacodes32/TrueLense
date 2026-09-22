import { useState } from 'react';
import { deleteHistoryItem, downloadMyDataPdf } from '../api';

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function HistoryDashboard({ items, onDeleted }) {
  const [deletingId, setDeletingId] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [expandedMetaId, setExpandedMetaId] = useState(null);

  const realCount = items.filter((i) => i.label === 'REAL').length;
  const aiCount = items.filter((i) => i.label === 'AI-GENERATED').length;

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await deleteHistoryItem(id);
      onDeleted(id);
    } catch (e) {
      alert(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      await downloadMyDataPdf();
    } catch (e) {
      alert(e.message || 'Failed to download PDF report.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const toggleMeta = (id) => {
    setExpandedMetaId((prev) => (prev === id ? null : id));
  };

  return (
    <div>
      <div className="stats-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', gap: 12, flex: 1, flexWrap: 'wrap' }}>
          <div className="stat-card">
            <div className="num">{items.length}</div>
            <div className="lbl">Total analyzed</div>
          </div>
          <div className="stat-card real">
            <div className="num">{realCount}</div>
            <div className="lbl">Marked real</div>
          </div>
          <div className="stat-card ai">
            <div className="num">{aiCount}</div>
            <div className="lbl">Marked AI-generated</div>
          </div>
        </div>

        <div>
          <button
            className="btn btn-ghost"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf || items.length === 0}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {downloadingPdf ? 'Generating PDF…' : 'Download My Data (PDF)'}
          </button>
        </div>
      </div>

      <div className="history-list">
        {items.length === 0 && (
          <div className="history-empty">
            <h3>Nothing analyzed yet</h3>
            <p>Files you analyze will show up here.</p>
          </div>
        )}

        {items.map((item) => {
          const isReal = item.label === 'REAL';
          const isAudio = item.mediaType === 'audio';
          const isVideo = item.mediaType === 'video';
          const meta = item.metadata || {};
          const isMetaExpanded = expandedMetaId === item.id;

          return (
            <div key={item.id} style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="history-row">
                <div className="history-thumb">
                  {isAudio ? (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(99, 102, 241, 0.1)',
                      color: '#818CF8',
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18V5l12-2v13"/>
                        <circle cx="6" cy="18" r="3"/>
                        <circle cx="18" cy="16" r="3"/>
                      </svg>
                    </div>
                  ) : isVideo ? (
                    <video src={item.fileUrl} muted preload="metadata" playsInline />
                  ) : (
                    <img src={item.fileUrl} alt="" />
                  )}
                </div>

                <div className="history-info">
                  <div className="name" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{item.originalName}</span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--text-tertiary)',
                    }}>
                      {item.mediaType || 'IMAGE'}
                    </span>
                  </div>
                  <div className="sub" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {isVideo && `${item.framesAnalyzed} frames · `}
                    {meta.durationFormatted && `${meta.durationFormatted} · `}
                    {meta.resolution && `${meta.resolution} · `}
                    <span>{timeAgo(item.analyzedAt)}</span>
                    <button
                      type="button"
                      onClick={() => toggleMeta(item.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-progress)',
                        fontSize: 11,
                        cursor: 'pointer',
                        padding: '0 4px',
                        textDecoration: 'underline',
                      }}
                    >
                      {isMetaExpanded ? 'Hide metadata' : 'View metadata'}
                    </button>
                  </div>
                </div>

                <span className={`history-badge ${isReal ? 'real' : 'ai'}`}>{item.label}</span>
                <span className="history-confidence">{(item.confidencePct || 0).toFixed(1)}%</span>
                
                <button
                  className="history-delete"
                  title="Delete record"
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M4 7H20M9 7V5C9 4.4 9.4 4 10 4H14C14.6 4 15 4.4 15 5V7M18 7L17.3 19C17.2 19.6 16.7 20 16.1 20H7.9C7.3 20 6.8 19.6 6.7 19L6 7"
                      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>

              {isMetaExpanded && (
                <div style={{
                  padding: '10px 16px 14px 68px',
                  background: 'var(--bg-surface-2)',
                  borderBottom: '1px solid var(--border-soft)',
                  fontSize: 11.5,
                  display: 'flex',
                  gap: 8,
                  flexWrap: 'wrap',
                }}>
                  {meta.fileFormat && <span className="metadata-chip"><span className="lbl">Format:</span> <span className="val">{meta.fileFormat}</span></span>}
                  {meta.fileSizeFormatted && <span className="metadata-chip"><span className="lbl">Size:</span> <span className="val">{meta.fileSizeFormatted}</span></span>}
                  {meta.resolution && <span className="metadata-chip"><span className="lbl">Resolution:</span> <span className="val">{meta.resolution}</span></span>}
                  {meta.durationFormatted && <span className="metadata-chip"><span className="lbl">Duration:</span> <span className="val">{meta.durationFormatted}</span></span>}
                  {meta.sampleRate && <span className="metadata-chip"><span className="lbl">Sample Rate:</span> <span className="val">{meta.sampleRate}</span></span>}
                  {meta.channels && <span className="metadata-chip"><span className="lbl">Channels:</span> <span className="val">{meta.channels}</span></span>}
                  {meta.audioBitrate && <span className="metadata-chip"><span className="lbl">Bitrate:</span> <span className="val">{meta.audioBitrate}</span></span>}
                  {meta.videoCodec && <span className="metadata-chip"><span className="lbl">Codec:</span> <span className="val">{meta.videoCodec}</span></span>}
                  {meta.creationDate && <span className="metadata-chip"><span className="lbl">Created:</span> <span className="val">{new Date(meta.creationDate).toLocaleString()}</span></span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
