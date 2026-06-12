export interface ContentLog {
  id: string;
  url: string;
  title: string;
  platform: string;
  score: number;
  timeSpentSecs: number;
  createdAt: string | Date;
}

export interface Recommendation {
  id: string;
  title: string;
  channel: string;
  url: string;
  thumbnail: string;
  platform: string;
  duration: number;
  viewCount: number;
  score: number;
  dominantEmotion: string;
  reason: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  identities: string[];
  avatarUrl?: string;
}
