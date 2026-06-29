"""
Run once to convert PDFs into a persistent vector index.
Re-run if you add new PDFs to pdf_data/.

Usage:
    python ingest.py
"""

import os
import sys
from docling.document_converter import DocumentConverter
from docling.chunking import HybridChunker
from llama_index.core import Document, VectorStoreIndex, Settings
from llama_index.llms.ollama import Ollama
from llama_index.embeddings.ollama import OllamaEmbedding

from config import (
    LLM_MODEL, EMBED_MODEL, OLLAMA_BASE_URL,
    REQUEST_TIMEOUT, PDF_FOLDER, INDEX_STORAGE, SIMILARITY_TOP_K,
)
from logger import get_logger

logger = get_logger("ingest")


def extract_page_number(chunk) -> int | None:
    try:
        return chunk.meta.doc_items[0].prov[0].page_no
    except (IndexError, AttributeError):
        return None


def ingest():
    logger.info("=== Ingest started ===")

    Settings.llm = Ollama(
        model=LLM_MODEL,
        base_url=OLLAMA_BASE_URL,
        request_timeout=REQUEST_TIMEOUT,
    )
    Settings.embed_model = OllamaEmbedding(
        model_name=EMBED_MODEL,
        base_url=OLLAMA_BASE_URL,
    )
    logger.info(f"Models configured — LLM: {LLM_MODEL}, Embed: {EMBED_MODEL}")

    if not os.path.isdir(PDF_FOLDER):
        logger.error(f"PDF folder not found: {PDF_FOLDER}")
        sys.exit(1)

    pdf_files = [f for f in os.listdir(PDF_FOLDER) if f.lower().endswith(".pdf")]
    if not pdf_files:
        logger.error(f"No PDFs found in {PDF_FOLDER}")
        sys.exit(1)

    logger.info(f"Found {len(pdf_files)} PDF(s): {pdf_files}")

    converter = DocumentConverter()
    chunker = HybridChunker()
    documents = []

    for filename in pdf_files:
        filepath = os.path.join(PDF_FOLDER, filename)
        try:
            logger.info(f"Processing: {filename}")
            result = converter.convert(filepath)
            chunks = list(chunker.chunk(result.document))
            logger.info(f"  {filename} → {len(chunks)} chunks extracted")

            for chunk in chunks:
                page_no = extract_page_number(chunk)
                documents.append(Document(
                    text=chunk.text,
                    metadata={
                        "file_name": filename,
                        "page_number": page_no if page_no is not None else "unknown",
                    },
                ))

        except Exception as e:
            logger.error(f"Failed to process {filename}: {e}", exc_info=True)
            logger.warning(f"Skipping {filename} — continuing with remaining files")

    if not documents:
        logger.error("No documents were successfully processed. Aborting.")
        sys.exit(1)

    logger.info(f"Total chunks across all documents: {len(documents)}")

    os.makedirs(INDEX_STORAGE, exist_ok=True)
    try:
        logger.info("Building vector index...")
        index = VectorStoreIndex.from_documents(documents, show_progress=True)
        index.storage_context.persist(persist_dir=INDEX_STORAGE)
        logger.info(f"Index saved to {INDEX_STORAGE}")
    except Exception as e:
        logger.error(f"Failed to build or save index: {e}", exc_info=True)
        sys.exit(1)

    logger.info("=== Ingest complete ===")
    print("\nDone. Run the app with:\n    streamlit run chat.py")


if __name__ == "__main__":
    ingest()
