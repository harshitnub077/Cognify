// backend/src/services/ytDataApi.js — YouTube Data API v3 wrapper

import axios from 'axios';

const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';
const API_KEY = process.env.YOUTUBE_DATA_API_KEY;

/**
 * Fetch video metadata from YouTube Data API.
 * @param {string[]} videoIds
 * @returns {Promise<object[]>} array of VideoMetadata
 */
export async function fetchVideoMetadata(videoIds) {
  if (!videoIds.length) return [];

  const { data } = await axios.get(`${YT_API_BASE}/videos`, {
    params: {
      key: API_KEY,
      id: videoIds.join(','),
      part: 'snippet,contentDetails,statistics',
    },
  });

  return (data.items ?? []).map(item => ({
    videoId: item.id,
    title: item.snippet?.title ?? '',
    channel: item.snippet?.channelTitle ?? '',
    description: item.snippet?.description?.slice(0, 500) ?? '',
    ytCategoryId: Number(item.snippet?.categoryId) || undefined,
    duration: parseDuration(item.contentDetails?.duration),
  }));
}

/**
 * Fetch channel statistics.
 * @param {string} channelId
 * @returns {Promise<object|null>}
 */
export async function fetchChannelStats(channelId) {
  const { data } = await axios.get(`${YT_API_BASE}/channels`, {
    params: {
      key: API_KEY,
      id: channelId,
      part: 'snippet,statistics',
    },
  });
  return data.items?.[0] ?? null;
}

/**
 * Parse ISO 8601 duration to seconds.
 * @param {string} iso e.g. "PT4M13S"
 * @returns {number}
 */
function parseDuration(iso) {
  if (!iso) return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const [, h = 0, m = 0, s = 0] = match.map(Number);
  return h * 3600 + m * 60 + s;
}
