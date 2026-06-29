# Environment Setup

Everything you need to run this framework from scratch.
Estimated time: 30–45 minutes.

---

## 1. Google Apps Script — clasp CLI

clasp is the command-line tool for pushing/pulling GAS projects.

```bash
npm install -g @google/clasp
```

Then enable the Apps Script API in your Google account:
- Go to https://script.google.com/home/usersettings
- Turn on "Google Apps Script API"

Login with your Google account:
```bash
clasp login
```

---

## 2. Ollama (Local AI Runtime)

Download and install Ollama from https://ollama.com

Then pull the Gemma model:
```bash
ollama pull gemma4:31b
```

Verify it's running:
```bash
ollama list
```

---

## 3. Aider (Local Coding CLI)

```bash
pip install aider-chat
```

Verify:
```bash
aider --version
```

---

## 4. GitHub CLI

```bash
brew install gh        # macOS
```

Login:
```bash
gh auth login
```

---

## 5. Branch Protection (Do This For Every New Project)

After creating a new repo from this template, protect the main branch
so Aider can never push directly to it:

1. Go to your repo on GitHub
2. Settings → Branches → Add branch protection rule
3. Branch name pattern: `main`
4. Check: **Require a pull request before merging**
5. Check: **Require at least 1 approval**
6. Check: **Do not allow bypassing the above settings**
7. Save changes

This ensures every piece of Aider's code goes through Claude review
before it lands on main.

---

## 6. Verify Everything

```bash
ollama list          # should show gemma4:27b
aider --version      # should show current version
gh auth status       # should show logged in
clasp --version      # should show current version
```
