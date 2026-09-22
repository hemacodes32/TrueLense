const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const config = require('../../config');

const ENDPOINT = 'https://api.sightengine.com/1.0/check.json';

/**
 * Analyzes a single image file with Sightengine's "genai" model.
 * This model classifies the FULL image (subjects, faces, background, textures,
 * lighting artifacts, etc.) as human-made or AI-generated - it is a real
 * pre-trained model call, not a heuristic or filename check.
 *
 * @param {string} filePath - path to an image file on disk (jpg/png/webp)
 * @returns {Promise<{pAi: number, pReal: number, raw: object}>}
 */
async function analyzeImageFile(filePath) {
  const { apiUser, apiSecret } = config.sightengine;

  if (!apiUser || !apiSecret || apiUser === 'your_api_user_here') {
    const err = new Error(
      'Sightengine API credentials are not configured. Set SIGHTENGINE_API_USER and ' +
      'SIGHTENGINE_API_SECRET in server/.env (see server/.env.example).'
    );
    err.code = 'MISSING_CREDENTIALS';
    throw err;
  }

  const form = new FormData();
  form.append('media', fs.createReadStream(filePath));
  form.append('models', 'genai');
  form.append('api_user', apiUser);
  form.append('api_secret', apiSecret);

  let response;
  try {
    response = await axios.post(ENDPOINT, form, {
      headers: form.getHeaders(),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 30000,
    });
  } catch (e) {
    const detail = e.response?.data?.error?.message || e.message;
    const err = new Error(`Detection provider request failed: ${detail}`);
    err.code = 'PROVIDER_REQUEST_FAILED';
    throw err;
  }

  const data = response.data;

  if (data.status !== 'success') {
    const detail = data?.error?.message || 'Unknown provider error';
    const err = new Error(`Detection provider returned an error: ${detail}`);
    err.code = 'PROVIDER_ERROR';
    throw err;
  }

  // type.ai_generated is a 0..1 probability that the image is AI generated.
  const pAi = typeof data.type?.ai_generated === 'number' ? data.type.ai_generated : null;

  if (pAi === null) {
    const err = new Error('Detection provider response did not include an ai_generated score.');
    err.code = 'PROVIDER_BAD_RESPONSE';
    throw err;
  }

  return {
    pAi,
    pReal: 1 - pAi,
    raw: data,
  };
}

module.exports = { analyzeImageFile };
