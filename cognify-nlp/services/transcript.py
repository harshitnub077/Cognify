import re
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter

def extract_video_id(url: str) -> str:
    """Extract YouTube video ID from standard or short URLs."""
    if not url:
        return None
        
    # Match ?v=ID or &v=ID or youtu.be/ID or youtube.com/shorts/ID
    match = re.search(r"(?:v=|\/)([0-9A-Za-z_-]{11}).*", url)
    if match:
        return match.group(1)
        
    return None

def format_timestamp(seconds: float) -> str:
    """Convert seconds to MM:SS or HH:MM:SS format."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    
    if hours > 0:
        return f"[{hours:02d}:{minutes:02d}:{secs:02d}]"
    else:
        return f"[{minutes:02d}:{secs:02d}]"

def get_video_transcript(url: str, max_chars: int = 200000) -> str:
    """
    Fetch the transcript of a YouTube video and format it with timestamps.
    Truncates the output to max_chars to avoid hitting token limits while
    still keeping a huge chunk of the video's context.
    Returns None if no transcript is available.
    """
    video_id = extract_video_id(url)
    if not video_id:
        return None
        
    try:
        # Fetch transcript (automatically handles English if available)
        api = YouTubeTranscriptApi()
        transcript_list = api.fetch(video_id)
        
        formatted_lines = []
        for segment in transcript_list:
            time_str = format_timestamp(segment.start)
            text = segment.text.replace('\n', ' ')
            formatted_lines.append(f"{time_str} {text}")
            
        full_transcript = "\n".join(formatted_lines)
        
        # Truncate if extremely long (Gemini 3.5 Flash can handle a lot, 
        # but 40k chars is safe and fast, covering roughly 30-45 mins of speech)
        if len(full_transcript) > max_chars:
            full_transcript = full_transcript[:max_chars] + "\n... [Transcript truncated for length]"
            
        return full_transcript
    except Exception as e:
        print(f"Transcript extraction failed for {video_id}: {e}")
        return None
