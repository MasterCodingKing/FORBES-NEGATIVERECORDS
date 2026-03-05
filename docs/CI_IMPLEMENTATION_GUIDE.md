# Implementing CI (Continuous Integration) — Step-by-Step Guide

## What is CI?

**CI = Continuous Integration.** It's an automated process that:
- Runs tests and checks every time you push code or open a Pull Request
- Blocks bad code from reaching the main branch
- Catches errors before they go to production

```
Developer pushes code
        ↓
GitHub sees workflow file
        ↓
Spins up Ubuntu servers
        ↓
Installs dependencies & runs checks
        ↓
Job passes ✅ or fails ❌
        ↓
Reports results on GitHub
```

---

## Step 1: Create `.gitignore` (Prevent junk from being tracked)

**Why:** `node_modules`, `.env`, `uploads/`, `__pycache__/` should never be in git.

**File location:** `.gitignore` in repo root

**Content includes:**
```
node_modules/
.env
.env.*
backend/uploads/
__pycache__/
dist/
.DS_Store
```

**Command to apply:**
```bash
git add .gitignore
git rm -r --cached node_modules  # Stop tracking but keep files locally
git commit -m "chore: add .gitignore"
```

---

## Step 2: Create the Workflow File

**File location:** `.github/workflows/ci.yml`

**Why separate jobs?**
- Backend (Node.js + Prisma)
- Frontend (React + Vite)
- OCR Service (Python)

Each runs in parallel for speed.

**Key sections:**

```yaml
name: CI

on:
  push:
    branches: [main, BRANCH-NEW]          # Run on these branches
  pull_request:
    branches: [main]                      # Block merge if PR checks fail

jobs:
  backend:
    runs-on: ubuntu-latest               # Use Ubuntu container
    steps:
      - uses: actions/checkout@v4        # Get the code
      - uses: actions/setup-node@v4      # Install Node.js
        with:
          node-version: 20
          cache: npm                      # Cache dependencies
      - run: npm ci                       # Install (cleaner than npm install)
      - run: npx prisma generate         # Generate Prisma client
      - run: node --check src/app.js     # Check syntax
```

---

## Step 3: Set Up Checks That Must Pass

### Frontend
```yaml
frontend:
  steps:
    - run: npm ci
    - run: npm run lint                  # ESLint — catches syntax errors
    - run: npm run build                 # Vite build — catches type errors
```

**What each does:**
- `lint` → Finds unused variables, imports, syntax issues
- `build` → Compiles React → JSX errors surface here

### Backend
```yaml
backend:
  steps:
    - run: npm ci
    - run: npx prisma generate          # Regenerate client from schema
    - run: node --check src/app.js      # Checks for syntax errors
```

### OCR Service (Python)
```yaml
ocr-service:
  steps:
    - run: pip install -r requirements.txt
    - run: flake8 . --count --select=E9,F63,F7,F82
```

---

## Step 4: Testing Your Setup Locally (Before pushing)

### Run the same checks locally first:

```bash
# Frontend
cd client
npm run lint
npm run build

# Backend
cd ../backend
npm ci
npx prisma generate
node --check src/app.js

# Python
cd ../ocr-service
pip install -r requirements.txt
flake8 . --count --select=E9,F63,F7,F82
```

**If any fail locally, fix before pushing.**

---

## Step 5: Push & Watch CI Run

```bash
git add .
git commit -m "feat: add feature X"
git push origin main
```

### Check results:
1. Go to GitHub → **Actions** tab
2. See the workflow running
3. Click to view logs
4. Jobs show ✅ or ❌

---

## Step 6: Fix Errors That CI Finds

**Example error we fixed:**

```
AdminBilling.jsx:44  error  'exportUrl' is assigned a value but never used
```

**Fix:** Remove the unused variable
```js
// BEFORE
let exportUrl = "/export/billing/export?";
exportUrl += qp.join("&");  // <- Built but never used

// AFTER
// (deleted entirely)
```

**Commit the fix:**
```bash
git add client/src/pages/admin/AdminBilling.jsx
git commit -m "fix: remove unused exportUrl variable"
git push origin main
```

CI automatically re-runs → ✅ passes

---

## Step 7: Use CI to Block Bad PRs

When someone opens a Pull Request:

1. CI automatically runs all checks
2. If any job fails → 🔴 **"Merge blocked"** warning appears
3. They must fix the code
4. Push fixes → CI re-runs → If all ✅ → Can merge

**Example:**
```
⚠️ All checks must pass before merging
❌ Frontend — Build failed (ESLint)
```

---

## Step 8: Add More Checks Over Time (Next Steps)

### Add Unit Tests

1. Install testing library:
```bash
npm install -D vitest @testing-library/react
```

2. Add to `package.json`:
```json
"scripts": {
  "test": "vitest run"
}
```

3. Add to workflow:
```yaml
- run: npm test
```

### Add Database Tests (Backend)

1. Spin up test PostgreSQL in GitHub Actions:
```yaml
services:
  postgres:
    image: postgres:15
    env:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: test_db
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```

2. Run migrations + tests:
```yaml
- run: npx prisma migrate dev
- run: npm test
```

---

## What We Did (Summary of Our 7 Fixes)

| # | File | Error Type | Fix |
|---|---|---|---|
| 1 | AdminBilling.jsx | Unused variable | Removed `exportUrl` |
| 2 | AdminRecords.jsx | Unused ref | Removed duplicate `fileRef` |
| 3 | AdminRecords.jsx | Unused error param | Changed `catch(err)` → `catch` |
| 4-7 | clientParser.js + parseWorker.js | Dead code functions + empty catch | Removed 5 unused functions, added `/* ignore */` comments |

**Total impact:** ESLint went from 7 errors → 0 errors, 4 warnings (warnings don't block CI)

---

## Workflow When Merging Going Forward

### 1. Create feature branch
```bash
git checkout -b feature/my-feature
# ... make changes ...
```

### 2. Push to GitHub
```bash
git push origin feature/my-feature
```

### 3. Open Pull Request on GitHub
- GitHub automatically triggers CI
- Shows ✅ or ❌ for each job

### 4. If CI fails:
- Click "Details" on failed job
- Read the logs
- Fix locally
- Push again → CI re-runs

### 5. Once CI passes + code review approved
- Click "Merge" button
- Branch auto-deletes
- CI runs once more on main

### 6. Monitor main branch
- Go to Actions tab
- See all workflow runs
- Click any failed run to debug

---

## Viewing CI Results

### On GitHub:
```
Repository → Actions → Workflow runs
```

Each run shows:
- **Status** (⏳ running / ✅ passed / ❌ failed)
- **Jobs** (Backend, Frontend, OCR-Service)
- **Run time** (how long each took)
- **Logs** (click job to see full output)

### Example output:
```
✅ Backend — Install & Lint (2m 15s)
  ✅ Set up Node.js — 5s
  ✅ Install dependencies — 45s
  ✅ Generate Prisma client — 10s
  ✅ Check syntax — 2s

✅ Frontend — Install, Lint & Build (3m 20s)
  ✅ Set up Node.js — 5s
  ✅ Install dependencies — 1m 30s
  ✅ Lint — 15s
  ✅ Build — 1m 30s

✅ OCR Service — Lint (1m 10s)
  ✅ Set up Python — 5s
  ✅ Install dependencies — 60s
  ✅ Lint — 5s
```

---

## Common CI Errors & Fixes

| Error | Cause | Fix |
|---|---|---|
| `npm ERR! 404 Not Found` | Wrong package name | Check `package.json` spelling |
| `EACCES: permission denied` | File permissions | Usually container issue, rebuild |
| `Cannot find module 'X'` | Missing dependency | Run `npm install X` |
| `SyntaxError: Unexpected token` | Invalid JavaScript | Fix the syntax error locally |
| `Prisma generate failed` | Corrupt `.prisma/client` | Run `npx prisma generate` locally |
| `Port already in use` | Test server conflicts | Change port in test config |

---

## Best Practices

✅ **DO:**
- Keep CI checks fast (< 5 min total)
- Fix CI immediately (don't merge red)
- Require CI to pass before merging
- Run checks locally before pushing
- Add meaningful commit messages

❌ **DON'T:**
- Ignore failing CI jobs
- Skip checks by disabling them
- Commit node_modules or .env
- Make massive commits (hard to debug)
- Leave failing builds on main

---

## Resources

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [Prisma CLI](https://www.prisma.io/docs/reference/api-reference/command-reference)
- [Vitest (Testing)](https://vitest.dev/)

---

## Your CI Status

**Current setup:**
- ✅ `.gitignore` created
- ✅ Workflow file (`.github/workflows/ci.yml`)
- ✅ 3 jobs: Backend, Frontend, OCR-Service
- ✅ ESLint checks (0 errors)
- ✅ Build validation
- ✅ Syntax checks
- ⏹️ No unit tests yet (next phase)
- ⏹️ No integration tests yet (next phase)

**To see CI in action:**
→ Go to `https://github.com/MasterCodingKing/FORBES-NEGATIVERECORDS/actions`
