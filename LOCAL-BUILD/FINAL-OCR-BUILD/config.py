LLM_MODEL = "gemma-4-31b"
EMBED_MODEL = "nomic-embed-text"
OLLAMA_BASE_URL = "http://localhost:11434"
REQUEST_TIMEOUT = 300.0
PDF_FOLDER = "./pdf_data"
INDEX_STORAGE = "./index_storage"
SIMILARITY_TOP_K = 5
LOG_FILE = "./logs/app.log"
LOG_MAX_BYTES = 10 * 1024 * 1024  # 10MB per file
LOG_BACKUP_COUNT = 5               # 5 backups = 50MB total history
STREAMLIT_PORT = 8501
