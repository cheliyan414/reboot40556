// Harness-only Vite config. Identical to the app config except for an isolated
// dependency-optimizer cache, so a check run never shares node_modules/.vite
// with a concurrently running user dev server (shared caches invalidate each
// other's hashed dep URLs and break dynamic imports mid-check).
import base from './vite.config'

export default {
  ...base,
  cacheDir: 'node_modules/.vite-harness',
}