import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { z } from 'zod';

const router = Router();

const onboardingSchema = z.object({
  identities: z.array(z.string()),
  reduceGoals: z.array(z.string()),
  platforms: z.array(z.string())
});

// POST /api/user/onboarding
router.post('/onboarding', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const validation = onboardingSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ error: validation.error.issues[0].message });
    }

    const { identities, reduceGoals, platforms } = validation.data;

    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: {
        focusAreas: identities,
        reduceGoals,
        platforms,
        onboarded: true,
      },
      create: {
        userId,
        focusAreas: identities,
        reduceGoals,
        platforms,
        onboarded: true,
        displayName: req.user.user_metadata?.full_name || '',
        avatarUrl: req.user.user_metadata?.avatar_url || '',
      }
    });

    res.json({ success: true, profile: { ...profile, identities: profile.focusAreas || [] } });
  } catch (error) {
    console.error('Error during onboarding:', error);
    res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});

// GET /api/user/profile
router.get('/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({ profile: { ...profile, identities: profile.focusAreas || [] } });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PATCH /api/user/profile — update display name
router.patch('/profile', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const { displayName } = req.body;
    if (!displayName || typeof displayName !== 'string' || displayName.trim().length === 0) {
      return res.status(400).json({ error: 'Display name is required' });
    }
    const profile = await prisma.userProfile.update({
      where: { userId },
      data: { displayName: displayName.trim() }
    });
    res.json({ success: true, profile: { ...profile, identities: profile.focusAreas || [] } });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /api/user/reset-demo
router.post('/reset-demo', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user.id;
    const email = req.user.email;

    // VERY IMPORTANT: Only allow wiping if the user is the demo account!
    if (email !== 'demo@example.com') {
      return res.status(403).json({ error: 'Cannot reset data for real user accounts.' });
    }

    // Wipe all analytics data to start from zero for the live demo
    await prisma.$transaction([
      prisma.contentLog.deleteMany({ where: { userId } }),
      prisma.driftScore.deleteMany({ where: { userId } }),
      prisma.streak.deleteMany({ where: { userId } }),
      // Keeping UserProfile so they don't have to redo onboarding every time
    ]);

    res.json({ success: true, message: 'Demo data reset successfully.' });
  } catch (error) {
    console.error('Error resetting demo user:', error);
    res.status(500).json({ error: 'Failed to reset demo account' });
  }
});

export default router;
