/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/** Code the public site must never download: admin screens, Firebase Auth, PDF and chart libraries. */
const PUBLIC_FORBIDDEN: RegExp[] = [/src\/admin\//, /firebase\/auth|@firebase\/auth/, /@react-pdf/, /recharts/]

/**
 * Static chunk closure (the chunk + every chunk it imports statically) of the chunks matching `start`;
 * returns `"<chunk>: <module id>"` for each module matching `forbidden`. Dynamic imports (lazy routes) are not followed.
 */
function staticLeaks(
  chunks: Map<string, { fileName: string; isEntry: boolean; modules: Record<string, unknown>; imports: string[] }>,
  start: (chunk: { isEntry: boolean; modules: Record<string, unknown> }) => boolean,
  forbidden: RegExp[],
): string[] {
  const queue = [...chunks.values()].filter(start).map((chunk) => chunk.fileName)
  const seen = new Set<string>()
  const leaks: string[] = []
  while (queue.length) {
    const fileName = queue.pop()!
    if (seen.has(fileName)) continue
    seen.add(fileName)
    const chunk = chunks.get(fileName)
    if (!chunk) continue
    for (const id of Object.keys(chunk.modules)) {
      if (forbidden.some((pattern) => pattern.test(id))) leaks.push(`${fileName}: ${id}`)
    }
    queue.push(...chunk.imports)
  }
  return leaks
}

/**
 * Fails `npm run build` if the entry chunk, or any chunk it imports statically, contains admin code
 * (docs/specs/udan-admin.md, "Routing and bundle isolation"). Dynamic imports (lazy routes) are fine.
 * Also keeps Recharts out of the admin routes chunk (Overview and the other screens): only the lazy Insights
 * route may pull it.
 */
function bundleGuard(): Plugin {
  return {
    name: 'udan-bundle-guard',
    apply: 'build',
    generateBundle(_options, bundle) {
      const chunks = new Map(
        Object.values(bundle).flatMap((output) => (output.type === 'chunk' ? [[output.fileName, output] as const] : [])),
      )
      const leaks = staticLeaks(chunks, (chunk) => chunk.isEntry, PUBLIC_FORBIDDEN)
      if (leaks.length) {
        this.error(
          `bundleGuard: the public entry statically pulls admin/auth/pdf/chart code. Import it lazily from src/admin instead.\n  ${leaks.slice(0, 20).join('\n  ')}`,
        )
      }
      // The lazy /admin chunk (its facadeModuleId can be null, so match on the modules it holds).
      const adminRoutes = (chunk: { modules: Record<string, unknown> }) => Object.keys(chunk.modules).some((id) => /src\/admin\/routes\.tsx$/.test(id))
      if (![...chunks.values()].some(adminRoutes)) this.error('bundleGuard: no chunk for src/admin/routes.tsx (is /admin still lazy?)')
      const chartLeaks = staticLeaks(chunks, adminRoutes, [/recharts/])
      if (chartLeaks.length) {
        this.error(
          `bundleGuard: the admin routes chunk statically pulls Recharts. Only the lazy Insights screen may import it.\n  ${chartLeaks.slice(0, 20).join('\n  ')}`,
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
