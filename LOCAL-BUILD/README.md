# Local Build — Dormant

This folder is **quarantined from the Codex workflow**. Codex never reads anything
inside `LOCAL-BUILD/`, and nothing here should be referenced by files at the repo root.

Return here when running local models again.

---

## What's Inside

```
LOCAL-BUILD/
├── README.md                              ← this file
│
├── FINAL-OCR-BUILD/                       ← local PDF RAG engine
│   ├── chat.py                            ← Streamlit chat UI
│   ├── ingest.py                          ← Docling + LlamaIndex ingest
│   ├── config.py
│   ├── logger.py
│   ├── requirements.txt
│   └── setup.sh
│
├── ocr-build/
│   └── local-dependencies.md              ← step-by-step build notes
│
├── LOCAL-AI-ENGINE-SETUP-POSTMORTEM.md    ← what worked, what didn't, what to do next time
├── SETUP.md                               ← legacy environment setup (clasp + Aider + Ollama)
│
├── .aider.conf.yml                        ← legacy Aider config
├── .aider.model.settings.yml              ← legacy Aider model config
│
├── legacy-js-config/                      ← .eslintrc.json + .prettierrc from JS-era root
│
└── FRAMEWORK/                             ← legacy Aider+Claude workflow (predecessor to Codex)
    ├── CLAUDE_CODE_FUNDAMENTALS.md
    ├── DIVISION_OF_LABOR.md
    ├── EVALUATION_PHASE.md
    ├── EXTENSIONS.md
    ├── PHASE_TEMPLATE.md
    └── STARTER/                           ← drop-in templates for Aider-based projects
```

---

## Stack (FINAL-OCR-BUILD)

- **Docling** — PDF parser, outputs clean Markdown
- **LlamaIndex** — chunking + vector index
- **Ollama + Gemma 31B** — local LLM for answers
- **Ollama + nomic-embed-text** — embeddings
- **Streamlit** — browser UI on `localhost:8501`

## Run Order

```bash
cd LOCAL-BUILD/FINAL-OCR-BUILD
bash setup.sh                  # one time
ollama pull nomic-embed-text   # one time per machine
python3 ingest.py              # rerun when PDFs change
streamlit run chat.py          # every session
```

For the full setup story (and what failed the first time), read
`LOCAL-AI-ENGINE-SETUP-POSTMORTEM.md`.

---

## Why This Folder Exists Separately

The repo root is dedicated to the **Codex + Claude Code review workflow** (see the
root `README.md`, `AGENTS.md`, `PHASES.md`, etc.). Mixing the local build's source
files, configs, and legacy framework docs at the root caused contamination —
hardcoded references in review rubrics, conflicting setup instructions, orphaned
`.aider.*` config files, and a parallel set of phase/playbook templates from the
older Aider workflow.

Quarantining everything in `LOCAL-BUILD/` keeps the Codex workflow clean and
preserves this work for when local-model development resumes.
