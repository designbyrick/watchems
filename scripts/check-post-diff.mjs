/**
 * Deploy guard for /learn posts: fails if the branch changes anything besides one post.
 *
 * Usage (from the post's worktree, after `git fetch origin master`):
 *   node scripts/check-post-diff.mjs <slug>
 *
 * Allowed: content/posts/<slug>/**, public/posts/<slug>.webp, public/posts/<slug>/**, docs/seo/backlog.md, and
 * content/posts/<other-slug>/index.mdx (a link to the new post added to an older post).
 * Anything else means work from another session would ship with the post, so it stops.
 */

import { execSync } from 'child_process'

const slug = process.argv[2]
if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error('Usage: node scripts/check-post-diff.mjs <slug>')
  process.exit(1)
}

const base = execSync('git merge-base origin/master HEAD', { encoding: 'utf8' }).trim()
const changed = execSync(`git diff --name-only ${base}`, { encoding: 'utf8' })
  .split('\n')
  .concat(execSync('git ls-files --others --exclude-standard', { encoding: 'utf8' }).split('\n'))
  .map((f) => f.trim())
  .filter(Boolean)

const allowed = (f) =>
  f.startsWith(`content/posts/${slug}/`) ||
  f === `public/posts/${slug}.webp` ||
  f.startsWith(`public/posts/${slug}/`) ||
  f === 'docs/seo/backlog.md' ||
  /^content\/posts\/[a-z0-9-]+\/index\.mdx$/.test(f)

const bad = changed.filter((f) => !allowed(f))
if (!changed.some((f) => f.startsWith(`content/posts/${slug}/`))) {
  console.error(`No changes under content/posts/${slug}/`)
  process.exit(1)
}
if (bad.length) {
  console.error(`Files outside the post (will not ship automatically):\n${bad.map((f) => `  ${f}`).join('\n')}`)
  process.exit(1)
}
console.log(`OK: ${changed.length} file(s), all part of post "${slug}"`)
