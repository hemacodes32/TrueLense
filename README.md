# TrueLense

TrueLense classifies an uploaded photo or video as **REAL** or **AI-GENERATED**,
using a real pre-trained AI-detection model called over an API — not filename
checks, not hard-coded results.

- **Images** are sent whole (subjects, faces, and background together) to the
  detection model.
- **Videos** are sampled at several evenly-spaced frames across their full
  duration (via `ffmpeg`); each frame is scored the same way an image is, and
  the scores are averaged into one verdict.
- Every result returns a label, a confidence percentage, and both raw
  probabilities (`REAL %` and `AI-GENERATED %`) — there is no separate
  "deepfake" category, by design.

## How detection works

The backend calls **[Sightengine](https://sightengine.com)'s `genai` model**,
a pre-trained classifier trained to separate camera-captured media from
images produced by diffusion models, GANs, and other generators (e.g.
Midjourney-, DALL·E-, Stable Diffusion-, and similar-style output). It looks
at the whole frame — not just faces — so real human photos and videos are
scored the same way as any other image, with no special-casing.

The integration is intentionally provider-agnostic
(`server/services/providers/`), so you can swap in another detector (Hive,
Reality Defender, a self-hosted model, etc.) by adding a new provider file
with the same `analyzeImageFile(path) -> { pAi, pReal }` shape and pointing
`DETECTOR_PROVIDER` at it.

**Be honest with yourself about limits:** no public detector is perfect. As
generators improve, some AI images will score as REAL and some real photos
(especially heavily edited or unusually processed ones) will score as
AI-GENERATED. Confidence numbers reflect the model's own certainty, not a
guarantee.

## Project structure

```
truelense/
  server/                 Node/Express API
    routes/analyze.js      POST /api/analyze  (upload + run detector)
    routes/history.js      GET/DELETE /api/history
    services/detector.js   image vs video orchestration, aggregation
    services/providers/    pluggable detection providers (Sightengine)
    services/videoFrames.js  ffmpeg frame sampling
    services/historyStore.js JSON-file history storage
    uploads/                saved media files
  client/                 React (Vite) frontend, dark theme
    src/components/        UploadArea, AnalyzePanel, ResultCard,
                            ProbabilityBars, HistoryDashboard, Sidebar
```

## Setup

### Requirements

- Node.js 18+
- `ffmpeg` installed and on your PATH (used to sample video frames) —
  `ffmpeg -version` should work in your terminal
- A free [Sightengine](https://sightengine.com) account (their trial quota is
  enough to try this project) for `API_USER` / `API_SECRET`

### 1. Backend

```bash
cd server
npm install
cp .env.example .env
# edit .env and paste in your SIGHTENGINE_API_USER / SIGHTENGINE_API_SECRET
npm start
```

The API runs on `http://localhost:5000`. If the credentials aren't set, the
server still starts but `/api/analyze` will return a clear error explaining
what's missing (no fake/hard-coded fallback result is ever returned).

### 2. Frontend

In a second terminal:

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`. The dev server proxies `/api` and `/media`
requests to the backend on port 5000.

## Notes on the aggregation logic

- **Image:** one call to the model → `pAi` (probability AI-generated),
  `pReal = 1 - pAi`. Label is whichever is ≥ 50%.
- **Video:** `VIDEO_SAMPLE_FRAMES` (default 8) frames are pulled at evenly
  spaced timestamps across the clip (skipping the very first/last few
  percent to avoid black frames), each scored independently, then averaged.
  The per-frame breakdown is included in the API response
  (`frameBreakdown`) if you want to surface it later.

## Customizing

- Change `VIDEO_SAMPLE_FRAMES` in `server/.env` to sample more/fewer frames
  (more frames = slower but more thorough).
- Swap detection providers by adding a file under
  `server/services/providers/` and setting `DETECTOR_PROVIDER` in `.env`.
- History is stored in SQLite (`server/storage/truelense.db`) isolated per authenticated user, plus uploaded media in `server/uploads/`.
- Deleting an item or wiping data cleans both database records and disk storage.

## Authentication & Administration

- **User Accounts**: Users can register with Full Name, Email, and Password. New registrations automatically receive role `"user"`.
- **User Settings**: Profile updating, password changing, and appearance customization (Dark Mode / Light Mode).
- **Data Privacy Permissions**:
  - **Save Analysis History**: Toggle ON/OFF to control whether future analyses are recorded.
  - **Store Uploaded Media**: Toggle ON/OFF. When OFF, uploaded media and sampled video frames are immediately purged from the server post-analysis.
  - **Download My Data**: Export personal history and profile data as JSON (never containing passwords or hashes).
  - **Delete All My Data**: Permanently deletes all personal analysis records and uploaded files from the disk while keeping the account active.
- **Admin Dashboard**:
  - Accessible only to users with role `"admin"` (enforced on both UI and backend with `403 Forbidden` protection).
  - Inspect total user metrics, search registered members, and activate or suspend accounts.
  - **Privacy Enforcement**: Admins cannot view user-uploaded media files, private analysis results, passwords, or encryption hashes.
- **Admin Seeding**:
  - Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME` in `server/.env`.
  - Run `npm run seed:admin` or start the server to automatically initialize the primary admin account.

