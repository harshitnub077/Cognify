import os
import asyncio
import pandas as pd
from datasets import Dataset
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_precision, context_recall

# Import our RAG system components
# Assuming you run this from the cognify-nlp directory
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.rag_pipeline import rag_recommend, retriever

# -------------------------------------------------------------------
# Configuration for Evaluation
# To keep this cost-effective, we can configure RAGAS to use Groq/Gemini 
# or just use standard OpenAI if evaluating locally.
# For this script, we'll assume standard RAGAS setup (OpenAI required for metrics)
# In a true zero-cost setup, you'd wrap Groq with LangchainLLMWrapper for RAGAS.
# -------------------------------------------------------------------

# 1. Define Synthetic Test Dataset (Ground Truth)
# In reality, this would be a larger JSON/CSV of verified good recommendations.
test_cases = [
    {
        "question": "I want to get better at deep work and software engineering, but I'm feeling distracted. Drift: 75.",
        "goals": ["Deep Work", "Software Engineering"],
        "emotion": {"dominant": "distracted"},
        "drift": 75.0,
        "ground_truth": "Recommendations should focus on focus techniques, Cal Newport, or advanced programming concepts to get back on track."
    },
    {
        "question": "I feel unmotivated and my goal is fitness. Drift: 60.",
        "goals": ["Fitness", "Health"],
        "emotion": {"dominant": "unmotivated"},
        "drift": 60.0,
        "ground_truth": "Recommendations should include workout motivation, gym routines, or health science."
    }
]

async def generate_rag_outputs():
    print("Generating answers from RAG pipeline...")
    questions = []
    answers = []
    contexts = []
    ground_truths = []
    
    for case in test_cases:
        # Retrieve context (simulate what rag_recommend does internally)
        # We manually retrieve here to feed the exact context to RAGAS
        from services.rag_pipeline import rewrite_goal_queries
        queries = await rewrite_goal_queries(case["goals"][0])
        retrieved_docs = []
        for q in queries:
            docs = await retriever.ainvoke(q)
            retrieved_docs.extend(docs)
        
        # Deduplicate
        seen = set()
        unique_docs = []
        for doc in retrieved_docs:
            if doc.page_content not in seen:
                seen.add(doc.page_content)
                unique_docs.append(doc)
                
        context_texts = [d.page_content for d in unique_docs[:5]]
        
        # Get actual generation
        recs = await rag_recommend(case["goals"], case["emotion"], case["drift"], limit=3)
        # Format the recommendation output into a single string answer for evaluation
        answer_text = "\n".join([f"- {r.get('title', 'Video')}: {r.get('reason', '')}" for r in recs])
        
        questions.append(case["question"])
        answers.append(answer_text if answer_text else "No recommendations found.")
        contexts.append(context_texts if context_texts else ["No context retrieved."])
        ground_truths.append(case["ground_truth"])

    return Dataset.from_dict({
        "question": questions,
        "answer": answers,
        "contexts": contexts,
        "ground_truth": ground_truths
    })


async def main():
    # 1. Generate Dataset
    eval_dataset = await generate_rag_outputs()
    
    print("\nStarting RAGAS Evaluation...")
    # 2. Run Evaluation
    # NOTE: You will need OPENAI_API_KEY set in your environment for standard RAGAS metrics
    # Alternatively, you can configure RAGAS to use local models or Groq via Langchain.
    try:
        result = evaluate(
            eval_dataset,
            metrics=[
                faithfulness,
                answer_relevancy,
                context_precision,
                context_recall
            ],
            raise_exceptions=False
        )
        
        print("\n=== Evaluation Results ===")
        print(result)
        
        # Export to CSV for analysis
        df = result.to_pandas()
        df.to_csv("rag_evaluation_results.csv", index=False)
        print("Results saved to rag_evaluation_results.csv")
        
    except Exception as e:
        print(f"\nEvaluation failed (make sure OPENAI_API_KEY is set or configure a custom LLM for RAGAS):\n{e}")

if __name__ == "__main__":
    asyncio.run(main())
