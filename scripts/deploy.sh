#!/usr/bin/env bash
# One-command deploy to GitHub Pages (gh-pages branch). Usage: npm run deploy
set -euo pipefail
cd "$(dirname "$0")/.."

echo "▸ Building static export…"
NEXT_PUBLIC_BASE_PATH=/istiqamah npm run build

echo "▸ Publishing out/ to gh-pages…"
cd out
touch .nojekyll
rm -rf .git
git init -q
git checkout -q -b gh-pages
git add -A
git -c user.email=deploy@local -c user.name=deploy commit -qm "Deploy $(date -u +%Y-%m-%dT%H:%M:%SZ)"
git push -qf https://github.com/frangga99999/istiqamah.git gh-pages
rm -rf .git

echo "✓ Deployed → https://frangga99999.github.io/istiqamah/ (live in ~1 min)"
