const path = require('path');
const config = require('../config');
const { extractFrames } = require('./videoFrames');

const providers = {
  sightengine: require('./providers/sightengine'),
};

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

function getProvider() {
  const provider = providers[config.detectorProvider];
  if (!provider) {
    throw new Error(`Unknown DETECTOR_PROVIDER "${config.detectorProvider}"`);
  }
  return provider;
}

// Derives REAL / AI-GENERATED label + confidence from a single AI-generated
// probability. pReal is always exactly 1 - pAi, so the two always sum to 100%.
function toVerdict(pAi) {
  const pReal = 1 - pAi;
  const label = pAi >= 0.5 ? 'AI-GENERATED' : 'REAL';
  const confidence = Math.max(pAi, pReal);
  return {
    label,
    confidencePct: Math.round(confidence * 1000) / 10,
    aiProbabilityPct: Math.round(pAi * 1000) / 10,
    realProbabilityPct: Math.round(pReal * 1000) / 10,
  };
}

/**
 * Analyzes a still image (the whole frame - subjects, faces, background,
 * texture/lighting artifacts - the model looks at the full image, not a crop).
 */
async function analyzeImage(filePath) {
  const provider = getProvider();
  const { pAi, raw } = await provider.analyzeImageFile(filePath);
  const verdict = toVerdict(pAi);
  return {
    ...verdict,
    mediaType: 'image',
    framesAnalyzed: 1,
    frameBreakdown: [{
      frame: 0,
      timestampSec: null,
      thumbUrl: null,
      label: verdict.label,
      confidencePct: verdict.confidencePct,
      aiProbabilityPct: verdict.aiProbabilityPct,
      realProbabilityPct: verdict.realProbabilityPct,
    }],
    providerRaw: raw,
  };
}

/**
 * Analyzes a video by sampling multiple evenly-spaced frames across its
 * duration, running each one through the same image model Sightengine
 * exposes for stills, and aggregating the per-frame scores into a single
 * verdict. The sampled frames are saved under uploads/frames_<mediaId>/ so
 * the UI can display the exact frames that were scored.
 */
async function analyzeVideo(filePath, mediaId) {
  const provider = getProvider();
  const frameDir = path.join(UPLOAD_DIR, `frames_${mediaId}`);
  const { frames, cleanup } = await extractFrames(filePath, config.videoSampleFrames, frameDir);

  try {
    const frameBreakdown = [];
    const rawPAiValues = []; // unrounded 0..1 probabilities straight from Sightengine
    for (const frame of frames) {
      const { pAi } = await provider.analyzeImageFile(frame.path);
      rawPAiValues.push(pAi);
      const verdict = toVerdict(pAi);
      frameBreakdown.push({
        frame: frame.index,
        timestampSec: frame.timestampSec,
        thumbUrl: `/media/frames_${mediaId}/${path.basename(frame.path)}`,
        label: verdict.label,
        confidencePct: verdict.confidencePct,
        aiProbabilityPct: verdict.aiProbabilityPct,
        realProbabilityPct: verdict.realProbabilityPct,
      });
    }

    // Overall video score is the plain average of each sampled frame's own,
    // unrounded AI-generated probability - computed directly from
    // Sightengine's actual per-frame responses above, never a fixed number.
    const avgPAi = rawPAiValues.reduce((sum, p) => sum + p, 0) / rawPAiValues.length;
    const verdict = toVerdict(avgPAi);

    return {
      ...verdict,
      mediaType: 'video',
      framesAnalyzed: frameBreakdown.length,
      frameBreakdown,
    };
  } finally {
    cleanup(); // no-op for persistent frame dirs, kept for the temp-dir case
  }
}

const { analyzeAudio } = require('./audioDetector');

const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/bmp']);
const VIDEO_MIME = new Set(['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska', 'video/avi']);
const AUDIO_MIME = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/x-pn-wav',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
  'audio/aac',
  'audio/x-aac',
  'audio/flac',
  'audio/x-flac',
  'audio/ogg',
  'audio/vorbis',
  'audio/webm',
]);

const AUDIO_EXT = new Set(['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg', '.webm']);
const VIDEO_EXT = new Set(['.mp4', '.mov', '.avi', '.mkv', '.webm']);
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp']);

async function analyzeMedia(filePath, mimeType, mediaId, originalName = '') {
  const ext = path.extname(originalName || filePath).toLowerCase();

  // If MIME is generic (e.g. application/octet-stream or video/webm for audio), use extension check
  if (AUDIO_MIME.has(mimeType) || (mimeType.startsWith('audio/') || (AUDIO_EXT.has(ext) && !VIDEO_MIME.has(mimeType)))) {
    return analyzeAudio(filePath, originalName, mimeType);
  }
  if (IMAGE_MIME.has(mimeType) || IMAGE_EXT.has(ext)) {
    return analyzeImage(filePath);
  }
  if (VIDEO_MIME.has(mimeType) || VIDEO_EXT.has(ext)) {
    return analyzeVideo(filePath, mediaId);
  }

  const err = new Error(`Unsupported file type: ${mimeType || ext}`);
  err.code = 'UNSUPPORTED_TYPE';
  throw err;
}

module.exports = { analyzeMedia, analyzeImage, analyzeVideo, analyzeAudio };

