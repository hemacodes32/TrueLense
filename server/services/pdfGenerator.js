const PDFDocument = require('pdfkit');

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (_) {
    return iso;
  }
}

function formatBytes(bytes) {
  if (!bytes || isNaN(bytes)) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Generates an encrypted/isolated PDF report containing strictly the user's data.
 * @param {Object} user - User record (id, name, email, created_at)
 * @param {Array} analyses - Array of analysis records for this user
 * @param {WritableStream} outputStream - Response stream to pipe PDF into
 */
function generateUserPdfReport(user, analyses, outputStream) {
  const doc = new PDFDocument({
    margin: 40,
    size: 'A4',
    bufferPages: true,
  });

  doc.pipe(outputStream);

  // Color palette
  const primaryColor = '#4F46E5'; // Indigo
  const textDark = '#111827';
  const textGray = '#4B5563';
  const textLight = '#9CA3AF';
  const realColor = '#059669'; // Green
  const aiColor = '#DC2626'; // Red
  const cardBg = '#F3F4F6';
  const borderCol = '#E5E7EB';

  // --- Header ---
  doc.rect(40, 40, doc.page.width - 80, 56).fill('#1E1B4B');
  
  doc.fillColor('#FFFFFF')
     .fontSize(20)
     .font('Helvetica-Bold')
     .text('TrueLense', 55, 52);

  doc.fontSize(9)
     .font('Helvetica')
     .fillColor('#C7D2FE')
     .text('AI MEDIA AUTHENTICITY & DETECTION REPORT', 55, 75);

  doc.fillColor('#A5B4FC')
     .fontSize(8)
     .text(`EXPORTED: ${formatDate(new Date().toISOString())}`, doc.page.width - 240, 62, { width: 185, align: 'right' });

  doc.y = 112;

  // --- User Account Info Card ---
  const userBoxY = doc.y;
  doc.rect(40, userBoxY, doc.page.width - 80, 64)
     .fillAndStroke(cardBg, borderCol);

  doc.fillColor(textDark)
     .fontSize(11)
     .font('Helvetica-Bold')
     .text('USER ACCOUNT & DATA ISOLATION RECORD', 55, userBoxY + 12);

  doc.fontSize(9)
     .font('Helvetica')
     .fillColor(textGray)
     .text(`Name: `, 55, userBoxY + 30, { continued: true })
     .fillColor(textDark)
     .font('Helvetica-Bold')
     .text(user.name || 'User', { continued: true })
     .font('Helvetica')
     .fillColor(textGray)
     .text(`    Email: `, { continued: true })
     .fillColor(textDark)
     .font('Helvetica-Bold')
     .text(user.email, { continued: true })
     .font('Helvetica')
     .fillColor(textGray)
     .text(`    Member Since: `, { continued: true })
     .fillColor(textDark)
     .text(formatDate(user.created_at));

  doc.fontSize(8)
     .font('Helvetica-Oblique')
     .fillColor(textLight)
     .text('Security Notice: This document contains only personal analysis records belonging to this account. Passwords and keys are never exported.', 55, userBoxY + 48);

  doc.y = userBoxY + 76;

  // --- Summary Metrics ---
  const totalCount = analyses.length;
  const realCount = analyses.filter((a) => a.label === 'REAL').length;
  const aiCount = analyses.filter((a) => a.label === 'AI-GENERATED').length;
  const avgConf = totalCount > 0
    ? (analyses.reduce((sum, a) => sum + (a.confidencePct || 0), 0) / totalCount).toFixed(1)
    : 0;

  const cardW = (doc.page.width - 80 - 30) / 4;
  const statsY = doc.y;
  const statsH = 46;

  const stats = [
    { lbl: 'Total Analyzed', val: totalCount, color: primaryColor },
    { lbl: 'Marked Real', val: realCount, color: realColor },
    { lbl: 'Marked AI-Generated', val: aiCount, color: aiColor },
    { lbl: 'Avg Confidence', val: `${avgConf}%`, color: textDark },
  ];

  stats.forEach((s, idx) => {
    const x = 40 + idx * (cardW + 10);
    doc.rect(x, statsY, cardW, statsH).fillAndStroke('#FFFFFF', borderCol);
    doc.fillColor(s.color).font('Helvetica-Bold').fontSize(15).text(String(s.val), x + 10, statsY + 8);
    doc.fillColor(textGray).font('Helvetica').fontSize(8).text(s.lbl, x + 10, statsY + 28);
  });

  doc.y = statsY + statsH + 20;

  // --- Analysis Records Section ---
  doc.fillColor(textDark)
     .font('Helvetica-Bold')
     .fontSize(13)
     .text(`Analysis History (${totalCount} Record${totalCount === 1 ? '' : 's'})`);

  doc.moveDown(0.5);

  if (totalCount === 0) {
    doc.rect(40, doc.y, doc.page.width - 80, 50).fillAndStroke(cardBg, borderCol);
    doc.fillColor(textGray).font('Helvetica').fontSize(10).text('No analysis records saved to this account yet.', 55, doc.y + 18);
  } else {
    analyses.forEach((item, index) => {
      // Check if we need a new page
      if (doc.y > doc.page.height - 130) {
        doc.addPage();
        doc.y = 40;
      }

      const itemY = doc.y;
      const isReal = item.label === 'REAL';
      const itemH = 76;

      doc.rect(40, itemY, doc.page.width - 80, itemH)
         .fillAndStroke('#FFFFFF', borderCol);

      // Left verdict color stripe
      doc.rect(40, itemY, 5, itemH).fill(isReal ? realColor : aiColor);

      // Header row inside card: File name + Media Type + Verdict Pill
      const mediaTypeUpper = (item.mediaType || 'IMAGE').toUpperCase();
      doc.fillColor(textDark)
         .font('Helvetica-Bold')
         .fontSize(10)
         .text(`${index + 1}. ${item.originalName}`, 55, itemY + 10, { width: doc.page.width - 240, ellipsis: true });

      // Badge on right
      const badgeW = 100;
      const badgeX = doc.page.width - 40 - badgeW - 10;
      doc.rect(badgeX, itemY + 8, badgeW, 18).fill(isReal ? '#ECFDF5' : '#FEF2F2');
      doc.fillColor(isReal ? realColor : aiColor)
         .font('Helvetica-Bold')
         .fontSize(8)
         .text(`${item.label} (${(item.confidencePct || 0).toFixed(1)}%)`, badgeX, itemY + 13, { width: badgeW, align: 'center' });

      // Detail line 1: Date, Type, Size
      const sizeStr = item.fileSize ? formatBytes(item.fileSize) : (item.metadata?.fileSizeFormatted || '—');
      doc.fillColor(textGray)
         .font('Helvetica')
         .fontSize(8)
         .text(`Type: ${mediaTypeUpper}   |   Size: ${sizeStr}   |   Analyzed: ${formatDate(item.analyzedAt)}`, 55, itemY + 28);

      // Detail line 2: Metadata breakdown
      const meta = item.metadata || {};
      const metaParts = [];
      if (meta.fileFormat) metaParts.push(`Format: ${meta.fileFormat}`);
      if (meta.resolution) metaParts.push(`Resolution: ${meta.resolution}`);
      if (meta.durationFormatted) metaParts.push(`Duration: ${meta.durationFormatted}`);
      if (meta.sampleRate) metaParts.push(`Sample Rate: ${meta.sampleRate}`);
      if (meta.channels) metaParts.push(`Channels: ${meta.channels}`);
      if (meta.fps) metaParts.push(`FPS: ${meta.fps}`);
      if (item.framesAnalyzed > 1) metaParts.push(`Sampled Frames: ${item.framesAnalyzed}`);

      const metaText = metaParts.length > 0 ? metaParts.join('  •  ') : 'Standard media container';
      doc.fillColor('#374151')
         .font('Helvetica-Bold')
         .fontSize(8)
         .text('Metadata: ', 55, itemY + 44, { continued: true })
         .font('Helvetica')
         .fillColor(textGray)
         .text(metaText, { width: doc.page.width - 120 });

      // Probabilities breakdown
      doc.fillColor(textLight)
         .fontSize(7.5)
         .text(`Confidence Breakdown: Real: ${(item.realProbabilityPct || 0).toFixed(1)}%   |   AI: ${(item.aiProbabilityPct || 0).toFixed(1)}%   |   ID: ${item.id}`, 55, itemY + 58);

      doc.y = itemY + itemH + 10;
    });
  }

  // --- Page Numbering Footers ---
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.fillColor(textLight)
       .font('Helvetica')
       .fontSize(8)
       .text(
         `TrueLense Security Platform  •  Account: ${user.email}  •  Page ${i + 1} of ${pages.count}`,
         40,
         doc.page.height - 30,
         { width: doc.page.width - 80, align: 'center' }
       );
  }

  doc.end();
}

module.exports = {
  generateUserPdfReport,
};
