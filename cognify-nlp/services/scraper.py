import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse

def scrape_metadata(url: str) -> dict:
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers, timeout=5)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'lxml')
        
        title = soup.title.string if soup.title else ""
        
        # Meta description
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        description = meta_desc['content'] if meta_desc else ""
        
        if not description:
            # Fallback to OpenGraph description
            og_desc = soup.find('meta', property='og:description')
            description = og_desc['content'] if og_desc else ""

        # OpenGraph Image
        og_img = soup.find('meta', property='og:image')
        thumbnail = og_img['content'] if og_img else ""
            
        parsed_url = urlparse(url)
            
        return {
            "title": title.strip() if title else "",
            "description": description.strip()[:400] if description else "",
            "channel": parsed_url.hostname,
            "tags": [],
            "thumbnail": thumbnail,
            "platform": "web"
        }
    except Exception as e:
        print(f"Scraping failed for {url}: {e}")
        return None
