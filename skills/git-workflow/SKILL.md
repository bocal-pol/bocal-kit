---
name: git-workflow
description: "Installs the standard Git workflow in a project — commit-msg and pre-commit hooks, README Git Workflow section, optional commitlint + Husky, GitHub branch protection recommendations. Auto-invoke on: new git project, configure git workflow, install git hooks, conventional commits, branch protection, husky, commitlint."
model: claude-sonnet-5
user-invocable: true
type: utility
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# /git-workflow — Standard Git Workflow Installation

Installs local Git protections and documents the workflow in the current project.

## Workflow

### Step 1 — Detect project state

```bash
# Check we're in a Git repo
git rev-parse --git-dir 2>/dev/null

# Check existing branches
git branch -a

# Check if package.json exists (for Husky)
ls package.json 2>/dev/null
```

If there's no Git repo: offer `git init` + creating `main` and `develop` branches.

### Step 2 — Ask about scope via AskUserQuestion

```
/git-workflow — Installation:

What should be installed?

[ ] commit-msg hook   — validates the Conventional Commits format
[ ] pre-commit hook   — blocks commits on main and develop
[ ] README section    — documents the workflow in README.md
[ ] commitlint + Husky — automatic message linting (requires npm)
[ ] Install everything — recommended

Branches to protect locally: main, develop (or other?): ___
```

### Step 3 — `commit-msg` hook (Conventional Commits)

Create `.git/hooks/commit-msg`:

```bash
#!/bin/sh
# Validates the Conventional Commits format
# Allowed types: feat, fix, refactor, docs, test, chore, style, perf, ci, build, revert

COMMIT_MSG_FILE="$1"
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

# Ignore merge commits and amends
if echo "$COMMIT_MSG" | grep -qE "^(Merge |Revert )"; then
    exit 0
fi

PATTERN="^(feat|fix|refactor|docs|test|chore|style|perf|ci|build|revert)(\(.+\))?: .{1,72}$"

if ! echo "$COMMIT_MSG" | grep -qE "$PATTERN"; then
    echo ""
    echo "❌ Commit message doesn't follow the Conventional Commits format."
    echo ""
    echo "   Expected format: type(scope): short description"
    echo "   Allowed types: feat, fix, refactor, docs, test, chore, style, perf, ci, build, revert"
    echo ""
    echo "   Valid examples:"
    echo "     feat(auth): add JWT authentication"
    echo "     fix(api): handle null response from external service"
    echo "     docs(readme): update installation steps"
    echo ""
    echo "   Your message: $COMMIT_MSG"
    echo ""
    exit 1
fi

exit 0
```

```bash
chmod +x .git/hooks/commit-msg
```

### Step 4 — `pre-commit` hook (block main and develop)

Create `.git/hooks/pre-commit`:

```bash
#!/bin/sh
# Blocks direct commits on main and develop

BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null)

if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
    echo ""
    echo "❌ Direct commit on '$BRANCH' is forbidden."
    echo ""
    echo "   → Create a feature/* or hotfix/* branch:"
    echo "     git checkout develop"
    echo "     git pull origin develop"
    echo "     git checkout -b feature/my-feature"
    echo ""
    exit 1
fi

if [ "$BRANCH" = "develop" ]; then
    echo ""
    echo "❌ Direct commit on 'develop' is forbidden."
    echo ""
    echo "   → Create a feature/* branch:"
    echo "     git checkout -b feature/my-feature"
    echo ""
    exit 1
fi

exit 0
```

```bash
chmod +x .git/hooks/pre-commit
```

### Step 5 — commitlint + Husky (if package.json is present)

```bash
# Install
npm install --save-dev @commitlint/cli @commitlint/config-conventional husky

# Initialize Husky
npx husky init

# commit-msg hook via Husky
echo "npx --no -- commitlint --edit \$1" > .husky/commit-msg
chmod +x .husky/commit-msg
```

Create `commitlint.config.js` at the root:

```js
/** @type {import('@commitlint/types').UserConfig} */
export default {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'type-enum': [2, 'always', [
            'feat', 'fix', 'refactor', 'docs', 'test',
            'chore', 'style', 'perf', 'ci', 'build', 'revert'
        ]],
        'subject-case': [2, 'always', 'lower-case'],
        'subject-full-stop': [2, 'never', '.'],
        'header-max-length': [2, 'always', 72],
        'body-max-line-length': [1, 'always', 100],
    },
};
```

Add to `package.json`:

```json
{
    "scripts": {
        "prepare": "husky"
    }
}
```

### Step 6 — "Git Workflow" README section

Add to `README.md` (create it if absent):

```markdown
## Git Workflow

### Branch strategy

| Branch | Role | Direct push |
|---------|------|-------------|
| `main` | Production | ❌ Forbidden |
| `develop` | Integration | ❌ Forbidden |
| `feature/*` | New features | ✅ Via PR |
| `bugfix/*` | Bug fixes | ✅ Via PR |
| `hotfix/*` | Urgent fixes (prod) | ✅ Via PR |

### Create a new branch

```bash
# Always start from an up-to-date develop
git checkout develop
git pull origin develop

# Create the branch
git checkout -b feature/my-feature
# or
git checkout -b bugfix/xyz-fix
```

### Submit your changes

```bash
# Commit
git add .
git commit -m "feat(scope): short description"

# Push
git push origin feature/my-feature

# Open a Pull Request to develop on GitHub
```

### Commit convention

Format: `type(scope): short description`

| Type | Usage |
|------|-------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Refactoring with no functional change |
| `docs` | Documentation only |
| `test` | Adding or modifying tests |
| `chore` | Maintenance, dependencies, config |

Rules:
- Imperative present tense (`add` not `added`)
- No capital letter at the start
- No trailing period
- 72 characters max

### Strict rules

- ❌ `git push origin main` — **forbidden**
- ❌ `git push origin develop` — **forbidden**
- ❌ Local merge into `develop` or `main` — **forbidden**
- ✅ Always go through a GitHub Pull Request
```

### Step 7 — GitHub Branch Protection recommendations

Display the settings to configure on GitHub:

```
📋 GitHub Configuration — Branch Protection Rules

For the main branch (Settings → Branches → Add rule):
  ✅ Require a pull request before merging
  ✅ Require approvals (1 minimum)
  ✅ Require status checks to pass before merging
  ✅ Restrict who can push to matching branches

For the develop branch:
  ✅ Require a pull request before merging
  ✅ Require status checks to pass before merging
  ✅ Restrict who can push to matching branches

Recommended options (both branches):
  ✅ Do not allow bypassing the above settings
  ❌ Allow force pushes — disable
  ❌ Allow deletions — disable
```

### Step 8 — Confirmation

Display a summary of what was installed:

```
✅ Git workflow installed

Hooks created:
  .git/hooks/commit-msg   — Conventional Commits validation
  .git/hooks/pre-commit   — blocks commits on main/develop

[If Husky]:
  .husky/commit-msg       — commitlint via Husky
  commitlint.config.js    — strict Conventional Commits config

README:
  "Git Workflow" section added

Next steps:
  1. Configure Branch Protection on GitHub (recommendations above)
  2. git checkout develop && git pull origin develop
  3. git checkout -b feature/my-first-branch
```
