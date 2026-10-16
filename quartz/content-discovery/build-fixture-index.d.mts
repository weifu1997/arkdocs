/**
 * Type declarations for the fixture Content Index builder. The runtime is a
 * plain .mjs module so the offline tests can import it without a tsconfig
 * transform step; this declaration keeps tsc happy.
 */
export interface FixtureIndexEntry {
  slug: string
  filePath: string
  title: string
  tags: string[]
  content: string
  description: string
}

export type FixtureIndex = Record<string, FixtureIndexEntry>

export const FIXTURE_DIR: string
export const IGNORE_PATTERNS: string[]
export function buildFixtureIndex(): FixtureIndex
