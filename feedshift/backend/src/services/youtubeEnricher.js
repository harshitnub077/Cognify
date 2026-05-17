export async function enrichVideoMetadata(videoId) {
  if (!process.env.YOUTUBE_DATA_API_KEY || process.env.YOUTUBE_DATA_API_KEY.includes('placeholder')) {
    // If no key, return null gracefully so the pipeline falls back to DOM metadata
    return null;
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,topicDetails&id=${videoId}&key=${process.env.YOUTUBE_DATA_API_KEY}`;
    
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    const video = data.items?.[0]?.snippet;
    const statistics = data.items?.[0]?.statistics;
    
    if (!video) return null;
    
    return {
      title: video.title,
      description: video.description || '',
      tags: video.tags || [],
      category: video.categoryId,
      channelTitle: video.channelTitle,
      publishedAt: video.publishedAt,
      viewCount: statistics?.viewCount || '0'
    };
  } catch (error) {
    console.error('[YouTubeEnricher] Error fetching metadata:', error);
    return null;
  }
}

export const EDUCATIONAL_CATEGORIES = ['27', '28', '26']; // Education, Science & Tech, How-to
export const ENTERTAINMENT_CATEGORIES = ['24', '23', '22']; // Entertainment, Comedy, People & Blogs
