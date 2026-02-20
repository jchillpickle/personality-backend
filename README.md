# Personality Assessment Backend

Node/Express backend for the custom personality screener.

## Endpoints

- `GET /health`
- `POST /api/submissions`
- `GET /api/submissions?limit=50&testVersion=personality-v1-52q` (requires `x-api-key`)
- `GET /api/admin/submissions/download?format=csv&limit=500&testVersion=personality-v1-52q` (requires `x-api-key`)

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

## Notes

- This is an internal profile inspired by MBTI, DISC, CliftonStrengths, and Working Genius.
- It is not an official licensed diagnostic instrument.
