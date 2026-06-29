"""
Streamlit chat UI for the local PDF engine.

Usage:
    streamlit run chat.py
    Then open: http://localhost:8501
"""

import os
import streamlit as st
from llama_index.core import load_index_from_storage, StorageContext, Settings
from llama_index.llms.ollama import Ollama
from llama_index.embeddings.ollama import OllamaEmbedding

from config import (
    LLM_MODEL, EMBED_MODEL, OLLAMA_BASE_URL,
    REQUEST_TIMEOUT, INDEX_STORAGE, SIMILARITY_TOP_K, LOG_FILE,
)
from logger import get_logger

logger = get_logger("chat")

st.set_page_config(page_title="Local PDF Chat", layout="wide")


@st.cache_resource(show_spinner="Loading index...")
def load_engine():
    logger.info("Loading index from storage...")
    try:
        Settings.llm = Ollama(
            model=LLM_MODEL,
            base_url=OLLAMA_BASE_URL,
            request_timeout=REQUEST_TIMEOUT,
        )
        Settings.embed_model = OllamaEmbedding(
            model_name=EMBED_MODEL,
            base_url=OLLAMA_BASE_URL,
        )
        storage_context = StorageContext.from_defaults(persist_dir=INDEX_STORAGE)
        index = load_index_from_storage(storage_context)
        engine = index.as_query_engine(similarity_top_k=SIMILARITY_TOP_K)
        logger.info("Engine loaded successfully")
        return engine
    except Exception as e:
        logger.error(f"Failed to load engine: {e}", exc_info=True)
        raise


def format_response(response) -> str:
    answer = str(response).strip()

    sources = []
    if hasattr(response, "source_nodes") and response.source_nodes:
        for node in response.source_nodes:
            fname = node.metadata.get("file_name", "Unknown file")
            page = node.metadata.get("page_number", "?")
            excerpt = node.get_content().strip().replace("\n", " ")[:250]
            sources.append(
                f"📄 **{fname}** — Page {page}\n"
                f"> *\"{excerpt}...\"*"
            )

    if sources:
        answer += "\n\n---\n**Sources:**\n\n" + "\n\n".join(sources)

    return answer


def read_log_tail(n_lines: int = 100) -> list[str]:
    if not os.path.exists(LOG_FILE):
        return []
    try:
        with open(LOG_FILE, encoding="utf-8") as f:
            return f.readlines()[-n_lines:]
    except Exception as e:
        return [f"Could not read log file: {e}"]


# ── Sidebar: error log viewer ──────────────────────────────────────────────────
with st.sidebar:
    st.header("🔍 Error Log")

    filter_level = st.selectbox(
        "Show",
        ["ERRORS & WARNINGS", "ALL ENTRIES"],
        index=0,
    )

    lines = read_log_tail(200)

    if lines:
        if filter_level == "ERRORS & WARNINGS":
            filtered = [l for l in lines if "ERROR" in l or "WARNING" in l]
        else:
            filtered = lines

        display = "".join(filtered[-100:]) if filtered else "No entries matching filter."
        st.text_area("Log output", value=display, height=500, label_visibility="collapsed")
    else:
        st.info("No log file found yet.")

    if st.button("🔄 Refresh"):
        st.rerun()

    st.caption(f"Log file: `{LOG_FILE}`")


# ── Main chat interface ────────────────────────────────────────────────────────
st.title("📚 Local PDF Chat Engine")
st.caption(f"Model: `{LLM_MODEL}` · Embed: `{EMBED_MODEL}` · Top-K: {SIMILARITY_TOP_K}")

if not os.path.isdir(INDEX_STORAGE) or not os.listdir(INDEX_STORAGE):
    st.error(
        "No index found. Run `python ingest.py` first to process your PDFs.",
        icon="⚠️",
    )
    st.stop()

if "messages" not in st.session_state:
    st.session_state.messages = []

for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])

if prompt := st.chat_input("Ask a question about your documents..."):
    logger.info(f"User query: {prompt}")
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    with st.chat_message("assistant"):
        with st.spinner("Thinking..."):
            try:
                engine = load_engine()
                response = engine.query(prompt)
                formatted = format_response(response)
                logger.info("Response delivered successfully")
                st.markdown(formatted)
                st.session_state.messages.append({"role": "assistant", "content": formatted})
            except Exception as e:
                msg = f"Query failed: {e}"
                logger.error(msg, exc_info=True)
                st.error(f"Something went wrong. Check the error log in the sidebar.\n\n`{e}`")
