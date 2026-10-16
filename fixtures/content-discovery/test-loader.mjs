/**
 * Test-only ESM loader: Quartz components import their stylesheets as `.scss`
 * files (the build bundles them via esbuild-sass-plugin). tsx does not handle
 * SCSS, so during offline tests we redirect every `.scss` import to an empty
 * module. Everything else is deferred to the next loader (tsx), which compiles
 * TypeScript/TSX normally.
 *
 * Usage:
 *   node --import tsx/esm --import ./fixtures/content-discovery/test-loader.mjs \
 *        --test fixtures/content-discovery/*.test.ts
 */
import { register } from "node:module"
import { pathToFileURL } from "node:url"

register(import.meta.url, pathToFileURL("./"))

/** Inline scripts (.inline.ts) resolve to a bundled script string at build time. */
const INLINE_SCRIPT = /\.inline\.(ts|js)$/

export async function format(url, context, nextFormat) {
  if (url.endsWith(".scss") || INLINE_SCRIPT.test(url)) {
    return { format: "module", shortCircuit: true }
  }
  return nextFormat(url, context)
}

export async function load(url, context, nextLoad) {
  if (url.endsWith(".scss")) {
    return { format: "module", shortCircuit: true, source: "export default {};" }
  }
  if (INLINE_SCRIPT.test(url)) {
    return {
      format: "module",
      shortCircuit: true,
      source: 'export default "";',
    }
  }
  return nextLoad(url, context)
}
