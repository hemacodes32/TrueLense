const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args);
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('error', (e) => {
      if (e.code === 'ENOENT') {
        reject(new Error(
          `"${cmd}" was not found on this machine. Install ffmpeg and make sure it is on your PATH ` +
          `(this is required to sample frames from uploaded videos).`
        ));
      } else {
        reject(e);
      }
    });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}: ${stderr.slice(-500)}`));
    });
  });
}

async function getDurationSeconds(videoPath) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      videoPath,
    ]);
    let out = '';
    let err = '';
    proc.stdout.on('data', (d) => { out += d.toString(); });
    proc.stderr.on('data', (d) => { err += d.toString(); });
    proc.on('error', (e) => {
      if (e.code === 'ENOENT') {
        reject(new Error('"ffprobe" was not found on this machine. Install ffmpeg (which includes ffprobe).'));
      } else {
        reject(e);
      }
    });
    proc.on('close', () => {
      const val = parseFloat(out.trim());
      resolve(Number.isFinite(val) && val > 0 ? val : 5);
    });
  });
}

/**
 * Extracts `count` evenly-spaced frames from a video using ffmpeg/ffprobe.
 *
 * If `outputDir` is provided, frames are written there and kept on disk
 * (used so the exact frames Sightengine scored can be displayed in the UI
 * afterwards). If omitted, frames are written to a throwaway temp folder
 * next to the video and a cleanup() is returned to remove them.
 *
 * Returns { frames, cleanup } where each frame is
 * { index, path, timestampSec }, in the same order they were sampled.
 */
async function extractFrames(videoPath, count, outputDir = null) {
  const duration = await getDurationSeconds(videoPath);

  const persistent = Boolean(outputDir);
  const dir = outputDir || path.join(path.dirname(videoPath), `frames_tmp_${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });

  const frames = [];
  const margin = duration * 0.05; // avoid pure black first/last frame
  const usableSpan = Math.max(duration - margin * 2, 0.1);

  for (let i = 0; i < count; i++) {
    const t = margin + (usableSpan * (i / Math.max(count - 1, 1)));
    const outPath = path.join(dir, `frame_${String(i).padStart(3, '0')}.jpg`);
    await run('ffmpeg', [
      '-ss', t.toFixed(2),
      '-i', videoPath,
      '-frames:v', '1',
      '-q:v', '3',
      '-y',
      outPath,
    ]);
    if (fs.existsSync(outPath)) {
      frames.push({ index: i, path: outPath, timestampSec: Math.round(t * 100) / 100 });
    }
  }

  if (frames.length === 0) {
    throw new Error('Could not extract any frames from this video.');
  }

  const cleanup = () => {
    if (persistent) return; // caller owns persistent frames, don't delete them
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (_) { /* best effort */ }
  };

  return { frames, cleanup };
}

module.exports = { extractFrames };
