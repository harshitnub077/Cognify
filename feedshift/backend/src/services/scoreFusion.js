import { EDUCATIONAL_CATEGORIES, ENTERTAINMENT_CATEGORIES } from './youtubeEnricher.js';

export function computeFinalVerdict({ semantic, llm, vision, ytCategory, channelTrust, tolerance }) {
  // Weighted score fusion
  const WEIGHTS = {
    semantic: 0.35,    // Semantic similarity to interests
    llm: 0.35,         // LLM agent decision
    vision: 0.15,      // Thumbnail analysis
    category: 0.10,    // YouTube category signal
    channelTrust: 0.05 // Historical channel trust
  };

  const semanticScore = semantic?.confidence || semantic?.score || 0.5; // fallback neutral
  const llmScore = llm?.verdict === 'ALLOW' ? llm.confidence : (1 - (llm?.confidence || 0.5));
  
  const visionScore = vision?.contentType === 'educational' ? 0.9 : 
                      vision?.isClickbait ? 0.1 : 0.5;
                      
  const categoryScore = EDUCATIONAL_CATEGORIES.includes(ytCategory) ? 0.9 :
                        ENTERTAINMENT_CATEGORIES.includes(ytCategory) ? 0.1 : 0.5;
                        
  const trustScore = Math.min((channelTrust || 50) / 100, 1.0);

  const finalScore = 
    WEIGHTS.semantic * semanticScore +
    WEIGHTS.llm * llmScore +
    WEIGHTS.vision * visionScore +
    WEIGHTS.category * categoryScore +
    WEIGHTS.channelTrust * trustScore;

  // Dynamic threshold based on user's tolerance setting (0-100)
  // tolerance=0 → 0.60 (strict), tolerance=50 → 0.50, tolerance=100 → 0.40
  const tol = typeof tolerance === 'number' ? tolerance : 50;
  const threshold = 0.40 + (0.20 * (1 - tol / 100));

  return {
    verdict: finalScore >= threshold ? 'ALLOW' : 'BLOCK',
    confidence: finalScore,
    threshold,
    breakdown: { semanticScore, llmScore, visionScore, categoryScore, trustScore }
  };
}
