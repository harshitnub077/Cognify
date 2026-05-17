import express from 'express';

const router = express.Router();

// In-memory diet log store (receives synced logs from the extension)
const dietLogs = new Map(); // userId -> array of log entries

/**
 * POST /stats/sync
 * Extension syncs its local diet_log to the backend for the dashboard to read.
 */
router.post('/sync', (req, res) => {
  try {
    const { userId, logs } = req.body;
    if (!userId || !Array.isArray(logs)) {
      return res.status(400).json({ error: 'Missing userId or logs array' });
    }

    // Merge incoming logs with existing (dedupe by videoId + date)
    const existing = dietLogs.get(userId) || [];
    const existingKeys = new Set(existing.map(l => `${l.videoId}_${l.date}`));
    
    const newEntries = logs.filter(l => !existingKeys.has(`${l.videoId}_${l.date}`));
    const merged = [...existing, ...newEntries];
    
    // Keep only last 1000 entries per user
    if (merged.length > 1000) merged.splice(0, merged.length - 1000);
    
    dietLogs.set(userId, merged);
    
    res.json({ synced: newEntries.length, total: merged.length });
  } catch (err) {
    console.error('[Stats] Sync error:', err);
    res.status(500).json({ error: 'Sync failed' });
  }
});

/**
 * GET /stats/:userId
 * Dashboard reads aggregated stats for a user.
 */
router.get('/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 7 } = req.query;
    
    const logs = dietLogs.get(userId) || [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(days));
    
    const recentLogs = logs.filter(l => new Date(l.date) >= cutoff);
    
    const totalVideos = recentLogs.length;
    const blocked = recentLogs.filter(l => l.verdict === 'BLOCK').length;
    const allowed = recentLogs.filter(l => l.verdict === 'ALLOW').length;
    const overrides = recentLogs.filter(l => l.verdict === 'OVERRIDE').length;
    
    // Time saved estimate (8 min per blocked video)
    const minutesSaved = blocked * 8;
    
    // Daily breakdown
    const dailyMap = new Map();
    recentLogs.forEach(l => {
      const dateStr = new Date(l.date).toISOString().split('T')[0];
      if (!dailyMap.has(dateStr)) {
        dailyMap.set(dateStr, { date: dateStr, blocked: 0, allowed: 0, overrides: 0 });
      }
      const day = dailyMap.get(dateStr);
      if (l.verdict === 'BLOCK') day.blocked++;
      else if (l.verdict === 'ALLOW') day.allowed++;
      else if (l.verdict === 'OVERRIDE') day.overrides++;
    });
    
    // Top blocked channels
    const channelBlockCount = {};
    recentLogs.filter(l => l.verdict === 'BLOCK').forEach(l => {
      const ch = l.channel || 'Unknown';
      channelBlockCount[ch] = (channelBlockCount[ch] || 0) + 1;
    });
    const topBlockedChannels = Object.entries(channelBlockCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([channel, count]) => ({ channel, count }));
    
    // Top allowed channels
    const channelAllowCount = {};
    recentLogs.filter(l => l.verdict === 'ALLOW').forEach(l => {
      const ch = l.channel || 'Unknown';
      channelAllowCount[ch] = (channelAllowCount[ch] || 0) + 1;
    });
    const topAllowedChannels = Object.entries(channelAllowCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([channel, count]) => ({ channel, count }));
    
    // Block reasons breakdown
    const reasonCount = {};
    recentLogs.filter(l => l.verdict === 'BLOCK').forEach(l => {
      const reason = l.reason || 'Unknown';
      reasonCount[reason] = (reasonCount[reason] || 0) + 1;
    });
    const topReasons = Object.entries(reasonCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([reason, count]) => ({ reason, count }));

    res.json({
      summary: {
        totalVideos,
        blocked,
        allowed,
        overrides,
        minutesSaved,
        hoursSaved: (minutesSaved / 60).toFixed(1),
        blockRate: totalVideos > 0 ? Math.round((blocked / totalVideos) * 100) : 0,
      },
      daily: Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
      topBlockedChannels,
      topAllowedChannels,
      topReasons,
    });
  } catch (err) {
    console.error('[Stats] Error:', err);
    res.status(500).json({ error: 'Stats fetch failed' });
  }
});

export default router;
