/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/** Code the public site must never download: admin screens, Firebase Auth, PDF and chart libraries. */
const PUBLIC_FORBIDDEN: RegExp[] = [/src\/admin\//, /firebase\/auth|@firebase\/auth/, /@react-pdf/, /recharts/]

/**
 * Fails `npm run build` if the entry chunk, or any chunk it imports statically, contains admin code
 * (docs/specs/udan-admin.md, "Routing and bundle isolation"). Dynamic imports (lazy routes) are fine.
 */
function bundleGuard(): Plugin {
  return {
    name: 'udan-bundle-guard',
    apply: 'build',
    generateBundle(_options, bundle) {
      const chunks = new Map(
        Object.values(bundle).flatMap((output) => (output.type === 'chunk' ? [[output.fileName, output] as const] : [])),
      )
      const queue = [...chunks.values()].filter((chunk) => chunk.isEntry).map((chunk) => chunk.fileName)
      const seen = new Set<string>()
      const leaks: string[] = []
      while (queue.length) {
        const fileName = queue.pop()!
        if (seen.has(fileName)) continue
        seen.add(fileName)
        const chunk = chunks.get(fileName)
        if (!chunk) continue
        for (const id of Object.keys(chunk.modules)) {
          if (PUBLIC_FORBIDDEN.some((pattern) => pattern.test(id))) leaks.push(`${fileName}: ${id}`)
        }
        queue.push(...chunk.imports)
      }
      if (leaks.length) {
        this.error(
          `bundleGuard: the public entry statically pulls admin/auth/pdf/chart code. Import it lazily from src/admin instead.\n  ${leaks.slice(0, 20).join('\n  ')}`,
        )
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), bundleGuard()],
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
