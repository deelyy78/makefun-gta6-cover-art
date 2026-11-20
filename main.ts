// Vice Panels — hand-in program for the make.fun gta6-cover-art-01 entry.
//
// The entry itself is the static web app under app/ (a GTA-style cover art
// maker that runs offline in a desktop browser). This program's whole job is
// the hand-in: copy app/ and screenshots/ into the output directory and write
// the dossier the judge reads, using the kit's own vendored library so the
// bytes match the scorer's rebuild exactly.
//
// Run it the way the grader does, from the repository root:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// MAKEFUN_OUTPUT_DIR stands in for /output outside the grader's container.
// Node 22, standard library only; the run is deterministic — the same tree
// always produces the same dossier bytes.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's caps, mirrored from the kit so this program refuses an entry the
// scorer would refuse instead of handing in something invalid.
const GATE = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
} as const;

// Copy one tree into the output, clearing whatever a previous run left there
// first so stale files can never leak into the hand-in.
function stageTree(name: string): void {
  const from = join(repoRoot, name);
  const to = join(outputDir, name);
  rmSync(to, { recursive: true, force: true });
  if (existsSync(from)) cpSync(from, to, { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
stageTree('app');
stageTree('screenshots');

const dossier = buildDossier(outputDir, GATE);
writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log(`vice-panels: staged app/ and screenshots/, dossier.json is ${dossier.length} bytes`);
