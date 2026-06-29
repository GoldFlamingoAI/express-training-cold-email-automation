# 🚨 EMERGENCY — Aider Correction Required

**Do not merge any open PRs until this is resolved.**

---

## What's Wrong

**Mistake pattern:** [describe the repeated mistake in one sentence]

**First seen:** PR #[number] — [brief description]
**Seen again:** PR #[number] — [brief description]

---

## What Needs to Be Fixed

**File to update:** [AIDER.md / PLAYBOOK.md / both]

**Specific change needed:**
[Describe exactly what rule or recipe needs to be added or changed]

---

## How to Resolve

1. Bring Claude into this repo and say:
   > "Read EMERGENCY.md and fix AIDER.md and/or PLAYBOOK.md to prevent this pattern"
2. Claude fixes the rule files directly on GitHub
3. Pull the corrected files to your local machine before running Aider again:
   ```bash
   git pull origin main
   ```
4. Review and correct any existing code affected by this mistake
5. Confirm with Claude that the fix is complete
6. Delete this file and push the deletion:
   ```bash
   git rm EMERGENCY.md
   git commit -m "fix: resolve EMERGENCY — [pattern description]"
   git push origin main
   ```
7. Resume normal Aider sessions — corrections load automatically at next startup

---

**Opened by Claude on:** [YYYY-MM-DD]
**Resolved on:** [ ]
