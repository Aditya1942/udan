/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    css: false,
    // Emulator-backed tests talk to a real (local) Firestore; give them headroom.
    testTimeout: 20_000,
    hookTimeout: 30_000,
    // Convention: *.test.ts runs in node (pure modules, Firestore rules); *.test.tsx runs in jsdom (UI).
    // Both need the Firestore emulator: run via `npm test` (emulators:exec) or alongside `npm run emulators`.
    projects: [
      {
        extends: true,
        test: { name: 'node', environment: 'node', include: ['src/**/*.test.ts'] },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx'],
          setupFiles: ['./src/test/setup.ts'],
        },
      },
    ],
  },
})
