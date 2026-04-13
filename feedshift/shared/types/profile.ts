// shared/types/profile.ts
// Core shared type definitions for FeedShift

export interface UserProfile {
  userId: string;
  interests: Array<{ topic: string; depth: 'beginner' | 'intermediate' | 'advanced' }>;
  tolerance: { entertainment: number; related: number }; // 0-100
  goal?: { text: string; deadline?: string };
  channelTrust: Record<string, number>; // channelName → 0-100 score
  confirmedTopics: string[];
  blockedTopics: string[];
  studyHours: { weekday: number[]; weekend: number[] };
  installedAt: string;
  lastUpdated: string;
}

export interface VideoMetadata {
  videoId: string;
  title: string;
  channel: string;
  description?: string;
  ytCategoryId?: number;
  duration?: number;
}

export interface ClassificationResult {
  verdict: 'ALLOW' | 'BLOCK';
  confidence: number;
  reason: string;
  layer: 1 | 2 | 3 | 4 | 5 | 'cache';
  topicMatch?: string;
}

export interface LearningSignal {
  type: 'USER_ALLOWED' | 'USER_BLOCKED' | 'WATCH_TIME' | 'SKIP';
  video: VideoMetadata;
  watchPercent?: number;
  timestamp: string;
}
