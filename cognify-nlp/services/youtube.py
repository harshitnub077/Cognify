import requests
from config import config
from urllib.parse import urlparse, parse_qs
from youtube_transcript_api import YouTubeTranscriptApi

def extract_video_id(url: str) -> str:
    parsed = urlparse(url)
    if 'youtube.com' in parsed.hostname:
        return parse_qs(parsed.query).get('v', [None])[0]
    elif 'youtu.be' in parsed.hostname:
        return parsed.path[1:]
    return None

def fetch_youtube_metadata(url: str) -> dict:
    video_id = extract_video_id(url)
    if not video_id:
        return None
        
    api_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
    
    try:
        response = requests.get(api_url)
        response.raise_for_status()
        data = response.json()
        
        transcript_text = ""
        try:
            transcript = YouTubeTranscriptApi.get_transcript(video_id)
            transcript_text = " ".join([t['text'] for t in transcript])
        except Exception as e:
            print(f"Transcript fetch failed: {e}")

        return {
            "title": data.get("title", ""),
            "description": transcript_text, # Use transcript as description for better analysis
            "channel": data.get("author_name", ""),
            "tags": [],
            "thumbnail": f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
            "platform": "youtube"
        }
    except Exception as e:
        print(f"YouTube oEmbed fetch failed: {e}")
        return None
