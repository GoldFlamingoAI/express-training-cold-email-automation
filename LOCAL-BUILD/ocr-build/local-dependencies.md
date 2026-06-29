Here is the complete, start-to-finish playbook on how to build a fully local AI engine that reads, understands, and cross-references your financial PDFs. I will break this down into very simple terms so you understand not just *what* to type, but *why* it works.

***

### Step 1: The Concept (How the Pieces Fit Together)
Imagine you have a stack of complex financial documents on your desk. 

1. **Docling** is your ultra-fast reader. It looks at the PDFs, figures out what is a title, what is a paragraph, and what is a table, and rewrites it all onto a clean notepad (Markdown). [codecademy](https://www.codecademy.com/article/docling-ai-a-complete-guide-to-parsing)
2. **LlamaIndex** is your filing clerk. It takes Docling’s clean notepad, chops it up into digestible paragraphs (called "chunks"), and organizes them in a filing cabinet (a Vector Database) so they can be found instantly. [slashdot](https://slashdot.org/software/comparison/LlamaIndex-vs-Ollama/)
3. **Ollama / Gemma 31B** is the financial analyst. When you ask a question, the clerk (LlamaIndex) grabs the relevant paragraphs from the filing cabinet and hands them to the analyst (Gemma) to write a human-like answer. [youtube](https://www.youtube.com/watch?v=tiYQiWWd7rE)

Because you keep all your tools separated using a **Virtual Environment (venv)**, your Aider coding setup will never get confused by this PDF engine.

***

### Step 2: Organize Your Folders (Where to Put Things)
First, we need to create a dedicated workspace on your Mac. Open your terminal and run these commands:

```bash
# Create a main folder for this project
mkdir Local_PDF_Engine
cd Local_PDF_Engine

# Create a specific folder where you will drop your PDFs
mkdir pdf_data
```

**Action Item:** Drag and drop your 12-page PDFs into that `pdf_data` folder. You can put as many in there as you want (e.g., `Tesla_2025.pdf`, `Ford_2025.pdf`).

***

### Step 3: Set Up the Isolated Environment
We need to install the dependencies in a "bubble" so they don't mess up your Mac or Aider.

```bash
# Create the bubble (venv)
python3 -m venv docling_env

# Step inside the bubble
source docling_env/bin/activate
```
*(Note: You know you are inside the bubble because your terminal prompt will now start with `(docling_env)`).*

Now, install the tools inside the bubble:
```bash
pip install docling llama-index llama-index-llms-ollama llama-index-embeddings-ollama
```

***

### Step 4: Prepare the AI Brains (Ollama)
Open a *new* terminal window (don't close the old one) and tell Ollama to download the two brains we need. 

1. **The Embedding Model** (The filing system that understands the meaning of words):
   ```bash
   ollama pull nomic-embed-text
   ```
2. **The LLM** (Gemma 31B, the analyst):
   ```bash
   ollama run gemma-4-31b
   ```
   *(Once Gemma starts running, you can close that second terminal window. It runs in the background).*

***

### Step 5: The Magic Script
Go back to your main terminal (the one inside the bubble). We are going to write the script that connects the Reader, the Clerk, and the Analyst.

Create a file named `chat.py` and paste this exact code inside:

```python
import os
from docling.document_converter import DocumentConverter
from llama_index.core import Document, VectorStoreIndex, Settings
from llama_index.llms.ollama import Ollama
from llama_index.embeddings.ollama import OllamaEmbedding

# 1. Connect to Ollama (The Brains)
# We set a long timeout (300 seconds) so the model has time to think about big tables.
Settings.llm = Ollama(model="gemma-4-31b", request_timeout=300.0)
Settings.embed_model = OllamaEmbedding(model_name="nomic-embed-text")

# 2. Setup Docling (The Reader)
converter = DocumentConverter()
documents = []
pdf_folder = "./pdf_data"

print("--- Starting the PDF Engine ---")

# 3. Read every PDF in the folder
for filename in os.listdir(pdf_folder):
    if filename.endswith(".pdf"):
        filepath = os.path.join(pdf_folder, filename)
        print(f"Reading: {filename}...")
        
        # Convert PDF to clean text/tables
        result = converter.convert(filepath)
        markdown_text = result.document.export_to_markdown()
        
        # VERY IMPORTANT: We attach the filename to the text. 
        # This is how the AI knows which company/year the data came from when cross-referencing!
        documents.append(Document(text=markdown_text, metadata={"file_name": filename}))

# 4. Create the Filing Cabinet (The Index)
print("Organizing data into the index...")
index = VectorStoreIndex.from_documents(documents)
query_engine = index.as_query_engine(similarity_top_k=5) # 'top_k=5' means it will grab the 5 most relevant chunks to answer your question.

print("\n--- Engine Ready! Type 'exit' to quit. ---")

# 5. The Chat Loop
while True:
    user_question = input("\nAsk a question: ")
    
    if user_question.lower() == 'exit':
        break
        
    print("Thinking...")
    # This searches the index, sends the data to Gemma, and prints the answer
    answer = query_engine.query(user_question)
    print(f"\n[Gemma]: {answer}")
```

***

### Step 6: Running the System & Cross-Referencing
With your PDFs in the `pdf_data` folder, run the script:
```bash
python chat.py
```
*Gotcha warning: The very first time you run this, Docling will pause for a few minutes to download about 3GB of vision models from HuggingFace. Let it finish. It only happens once.*

Once it says **"Engine Ready!"**, you can start asking natural language questions. 

**How to get the best Cross-Referencing Answers:**
Because LlamaIndex chunks the documents and we tagged them with metadata (`"file_name": filename`), you can ask direct comparative questions. 
* *Example 1:* "Based on the documents, what was the gross profit margin in Tesla_2025.pdf compared to Ford_2025.pdf?"
* *Example 2:* "List the primary risk factors mentioned in CompanyA.pdf and tell me if CompanyB.pdf mentions those same risks."

The system will search the index for "gross profit margin" in both files, pull those specific tables, feed them to Gemma, and Gemma will generate a comparison. 

**To stop:** Type `exit`. 
**To leave the bubble:** Type `deactivate` in your terminal. You are now safely back in your normal Mac environment, ready to code with Aider.
