/**
 * semanticClassifier.js
 * 
 * Phase 1 of the FeedShift V2 AI upgrade.
 * Uses cosine similarity on pre-computed interest embeddings to determine
 * if a video is relevant to the user's interests.
 *
 * Falls back gracefully to heuristic scoring if OpenAI is unavailable.
 */

import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('placeholder')
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// In-memory cache for interest embeddings (keyed by topic name)
const embeddingCache = new Map();

/**
 * Compute cosine similarity between two vectors.
 */
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Embed a text string using OpenAI's text-embedding-3-small model.
 * Extremely cheap: $0.02 per 1M tokens.
 */
async function embedText(text) {
  if (!openai) return null;
  const cacheKey = text.substring(0, 100);
  if (embeddingCache.has(cacheKey)) return embeddingCache.get(cacheKey);

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.substring(0, 512),
    });
    const embedding = response.data[0].embedding;
    embeddingCache.set(cacheKey, embedding);
    return embedding;
  } catch (e) {
    console.error('[SemanticClassifier] Embedding failed:', e.message);
    return null;
  }
}

/**
 * Pre-compute interest embeddings for a user profile.
 * Call this when a user saves their profile to warm the cache.
 */
export async function preComputeInterestEmbeddings(interests) {
  if (!openai) return {};
  
  const embeddings = {};
  for (const interest of interests) {
    const topic = interest.topic || interest;
    // Enriched query gives much better embeddings than just the topic name
    const query = `${topic} educational tutorial explanation lecture concept deep dive`;
    const embedding = await embedText(query);
    if (embedding) {
      embeddings[topic] = embedding;
    }
  }
  console.log(`[SemanticClassifier] Pre-computed embeddings for ${Object.keys(embeddings).length} interests`);
  return embeddings;
}

/**
 * Classify a video using semantic similarity against user's interest embeddings.
 * 
 * @param {object} video - { title, channelName, description, tags }
 * @param {object} profileSnapshot - { interests, interestEmbeddings }
 * @returns {{ verdict, confidence, reason, topicMatch }}
 */
export async function semanticClassify(video, profileSnapshot) {
  const { interestEmbeddings = {} } = profileSnapshot;
  
  // Build rich text from all available video metadata
  const videoText = [
    video.title,
    video.channelName,
    video.description?.substring(0, 400) || '',
    (video.tags || []).slice(0, 15).join(' '),
  ].join(' ').trim().toLowerCase();

  if (!openai || Object.keys(interestEmbeddings).length === 0) {
    // FALLBACK: Local Heuristic using EXPANDED_TOPIC_KEYWORDS
    console.log(`[SemanticClassifier] No embeddings. Using local heuristic for "${video.title}"`);
    
    // Distraction Check
    const distractions = ['prank', 'vlog', 'funny', 'fail', 'reaction', 'drama', 'gossip', 'celebrity', 'tiktok', 'shorts', 'gaming', 'playthrough', 'unboxing', 'drama', 'beef'];
    if (distractions.some(d => videoText.includes(d))) {
      return { verdict: 'BLOCK', confidence: 0.9, reason: 'Matched distraction pattern (Heuristic)', topicMatch: 'None' };
    }

    // Match Interests
    for (const interest of profileSnapshot.interests || []) {
      const topic = (interest.topic || interest).toLowerCase();
      const keywords = EXPANDED_TOPIC_KEYWORDS[topic] || [topic];
      
      let matchCount = 0;
      for (const kw of keywords) {
        if (videoText.includes(kw)) matchCount++;
      }
      
      if (matchCount >= 2 || (matchCount >= 1 && videoText.includes(topic))) {
        return { verdict: 'ALLOW', confidence: 0.8, reason: `Matched keywords for ${topic} (Heuristic)`, topicMatch: topic };
      }
    }

    // If it reaches here, local heuristic is unsure.
    return null;
  }

  const videoEmbedding = await embedText(videoText);
  if (!videoEmbedding) return null;

  let maxSimilarity = 0;
  let bestTopic = null;

  for (const [topic, interestEmb] of Object.entries(interestEmbeddings)) {
    const sim = cosineSimilarity(videoEmbedding, interestEmb);
    if (sim > maxSimilarity) {
      maxSimilarity = sim;
      bestTopic = topic;
    }
  }

  console.log(`[SemanticClassifier] "${video.title.substring(0, 40)}" → similarity: ${maxSimilarity.toFixed(3)} (${bestTopic})`);

  // Thresholds tuned for educational content filtering
  if (maxSimilarity >= 0.72) {
    return { verdict: 'ALLOW', confidence: maxSimilarity, reason: `High semantic match: ${bestTopic}`, topicMatch: bestTopic };
  }
  if (maxSimilarity <= 0.45) {
    return { verdict: 'BLOCK', confidence: 1 - maxSimilarity, reason: `Low semantic similarity (${maxSimilarity.toFixed(2)})`, topicMatch: 'None' };
  }

  // Uncertain zone (0.45-0.72) — return null to let LLM decide
  return null;
}

/**
 * Heuristic-based topic keyword expansion.
 * Used when OpenAI embeddings are not available.
 * Maps topic names → related keywords for broader matching.
 */
export const EXPANDED_TOPIC_KEYWORDS = {
  'machine learning': [
    'machine learning', 'neural network', 'deep learning', 'tensorflow', 'pytorch',
    'gradient descent', 'backpropagation', 'transformer', 'llm', 'gpt', 'bert',
    'regression', 'classification', 'clustering', 'reinforcement learning',
    'xgboost', 'feature engineering', 'model training', 'overfitting',
    'hyperparameter', 'embedding', 'attention mechanism', 'diffusion model',
    'generative ai', 'nlp', 'natural language', 'computer vision', 'cnn', 'rnn', 'lstm',
  ],
  'artificial intelligence': [
    'artificial intelligence', 'machine learning', 'deep learning', 'neural',
    'gpt', 'llm', 'chatgpt', 'openai', 'generative', 'nlp', 'computer vision', 'algorithm',
  ],
  'mathematics': [
    'mathematics', 'math', 'calculus', 'algebra', 'linear algebra', 'statistics',
    'probability', 'theorem', 'proof', 'equation', 'integral', 'derivative',
    'matrix', 'vector', 'topology', 'geometry', 'number theory', 'discrete math',
    'differential', 'fourier', 'combinatorics', 'trigonometry',
  ],
  'computer science': [
    'computer science', 'algorithm', 'data structure', 'programming', 'software',
    'operating system', 'networking', 'database', 'complexity', 'big o', 'sorting',
    'graph theory', 'recursion', 'dynamic programming', 'compiler', 'system design',
    'distributed system', 'cloud computing', 'devops', 'linux',
  ],
  'programming': [
    'programming', 'coding', 'code', 'developer', 'software', 'python', 'javascript',
    'typescript', 'java', 'c++', 'rust', 'golang', 'react', 'nextjs', 'node', 'api',
    'backend', 'frontend', 'fullstack', 'web dev', 'tutorial', 'debug', 'refactor',
    'github', 'git', 'open source', 'framework', 'library',
  ],
  'physics': [
    'physics', 'quantum', 'relativity', 'mechanics', 'thermodynamics',
    'electromagnetism', 'optics', 'wave', 'particle', 'force', 'energy',
    'entropy', 'spacetime', 'gravity', 'nuclear', 'astrophysics', 'cosmology',
    'string theory', 'feynman',
  ],
  'data science': [
    'data science', 'data analysis', 'pandas', 'numpy', 'visualization',
    'matplotlib', 'seaborn', 'tableau', 'sql', 'big data', 'spark',
    'etl', 'analytics', 'dataset', 'kaggle', 'exploratory data analysis',
  ],
  'software engineering': [
    'software engineering', 'system design', 'architecture', 'design pattern',
    'solid principles', 'clean code', 'refactoring', 'microservice', 'api design',
    'ci/cd', 'testing', 'unit test', 'devops', 'agile', 'scrum', 'code review',
  ],
  'philosophy': [
    'philosophy', 'ethics', 'epistemology', 'metaphysics', 'logic', 'consciousness',
    'existentialism', 'stoicism', 'nietzsche', 'kant', 'plato', 'aristotle',
    'determinism', 'free will', 'moral', 'virtue', 'reason',
  ],
  'history': [
    'history', 'historical', 'ancient', 'medieval', 'civilization', 'empire',
    'war', 'revolution', 'century', 'archaeology', 'culture', 'dynasty', 'colonial', 'world war',
  ],
  'productivity': [
    'productivity', 'time management', 'focus', 'deep work', 'habit',
    'goal setting', 'pomodoro', 'study tips', 'workflow', 'organization',
    'efficiency', 'discipline', 'self improvement', 'mindset',
  ],
  'entrepreneurship': [
    'entrepreneurship', 'startup', 'business', 'founder', 'venture capital',
    'pitch', 'product market fit', 'saas', 'revenue', 'growth', 'marketing',
    'branding', 'investment', 'fundraising',
  ],
  'finance': [
    'finance', 'investing', 'stock', 'market', 'portfolio', 'dividend',
    'index fund', 'etf', 'valuation', 'financial', 'economics',
    'compound interest', 'asset', 'equity', 'bond',
  ],
  'neuroscience': [
    'neuroscience', 'brain', 'neuron', 'cognition', 'cognitive', 'memory',
    'consciousness', 'synapse', 'dopamine', 'psychology', 'behavior', 'perception',
  ],
  'biology': [
    'biology', 'cell', 'genetics', 'dna', 'rna', 'protein', 'evolution',
    'ecology', 'microbiology', 'anatomy', 'genome', 'crispr',
  ],
  'chemistry': [
    'chemistry', 'organic chemistry', 'reaction', 'molecule', 'element',
    'periodic table', 'bond', 'acid', 'base', 'biochemistry',
  ],
  'economics': [
    'economics', 'macroeconomics', 'microeconomics', 'gdp', 'inflation',
    'monetary policy', 'fiscal', 'supply', 'demand', 'game theory',
  ],
};
