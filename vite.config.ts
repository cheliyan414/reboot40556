import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  optimizeDeps: {
    // Crawl only the real app entry. The default scan also crawls the read-only
    // `vendor-reference/` repos, whose uninstalled deps (leva, gsap, threejs-*)
    // abort optimization and leave the dev server unable to serve the app.
    // lucide-react is pre-bundled (not excluded): as raw ESM it fans out into
    // ~1500 icon requests and stalls the dev planet entry.
    entries: ['index.html'],
  },
  test: {
    // Project tests only. `vendor-reference/` holds the audited third-party
    // repositories read-only: they are not installed, not compiled and not ours
    // to pass, and letting vitest collect them turns every run red on import
    // errors that say nothing about this app.
    include: ['src/**/*.test.{ts,tsx}', 'supabase/**/*.test.ts'],
    // The district generators are real procedural code: a single metropolis test
    // builds the skyline twice for determinism and runs pairwise separation over
    // 600-800 lots (2-3.5s on its own), and the kit now grows organic road meshes
    // (Procedural-Cities) and zoned block grids (City Tour) per district. Under
    // vitest's parallel forks these contend for CPU and the 5s default flaked on
    // the heavier cities. This is headroom for correctness tests, not a perf
    // benchmark: every assertion still runs, a genuine hang still fails at 20s.
    testTimeout: 20000,
  },
});
