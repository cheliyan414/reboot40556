// One-shot roster codemod: rename the six district identifiers to the new roster.
// Whole-word only, so component names like CommunityCity / SpaceCity are untouched.
// Excludes the social-feed Community page and the "Space Mono" font string.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
const root = join(process.cwd(), 'src')
const EXCLUDE = new Set(['App.tsx', join('pages', 'Community.tsx'), join('components', 'AccountGate.tsx')])
const RENAMES = [
  [/\bIdeaHub\b/g, 'Business'],
  [/\bRobotics\b/g, 'Nature'],
  [/\bCommunity\b/g, 'Social'],
  [/\bSpace\b(?! Mono)/g, 'Future'],
  [/\bLegend\b/g, 'Success'],
  [/\bCreator\b/g, 'Creative'],
]
const changed = []
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    if (statSync(p).isDirectory()) { walk(p); continue }
    if (!/\.(ts|tsx)$/.test(entry)) continue
    const rel = relative(root, p)
    if (EXCLUDE.has(rel)) continue
    const src = readFileSync(p, 'utf8')
    let out = src
    for (const [re, to] of RENAMES) out = out.replace(re, to)
    if (out !== src) { writeFileSync(p, out); changed.push(rel) }
  }
}
walk(root)
console.log(JSON.stringify({ changedFiles: changed.length, changed }, null, 2))