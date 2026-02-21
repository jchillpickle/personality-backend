[README.md](https://github.com/user-attachments/files/25458956/README.md)
# Personality Assessment Backend

Node/Express backend for the custom personality screener.

## Endpoints

- `GET /health`
- `POST /api/submissions`
- `GET /api/submissions?limit=50&testVersion=personality-v1-52q` (requires `x-api-key`)
- `GET /api/admin/submissions/download?format=csv&limit=500&testVersion=personality-v1-52q` (requires `x-api-key`)

## Submission payload (important fields)

- `candidateName` (required)
- `candidateEmail` (required)
- `answers` (required object of `questionId -> 1..5`)
- `knownAssessments` (optional baseline for calibration)
  - `mbti` (example: `ENTJ`)
  - `disc` (example: `D` or `SI blend`)
  - `strengths` (array or comma-separated list)
  - `workingGenius` (array or comma-separated list)

## Local run

```bash
cd backend
cp .env.example .env
npm install
npm start
```

## Required env vars

- `API_KEY`
- `ALLOWED_ORIGIN`
- `EMAIL_FROM`
- `EMAIL_TO`
- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_IMPERSONATED_USER`

## Optional env vars

- `MIN_DURATION_MINUTES` (default `8`)
- `MAX_DURATION_MINUTES` (default `180`)
- `REQUIRE_SUBMISSION_API_KEY` (default `false`)
- `RATE_WINDOW_MS` (default `600000`)
- `RATE_MAX_SUBMISSIONS` (default `30`)
- `RATE_MAX_ADMIN` (default `120`, also supports `RATE_MAX_FEEDBACK`)

## Notes

- This is an internal profile inspired by MBTI, DISC, CliftonStrengths, and Working Genius.
- It is not an official licensed diagnostic instrument.
