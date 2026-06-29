#!/bin/bash
# One-time setup. Run from inside FINAL-OCR-BUILD/.

set -e

echo "Creating virtual environment..."
python3 -m venv ocr_env

echo "Activating environment..."
source ocr_env/bin/activate

echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo ""
echo "Setup complete."
echo ""
echo "Next steps:"
echo "  1. Drop your PDFs into pdf_data/"
echo "  2. source ocr_env/bin/activate"
echo "  3. python ingest.py          ← run once to build the index"
echo "  4. streamlit run chat.py     ← start the UI at localhost:8501"
