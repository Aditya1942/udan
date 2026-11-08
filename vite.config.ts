/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/** Code the public site must never download: admin screens, Firebase Auth, PDF, QR and chart libraries. */
const PUBLIC_FORBIDDEN: RegExp[] = [/src\/admin\//, /firebase\/auth|@firebase\/auth/, /@react-pdf/, /node_modules\/qrcode\//, /recharts/]
/**
 * Heavy code the admin routes chunk must leave to its nested lazy chunks: Recharts (only the Insights screen) and the
 * PDF stack (react-pdf, qrcode, src/admin/pdf — loaded when Prepare is pressed). The pure modules `pdf/view.ts`,
 * `pdf/share.ts` and `pdf/catalog.ts` (no react-pdf) are allowed: live links and template pickers need them.
 */
const ADMIN_ROUTES_FORBIDDEN: { pattern: RegExp; rule: string }[] = [
  { pattern: /recharts/, rule: 'Recharts: only the lazy Insights screen may import it' },
  { pattern: /@react-pdf|node_modules\/qrcode\/|src\/admin\/pdf\/(?!(?:view|share|catalog)\.ts$)/, rule: 'the PDF stack (react-pdf, qrcode, src/admin/pdf): load it only with a dynamic import on Prepare' },
]

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
 * Also keeps Recharts and the PDF stack out of the admin routes chunk (Overview and the other screens): only the
 * lazy Insights route may pull Recharts, and only the Documents card's Prepare (`import('…/pdf')`) the PDF code.
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
      for (const { pattern, rule } of ADMIN_ROUTES_FORBIDDEN) {
        const heavy = staticLeaks(chunks, adminRoutes, [pattern])
        if (heavy.length) {
          this.error(`bundleGuard: the admin routes chunk statically pulls ${rule}.\n  ${heavy.slice(0, 20).join('\n  ')}`)
        }
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), bundleGuard()],
  test: {
    css: false,
    // Emulator-backed tests talk to a real (local) Firestore; give them headroom.
    // Tests never use the real project from .env.
    env: Object.fromEntries(
      ['API_KEY', 'AUTH_DOMAIN', 'PROJECT_ID', 'STORAGE_BUCKET', 'MESSAGING_SENDER_ID', 'APP_ID']
        .map((k) => [`VITE_FIREBASE_${k}`, ''])
        .concat([['VITE_FIRESTORE_DATABASE_ID', '']]),
    ),
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
