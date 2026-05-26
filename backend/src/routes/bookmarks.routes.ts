import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

// Get all bookmarks
router.get('/', requireAuth, async (req: any, res) => {
  try {
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ data: bookmarks });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bookmarks' });
  }
});

// Add bookmark
router.post('/', requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    
    // Check limit (assume 50 for free users)
    const count = await prisma.bookmark.count({ where: { userId } });
    // In a real app, check user's tier. We'll enforce 50 globally for now.
    if (count >= 50) {
      return res.status(403).json({ error: 'Bookmark limit reached. Upgrade to Pro for unlimited.' });
    }

    const { url, title, thumbnail, platform, duration, viewCount, score, dominantEmotion, emotions } = req.body;

    const bookmark = await prisma.bookmark.upsert({
      where: {
        userId_url: { userId, url }
      },
      update: {}, // Do nothing if it exists
      create: {
        userId,
        url,
        title,
        thumbnail,
        platform,
        duration,
        viewCount,
        score,
        dominantEmotion,
        emotions
      }
    });

    res.json({ data: bookmark });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add bookmark' });
  }
});

// Remove bookmark
router.delete('/:id', requireAuth, async (req: any, res) => {
  try {
    await prisma.bookmark.deleteMany({
      where: { 
        id: req.params.id,
        userId: req.user.id 
      }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove bookmark' });
  }
});

export default router;
