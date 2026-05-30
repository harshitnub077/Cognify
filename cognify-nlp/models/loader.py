from transformers import pipeline
from sentence_transformers import SentenceTransformer
from config import config

class ModelLoader:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelLoader, cls).__new__(cls)
            cls._instance.emotion_classifier = None
            cls._instance.alignment_model = None
            cls._instance.is_loaded = False
        return cls._instance

    def load_models(self):
        if self.is_loaded:
            return
        print("Loading HuggingFace models (this may take a moment on first run)...")
        try:
            self.emotion_classifier = pipeline("text-classification", model=config.EMOTION_MODEL, top_k=None)
            self.alignment_model = SentenceTransformer(config.ALIGNMENT_MODEL)
            self.is_loaded = True
            print("Cognify NLP service ready. Models loaded.")
        except Exception as e:
            print(f"Failed to load models: {e}")

model_loader = ModelLoader()
