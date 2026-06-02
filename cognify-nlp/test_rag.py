import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

from services.rag_pipeline import rag_recommend, vectorstore

async def main():
    print("Initializing test...")
    # Add a dummy document so retrieval doesn't completely fail
    # In real usage, this would be populated by the indexing phase
    if not vectorstore.client.get_collections().collections:
        print("No collections found, vectorstore failed to init.")
    else:
        # Just to ensure there's at least something
        from langchain_core.documents import Document
        dummy_doc = Document(
            page_content="This is a great video about becoming a data scientist using Python and Pandas.",
            metadata={"video_id": "dummy_vid_1", "toxicity_score": 0.1}
        )
        vectorstore.add_documents([dummy_doc])

    print("Running rag_recommend...")
    goals = ["Learn data science"]
    emotion = {"dominant": "curious", "score": 0.8}
    drift = 0.5
    
    try:
        results = await rag_recommend(goals, emotion, drift)
        print("Results:")
        print(results)
    except Exception as e:
        print(f"Error occurred: {e}")

if __name__ == "__main__":
    asyncio.run(main())
