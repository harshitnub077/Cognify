// backend/src/utils/keywords.js — keyword extractor utility

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with',
  'by','from','up','about','into','through','during','is','are','was',
  'were','be','been','being','have','has','had','do','does','did','will',
  'would','could','should','may','might','shall','can','need','dare',
  'ought','used','how','what','why','when','where','who','which','this',
  'that','these','those','i','you','he','she','it','we','they','me',
  'him','her','us','them','my','your','his','its','our','their',
]);

/**
 * Extract meaningful keywords from a string.
 * @param {string} text
 * @param {number} [maxKeywords=10]
 * @returns {string[]}
 */
export function extractKeywords(text, maxKeywords = 10) {
  if (!text) return [];

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !STOP_WORDS.has(word))
    .reduce((acc, word) => {
      // deduplicate
      if (!acc.includes(word)) acc.push(word);
      return acc;
    }, [])
    .slice(0, maxKeywords);
}

/**
 * Score overlap between a video's keywords and profile interests.
 * @param {string[]} videoKeywords
 * @param {Array<{topic: string}>} interests
 * @returns {{ score: number, matched: string[] }}
 */
export function scoreKeywordMatch(videoKeywords, interests) {
  const interestWords = interests
    .flatMap(i => i.topic.toLowerCase().split(/\s+/))
    .filter(w => w.length > 2);

  const matched = videoKeywords.filter(k =>
    interestWords.some(iw => k.includes(iw) || iw.includes(k))
  );

  const score = interestWords.length
    ? Math.round((matched.length / interestWords.length) * 100)
    : 0;

  return { score, matched };
}
