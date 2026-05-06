/**
 * semanticClassifier.js
 * 
 * FeedShift V3 — Heuristic + keyword-expansion classifier.
 * Uses expanded topic keyword maps for fast, accurate local matching.
 * Falls back to null for the LLM agent to decide ambiguous cases.
 */
/**
 * Classify a video using heuristic keyword matching against user interests.
 * Returns a verdict if confident, or null to defer to the LLM agent.
 * 
 * @param {object} video - { title, channelName, description, tags }
 * @param {object} profileSnapshot - { interests }
 * @returns {{ verdict, confidence, reason, topicMatch } | null}
 */
export async function semanticClassify(video, profileSnapshot) {
  // Build rich text from all available video metadata
  const videoText = [
    video.title,
    video.channelName,
    video.description?.substring(0, 400) || '',
    (video.tags || []).slice(0, 15).join(' '),
  ].join(' ').trim().toLowerCase();

  // Distraction Check — expanded for regional + trending patterns
  const distractions = [
    'prank', 'vlog', 'funny', 'fail', 'reaction', 'drama', 'gossip',
    'celebrity', 'tiktok', 'shorts', 'gaming', 'playthrough', 'unboxing',
    'beef', 'roast video', 'exposed video', 'reply to', 'vs battle',
    'challenge accepted', 'insane reaction', 'free fire', 'bgmi',
    'i quit', 'never again', 'not clickbait', '24 hour challenge',
    'last to leave', 'first to', 'mukbang', 'asmr eating',
  ];
  if (distractions.some(d => videoText.includes(d))) {
    return { verdict: 'BLOCK', confidence: 0.9, reason: 'Matched distraction pattern (Heuristic)', topicMatch: 'None' };
  }

  // Match Interests against expanded keyword maps
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

  // Heuristic is unsure — defer to LLM agent
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
