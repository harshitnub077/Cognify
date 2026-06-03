import os
import yt_dlp

def fetch_youtube_metadata(url: str) -> dict:
    # Use yt-dlp to fetch video metadata securely without an API key if needed
    # Wait, the prompt said: "YouTube Data API v3 metadata fetcher"
    # I should use `requests` if they provided YOUTUBE_API_KEY
    api_key = os.getenv("YOUTUBE_API_KEY")
    
    if api_key:
        import requests
        from urllib.parse import urlparse, parse_qs
        try:
            video_id = parse_qs(urlparse(url).query).get('v', [None])[0]
            if not video_id:
                if 'youtu.be/' in url:
                    video_id = url.split('youtu.be/')[1].split('?')[0]
                    
            if video_id:
                res = requests.get(f"https://www.googleapis.com/youtube/v3/videos?part=snippet&id={video_id}&key={api_key}")
                data = res.json()
                if 'items' in data and len(data['items']) > 0:
                    snippet = data['items'][0]['snippet']
                    return {
                        "title": snippet.get('title'),
                        "thumbnail": snippet.get('thumbnails', {}).get('high', {}).get('url'),
                        "platform": "youtube"
                    }
        except Exception as e:
            print(f"YouTube API Error: {e}")
            pass
            
    # Fallback to yt-dlp if API key is missing or fails
    try:
        ydl_opts = {'quiet': True, 'simulate': True}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return {
                "title": info.get('title'),
                "thumbnail": info.get('thumbnail'),
                "platform": "youtube"
            }
    except Exception as e:
        print(f"yt-dlp error: {e}")
        return {
            "title": "Unknown YouTube Video",
            "thumbnail": None,
            "platform": "youtube"
        }
