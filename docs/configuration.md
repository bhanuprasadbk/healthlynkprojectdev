## Environment Files

- `.env` for local development values
- `.env.example` as a template for local setup
- `.env.production.example` as a template for production deployment

## Setup Steps

1. Copy `.env.example` to `.env`.
2. Update values according to your local or deployment environment.
3. Start the app with `npm run dev`.

## Build and Deploy

- Build production assets: `npm run build`
- Preview production build locally: `npm run preview`
- Deploy script (configured in package scripts): `npm run deploy`

## Notes

- Keep secrets out of source control.
- Use example env files to document required keys for the team.
