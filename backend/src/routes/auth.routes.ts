import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { analysisQueue } from '../lib/queue';

const router = Router();

// Route to sync Supabase user with our database and fetch their profile
router.post('/sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Upsert User
    const dbUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        id: user.id,
        email: user.email,
      },
    });

    // Upsert Profile
    const profile = await prisma.userProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        displayName: user.user_metadata?.full_name || '',
        avatarUrl: user.user_metadata?.avatar_url || '',
      },
    });

    // (Removed mock history queueing to prevent rate limit exhaustion)

    res.json({ user: dbUser, profile: { ...profile, identities: profile.focusAreas || [] } });
  } catch (error) {
    console.error('Error syncing user:', error);
    res.status(500).json({ error: 'Failed to sync user' });
  }
});

// Update Profile (Onboarding)
router.post('/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { focusAreas, onboarded } = req.body;
    const userId = req.user.id;

    const profile = await prisma.userProfile.update({
      where: { userId },
      data: {
        focusAreas,
        onboarded: onboarded ?? true,
      },
    });

    res.json({ profile });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
