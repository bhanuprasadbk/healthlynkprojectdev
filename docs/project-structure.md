# Project Structure

## Important Directories

- `src/pages` - route-level page components
- `src/components` - reusable UI components
- `src/contexts` - app-level state providers
- `src/routes` - route constants and flow helpers
- `src/services` - external service and mapping logic
- `docs` - markdown documentation rendered to end users

## Key Entry Files

- `src/main.tsx` - app bootstrap
- `src/App.tsx` - router and top-level providers
- `src/index.css` - global styles

## Documentation Routing

The markdown viewer is available at `/docs/*` and automatically discovers all markdown files under `docs/`.
