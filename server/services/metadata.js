const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function formatBytes(bytes) {
  if (!bytes || isNaN(bytes)) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return null;
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  const remS = s % 60;
  return `${m}:${remS < 10 ? '0' : ''}${remS}`;
}

function runFfprobe(filePath) {
  return new Promise((resolve) => {
    const proc = spawn('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath,
    ]);

    let stdout = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.on('error', () => resolve(null));
    proc.on('close', (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(stdout));
        } catch (_) {
          resolve(null);
        }
      } else {
        resolve(null);
      }
    });
  });
}

/**
 * Extracts comprehensive safe metadata from an image, video, or audio file.
 */
async function extractMetadata(filePath, originalName = '', mimeType = '') {
  let stat = null;
  try {
    stat = fs.statSync(filePath);
  } catch (_) {}

  const size = stat?.size || 0;
  const ext = path.extname(originalName || filePath).replace('.', '').toUpperCase();

  const probe = await runFfprobe(filePath);
  const formatData = probe?.format || {};
  const streams = probe?.streams || [];

  const videoStream = streams.find((s) => s.codec_type === 'video');
  const audioStream = streams.find((s) => s.codec_type === 'audio');

  let durationSec = null;
  if (formatData.duration) {
    durationSec = parseFloat(formatData.duration);
  } else if (videoStream?.duration) {
    durationSec = parseFloat(videoStream.duration);
  } else if (audioStream?.duration) {
    durationSec = parseFloat(audioStream.duration);
  }

  let resolution = null;
  if (videoStream?.width && videoStream?.height) {
    resolution = `${videoStream.width} × ${videoStream.height}`;
  }

  const tags = formatData.tags || {};
  const rawCreation = tags.creation_time || tags.date || tags.YEAR || null;
  let creationDate = null;
  if (rawCreation) {
    try {
      const parsed = new Date(rawCreation);
      if (!isNaN(parsed.getTime())) {
        creationDate = parsed.toISOString();
      }
    } catch (_) {}
  }
  if (!creationDate && stat?.birthtime) {
    creationDate = stat.birthtime.toISOString();
  }

  // Format name
  const containerFormat = (formatData.format_name || ext || mimeType.split('/')[1] || 'Unknown')
    .split(',')[0]
    .trim()
    .toUpperCase();

  const metadata = {
    fileName: originalName || path.basename(filePath),
    fileFormat: containerFormat,
    fileSizeBytes: size,
    fileSizeFormatted: formatBytes(size),
    mimeType: mimeType || (formatData.format_name ? `media/${formatData.format_name}` : ''),
    resolution: resolution || null,
    durationSeconds: durationSec ? Math.round(durationSec * 100) / 100 : null,
    durationFormatted: durationSec ? formatDuration(durationSec) : null,
    creationDate: creationDate || null,
  };

  if (videoStream) {
    metadata.videoCodec = videoStream.codec_name ? videoStream.codec_name.toUpperCase() : null;
    if (videoStream.r_frame_rate) {
      const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
      if (den && num) {
        metadata.fps = Math.round(num / den);
      }
    }
  }

  if (audioStream) {
    metadata.audioCodec = audioStream.codec_name ? audioStream.codec_name.toUpperCase() : null;
    metadata.sampleRate = audioStream.sample_rate ? `${audioStream.sample_rate} Hz` : null;
    metadata.channels = audioStream.channels === 1 ? 'Mono (1ch)' : audioStream.channels === 2 ? 'Stereo (2ch)' : audioStream.channels ? `${audioStream.channels} channels` : null;
    if (audioStream.bit_rate) {
      metadata.audioBitrate = `${Math.round(parseInt(audioStream.bit_rate, 10) / 1000)} kbps`;
    }
  }

  return metadata;
}

module.exports = {
  extractMetadata,
  formatBytes,
  formatDuration,
};
