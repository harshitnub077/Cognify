from langchain_google_genai import GoogleGenerativeAIEmbeddings
import os
from dotenv import load_dotenv

load_dotenv()

try:
    embedder = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-2",
        google_api_key=os.environ.get('GEMINI_API_KEY')
    )
    res = embedder.embed_query("test query")
    print(f"Success! Embedded length: {len(res)}")
except Exception as e:
    print(f"Error: {e}")
