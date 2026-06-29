# Local AI Engine — Setup Post-Mortem

---

## What We Built
A fully local RAG (Retrieval Augmented Generation) pipeline:
- **Docling** — reads and parses PDFs
- **LlamaIndex** — chunks and indexes content
- **Ollama + Gemma 31B** — answers questions
- **Streamlit** — browser UI on localhost:8501

---

## Issues We Hit & Root Causes

| Issue | Root Cause | Cost |
|---|---|---|
| Python 3.9 too old | Mac ships ancient system Python | ~30 min |
| Homebrew Python 3.11 broken | macOS 26 beta + old libexpat conflict | ~20 min |
| Homebrew Python 3.13 broken | Same libexpat conflict | ~15 min |
| Aider's Python 3.13 unusable | Aider isolates its own env, can't borrow | ~10 min |
| pyenv fixed everything | Compiles Python independent of system libs | ✅ |
| nomic-embed-text not found | Ollama model not pulled before running ingest | ~5 min |

**Core problem:** You're on **macOS 26 beta**. Homebrew Python conflicts with the beta's system libraries. This will resolve itself when macOS 26 goes stable.

---

## What To Do First Next Time

### Step 0 — Pre-flight checklist (do this before anything else)

| Check | Command | What you need |
|---|---|---|
| macOS version | `sw_vers` | Stable release, not beta |
| Python version | `python3 --version` | 3.10+ |
| pyenv installed | `pyenv --version` | Any version |
| Homebrew installed | `brew --version` | Any version |
| Ollama running | `ollama list` | Model present |

---

## Correct Setup Order (Next Time)

### 1. Install pyenv first — always
```bash
brew install pyenv
```
```bash
pyenv install 3.11.9
```
Skip Homebrew Python entirely. pyenv is always more reliable on Mac.

---

### 2. Build venv with pyenv Python
```bash
~/.pyenv/versions/3.11.9/bin/python3.11 -m venv ocr_env
```
```bash
source ocr_env/bin/activate
```
```bash
pip install -r requirements.txt
```

---

### 3. HuggingFace token (optional but recommended)
Create a free account at huggingface.co → Settings → Access Tokens → New token (read-only).

Then set it once:
```bash
export HF_TOKEN=your_token_here
```
Faster downloads, no rate limit warnings.

---

### 4. PDF folder — decide upfront

| Option | Best for |
|---|---|
| Drop PDFs into `pdf_data/` | Static set of files (your case) |
| Update `PDF_FOLDER` in config.py | PDFs live elsewhere permanently |

---

### 5. Pull the Ollama embedding model — before ingest
**New terminal tab (root):**
```bash
ollama pull nomic-embed-text
```
This is required. Ingest will fail with a 404 error if skipped.

---

### 6. Run order (every project)
```
1. bash setup.sh                  ← one time
2. ollama pull nomic-embed-text   ← one time per machine
3. python3 ingest.py              ← one time (re-run only when PDFs change)
4. streamlit run chat.py          ← every session
```

---

## Things We'd Do Differently

| What | Why |
|---|---|
| Check macOS stability before starting | Beta OS = broken system libs |
| Install pyenv before anything else | Avoids all Homebrew Python conflicts |
| Confirm working Python version upfront | Would have saved 1 hour |
| Set HF_TOKEN before first ingest | Avoids rate limit warnings |
| Add Python version to `setup.sh` | Auto-detect and warn if Python too old |

---

## Quick Reference Card

```bash
# Navigate
cd Developer/local-ocr/PLANNING-local-build/FINAL-OCR-BUILD

# Activate
source ocr_env/bin/activate

# Daily run
streamlit run chat.py

# When adding new PDFs
python3 ingest.py

# Deactivate when done
deactivate
```
