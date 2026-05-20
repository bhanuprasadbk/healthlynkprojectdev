import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/** Team file named `env` (no dot) — merge into process.env before loadEnv. */
function loadLegacyEnvFile() {
  const legacyPath = path.resolve(process.cwd(), 'env')
  if (!fs.existsSync(legacyPath)) return
  for (const line of fs.readFileSync(legacyPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (key && process.env[key] === undefined) process.env[key] = value
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  loadLegacyEnvFile()
  const env = loadEnv(mode, process.cwd(), '')
  if (mode === 'development') {
    const apiBase = (env.VITE_API_BASE_URL || '').trim()
    if (!apiBase.startsWith('/') || apiBase.includes('azurewebsites.net')) {
      env.VITE_API_BASE_URL = '/api'
    }
  }
  // Dev proxy target: production SWA-linked API (same backend as healthlynk.ai in prod).
  // Do NOT proxy to *.azurewebsites.net — App Service Authentication blocks login there.
  const defaultApiProxyTarget = 'https://agreeable-cliff-0981a8210.7.azurestaticapps.net'
  // Overrides: VITE_DEV_API_PROXY_TARGET=http://127.0.0.1:5000 (local Flask)
  const apiProxyTarget = (env.VITE_DEV_API_PROXY_TARGET || defaultApiProxyTarget).trim()

  return {
    plugins: [react()],
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
    base: "/",
    //base: "/",
    build: {
      outDir: "build",
      sourcemap: true,
    },
    server: {
      proxy: {
      // Healthify NPI — must be registered before `/api` (more specific path first).
      '/api/healthify': {
        target: 'https://rainbow.exwyn.com',
        changeOrigin: true,
      },
      // Local-dev CORS bypass: localhost:5173/api → Azure App Service.
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: true,
        cookieDomainRewrite: 'localhost',
      },
      // NPPES — must match DEFAULT_NPPES_PROXY_PATH in src/services/npiRegistry.ts
      '/npi-registry': {
        target: 'https://npiregistry.cms.hhs.gov',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/npi-registry/, ''),
        secure: true,
      },
    },
  },
  }
})

