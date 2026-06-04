import re
import math
from typing import List, Optional

_embedder = None

def init_semantic_chunking(embedder):
    """Initialize with shared embedder instance."""
    global _embedder
    _embedder = embedder

def get_chunking_embedder():
    return _embedder

def split_into_sentences(text: str) -> List[str]:
    """
    Split text into sentences using simple regex.
    Handles standard punctuation marks.
    """
    if not text:
        return []
    # Splitting by punctuation followed by a space
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    # Filter out empty strings
    return [s.strip() for s in sentences if s.strip()]

def compute_cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Compute cosine similarity between two vectors."""
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    norm1 = math.sqrt(sum(a * a for a in vec1))
    norm2 = math.sqrt(sum(b * b for b in vec2))
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return dot_product / (norm1 * norm2)

def semantic_chunk(text: str, threshold_drop: float = 0.4) -> List[str]:
    """
    Splits text into chunks based on semantic meaning.
    It embeds each sentence, measures similarity with the previous sentence,
    and cuts where similarity drops sharply.
    """
    if _embedder is None:
        raise RuntimeError("Semantic chunking embedder not initialized")

    sentences = split_into_sentences(text)
    if not sentences:
        return []
    
    if len(sentences) == 1:
        return sentences

    # Embed all sentences
    embeddings = _embedder.embed_documents(sentences)
    
    chunks = []
    current_chunk = [sentences[0]]
    
    for i in range(1, len(sentences)):
        sim = compute_cosine_similarity(embeddings[i-1], embeddings[i])
        
        # If similarity is very low, or drops sharply, start a new chunk
        # Since we are using an absolute threshold here, we cut if sim < threshold_drop
        # We can fine-tune this absolute threshold, 0.4 or 0.5 is usually a decent baseline for MiniLM
        # The prompt mentioned "similarity drops sharply". Let's use a dynamic approach.
        # But a simple baseline similarity threshold is more robust for short texts.
        # We will use an absolute threshold of 0.4 for topic boundaries.
        if sim < 0.4:
            # Topic changed
            chunks.append(" ".join(current_chunk))
            current_chunk = [sentences[i]]
        else:
            current_chunk.append(sentences[i])
            
    if current_chunk:
        chunks.append(" ".join(current_chunk))
        
    return chunks

def retrieve_relevant_chunks(chunks: List[str], query: str, top_k: int = 3) -> str:
    """
    Embeds the query and retrieves the top_k most similar chunks.
    Returns them concatenated as a single string.
    """
    if not chunks:
        return ""
    if len(chunks) <= top_k:
        return "\n\n".join(chunks)
        
    if _embedder is None:
        raise RuntimeError("Semantic chunking embedder not initialized")
        
    query_embedding = _embedder.embed_query(query)
    chunk_embeddings = _embedder.embed_documents(chunks)
    
    scored_chunks = []
    for chunk, emb in zip(chunks, chunk_embeddings):
        sim = compute_cosine_similarity(query_embedding, emb)
        scored_chunks.append((sim, chunk))
        
    # Sort by similarity descending
    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    
    top_chunks = [chunk for sim, chunk in scored_chunks[:top_k]]
    return "\n\n...\n\n".join(top_chunks)
