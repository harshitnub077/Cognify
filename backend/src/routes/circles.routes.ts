import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = Router();

// Create Circle
router.post('/create', requireAuth, async (req: any, res) => {
  try {
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const circle = await prisma.circle.create({
      data: {
        name: req.body.name,
        inviteCode,
        createdBy: req.user.id,
        members: {
          create: [{ userId: req.user.id }]
        }
      }
    });
    
    res.json({ data: circle });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create circle' });
  }
});

// Join Circle
router.post('/join', requireAuth, async (req: any, res) => {
  try {
    const circle = await prisma.circle.findUnique({
      where: { inviteCode: req.body.inviteCode.toUpperCase() }
    });
    
    if (!circle) return res.status(404).json({ error: 'Invalid invite code' });
    
    await prisma.circleMember.create({
      data: {
        circleId: circle.id,
        userId: req.user.id
      }
    });
    
    res.json({ data: circle });
  } catch (error) {
    res.status(500).json({ error: 'Failed to join circle' });
  }
});

// Get User's Circles & Leaderboard
router.get('/', requireAuth, async (req: any, res) => {
  try {
    const memberships = await prisma.circleMember.findMany({
      where: { userId: req.user.id },
      include: {
        circle: {
          include: {
            members: {
              include: { user: { include: { profile: true } } }
            }
          }
        }
      }
    });
    res.json({ data: memberships.map(m => m.circle) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch circles' });
  }
});

export default router;
