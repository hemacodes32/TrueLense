const path = require('path');
const { spawn } = require('child_process');
const { extractMetadata } = require('./metadata');

const CLASSIFIER_PATH = path.join(__dirname, 'audio_classifier.py');

/**
 * Runs the pre-trained Python acoustic AI classifier on an audio file.
 */
function runAcousticClassifier(filePath) {
  return new Promise((resolve, reject) => {
    const py = spawn('python', [CLASSIFIER_PATH, filePath]);
    let stdout = '';
    let stderr = '';

    py.stdout.on('data', (d) => { stdout += d.toString(); });
    py.stderr.on('data', (d) => { stderr += d.toString(); });

    py.on('error', (err) => {
      reject(new Error(`Failed to run audio classifier: ${err.message}`));
    });

    py.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Audio classifier failed (code ${code}): ${stderr || stdout}`));
      }

      try {
        const result = JSON.parse(stdout.trim());
        if (result.error) {
          return reject(new Error(result.error));
        }
        resolve(result);
      } catch (err) {
        reject(new Error(`Invalid response from audio classifier: ${stdout.slice(0, 200)}`));
      }
    });
  });
}

/**
 * Analyzes an uploaded audio file (MP3, WAV, M4A, AAC, FLAC, OGG, WEBM)
 * for AI generation/synthesis markers and extracts audio metadata.
 */
async function analyzeAudio(filePath, originalName, mimeType) {
  const [classification, metadata] = await Promise.all([
    runAcousticClassifier(filePath),
    extractMetadata(filePath, originalName, mimeType),
  ]);

  const pAi = classification.aiProbabilityPct / 100.0;
  const pReal = classification.realProbabilityPct / 100.0;
  const label = classification.label || (pAi >= 0.5 ? 'AI-GENERATED' : 'REAL');
  const confidence = Math.max(classification.confidencePct, 50.0);

  return {
    label,
    confidencePct: Math.round(confidence * 10) / 10,
    aiProbabilityPct: Math.round(pAi * 1000) / 10,
    realProbabilityPct: Math.round(pReal * 1000) / 10,
    mediaType: 'audio',
    framesAnalyzed: 1,
    frameBreakdown: [],
    metadata,
    acousticFeatures: classification.features || {},
  };
}

module.exports = {
  analyzeAudio,
};
