import os
import json
import re
import google.generativeai as genai
from dotenv import load_dotenv
from .groq_client import analyze_with_groq

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-2.0-flash')

def extract_json(text: str) -> dict:
    try:
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        return json.loads(text)
    except Exception as e:
        raise ValueError(f"Failed to parse JSON: {e}")

def generate_insight_and_score(title: str, goals: list[str], transcript: str = None) -> dict:
    if transcript:
        transcript_section = f"""
        VIDEO TRANSCRIPT (WITH TIMESTAMPS):
        {transcript}
        """
    else:
        transcript_section = """
        (NO TRANSCRIPT AVAILABLE - Please evaluate based purely on the Title. Do not hallucinate dialogue.)
        """

    prompt = f"""
    You are an elite productivity and goal-alignment AI. The user wants to avoid doomscrolling and only watch content that actively helps them achieve their goals.
    
    USER'S FOCUS GOALS: "{' '.join(goals)}"
    
    They are considering watching a YouTube video titled: "{title}".
    {transcript_section}
    
    INSTRUCTIONS:
    1. Deeply analyze the substance, tone, and intent of the video. 
    2. Determine if the video is "GOOD" (provides actionable, high-quality information directly related to their goals) or "BAD" (clickbait, entertainment disguised as education, or a complete distraction).
    3. Calculate a Goal Match Percentage (0-100).
        - 90-100: Essential viewing, highly actionable and directly aligned.
        - 70-89: Relevant and useful, but maybe broad or tangential.
        - 40-69: Caution. Mostly entertainment or loosely related.
        - 0-39: Skip. Distraction, clickbait, or totally unrelated to their goals.
    4. Provide a brutal, honest insight (1-2 sentences). Be polite and constructive, but firm. Reference specific parts of the video if a transcript was provided.
    
    Respond ONLY with a valid JSON object in this exact format:
    {{
      "score": <number 0-100>,
      "verdict": "<watch|caution|skip>",
      "text": "<1-2 sentence constructive insight referencing actual spoken content if available>",
      "identity_impact": "<1 sentence on how this affects their focus>"
    }}
    """
    
    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json",
            )
        )
        return extract_json(response.text)
    except Exception as e:
        print(f"Gemini API error: {e}")
        print("Falling back to Groq LLaMA 3...")
        fallback_text = analyze_with_groq(prompt)
        print("RAW GROQ RESPONSE:")
        print(repr(fallback_text))
        if fallback_text:
            try:
                return extract_json(fallback_text)
            except Exception as parse_err:
                print(f"JSON parsing error for Groq fallback: {parse_err}")
                
        return {
            "score": 0,
            "verdict": "caution",
            "text": "AI Rate Limit Exceeded. Please try again in a minute, or add a valid Groq API key in your .env file.",
            "identity_impact": "Evaluated via fallback due to API limits."
        }


