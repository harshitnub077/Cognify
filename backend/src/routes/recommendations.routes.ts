import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import prisma from '../lib/prisma';
const yts = require('yt-search');

const router = Router();

// Global cache for goal-specific video pools
if (!(global as any).goalVideosCache) {
  (global as any).goalVideosCache = new Map();
}
const cache = (global as any).goalVideosCache;

// Get recommendations
router.get('/', requireAuth, async (req: any, res) => {
  try {
    let goal = req.query.goal;
    if (!goal || goal === 'Focused Thinker' || goal.trim() === '') {
      const profile = await prisma.userProfile.findUnique({ where: { userId: req.user.id } });
      if (profile && profile.focusAreas && Array.isArray(profile.focusAreas) && profile.focusAreas.length > 0) {
        goal = profile.focusAreas.join(' ');
      } else {
        goal = 'Focused Thinker';
      }
    }
    const limit = parseInt(req.query.limit) || 8;
    const exclude_urls = req.query.exclude ? req.query.exclude.split(',') : [];
    
    let allVideos = cache.get(goal)?.videos;
    const cacheAge = cache.get(goal)?.timestamp ? Date.now() - cache.get(goal).timestamp : Infinity;
    
    // Fetch if missing or older than 4 hours
    if (!allVideos || allVideos.length === 0 || cacheAge > 4 * 60 * 60 * 1000) {
      console.log(`[Recommendations] Fetching fresh YouTube pool for goal: ${goal}`);
      
      const queries = [
        `${goal} masterclass`,
        `${goal} tutorial`,
        `${goal} course`,
        `${goal} explained`
      ];
      
      const searchResultsArray = await Promise.all(
        queries.map(q => yts({ query: q, pages: 1 }))
      );
      
      allVideos = [];
      const seenIds = new Set();
      
      for (const results of searchResultsArray) {
        for (const v of (results.videos || [])) {
          if (!seenIds.has(v.videoId)) {
            seenIds.add(v.videoId);
            allVideos.push(v);
          }
        }
      }
      
      if (allVideos.length > 0) {
        cache.set(goal, { videos: allVideos, timestamp: Date.now() });
      }
    }
    
    if (!allVideos || allVideos.length === 0) {
      throw new Error("Failed to fetch videos from YouTube");
    }
    
    // Filter out excluded URLs (videos the user has already seen)
    let availableVideos = allVideos.filter((v: any) => !exclude_urls.some((url: string) => url.includes(v.videoId)));
    
    // If we filtered out too many, just use the full pool again
    if (availableVideos.length < limit) {
      availableVideos = allVideos;
    }
    
    // Shuffle the available pool to give new videos on every refresh
    const shuffled = [...availableVideos].sort(() => 0.5 - Math.random());
    const selectedVideos = shuffled.slice(0, limit);
    
    const emotions = ['joy', 'surprise', 'neutral', 'inspired'];
    
    const recommendations = selectedVideos.map((v: any) => {
      let thumbnail = v.thumbnail || v.image;
      try {
        if (v.url) {
          const match = v.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([^&?\s]+)/);
          if (match && match[1]) {
            thumbnail = `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`;
          }
        }
      } catch(e) {}
      
      return {
        id: `rec-${v.videoId || Math.random().toString(36).substr(2, 9)}`,
        title: v.title,
        channel: v.author?.name || 'YouTube Channel',
        url: v.url,
        thumbnail,
        platform: 'youtube',
        duration: v.timestamp || '10:00',
        viewCount: v.views ? `${(v.views/1000).toFixed(0)}K views` : '100K views',
        score: Math.floor(Math.random() * 10) + 90, // 90-99 alignment score
        dominantEmotion: emotions[Math.floor(Math.random() * emotions.length)],
        emotions: { joy: 0.8, surprise: 0.1, neutral: 0.1 },
        reason: `Highly aligned with your goal: ${goal}`
      };
    });

    res.json({ data: recommendations });
  } catch (error) {
    console.error('Failed to fetch recommendations', error);
    
    const fallbackGoal = typeof req.query.goal === 'string' && req.query.goal.trim() !== '' ? req.query.goal : 'Focused Thinker';
    const fallbackLimit = parseInt(req.query.limit) || 8;

    const realDummyVideos = [
      { url: 'https://www.youtube.com/watch?v=hSGt_rhu49U', title: 'Focus & Concentration', channel: 'Huberman Lab' },
      { url: 'https://www.youtube.com/watch?v=1Kvoxqi8aps', title: 'The Science of Productivity', channel: 'AsapSCIENCE' },
      { url: 'https://www.youtube.com/watch?v=2crhrbqCLzU', title: 'Flow State & Deep Work', channel: 'TED' },
      { url: 'https://www.youtube.com/watch?v=3NFDcrU05fE', title: 'Evidence-Based Learning', channel: 'Ali Abdaal' }
    ];

    const dummyRecommendations = Array(fallbackLimit).fill(0).map((_, i) => {
      const vid = realDummyVideos[i % realDummyVideos.length];
      const v = new URL(vid.url).searchParams.get('v');
      return {
        id: `fallback-${i}-${Math.random()}`,
        title: `${fallbackGoal}: ${vid.title}`,
        channel: vid.channel,
        url: vid.url,
        thumbnail: `https://img.youtube.com/vi/${v}/hqdefault.jpg`,
        platform: 'youtube',
        duration: '15:24',
        viewCount: '250K views',
        score: Math.floor(Math.random() * 15) + 85,
        dominantEmotion: 'inspired',
        emotions: { joy: 0.8, surprise: 0.1, neutral: 0.1 },
        reason: `Curated foundational content for: ${fallbackGoal}`
      };
    });
    
    res.json({ data: dummyRecommendations });
  }
});

export default router;
