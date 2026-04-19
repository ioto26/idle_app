import requests
import json
from datetime import datetime
import os
import re

def normalize_date(date_str):
    """Converts various date formats to YYYY-MM-DD and removes all hidden chars."""
    if not date_str:
        return ""
    # Strip everything except numbers and dots/hyphens, then replace dots with hyphens
    clean_str = re.sub(r'[^0-9./-]', '', date_str.replace('\n', '').replace('\r', ''))
    current_year = datetime.now().year
    
    match_full = re.search(r'(\d{4})[./-](\d{2})[./-](\d{2})', clean_str)
    if match_full:
        return f"{match_full.group(1)}-{match_full.group(2)}-{match_full.group(3)}"
    
    match_short = re.search(r'(\d{2})[./](\d{2})', clean_str)
    if match_short:
        return f"{current_year}-{match_short.group(1)}-{match_short.group(2)}"
        
    return clean_str

def parse_jsonp(text):
    try:
        json_str = re.search(r'^res\((.*)\);$', text.strip(), re.DOTALL).group(1)
        return json.loads(json_str)
    except Exception as e:
        return None

def scrape_nogizaka():
    current_month_str = datetime.now().strftime("%Y%m")
    news_api = f"https://www.nogizaka46.com/s/n46/api/list/news?dy={current_month_str}"
    schedule_api = f"https://www.nogizaka46.com/s/n46/api/list/schedule?dy={current_month_str}"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.nogizaka46.com/'
    }
    
    news = []
    try:
        res = requests.get(news_api, headers=headers)
        res_data = parse_jsonp(res.text)
        if res_data and 'data' in res_data:
            for item in res_data['data']:
                news.append({
                    "source": "nogizaka46",
                    "date": normalize_date(item.get('date', '')),
                    "title": item.get('title', ''),
                    "category": item.get('cate', 'NEWS'),
                    "link": "https://www.nogizaka46.com" + item.get('link_url', '')
                })
    except: pass

    schedules = []
    try:
        res = requests.get(schedule_api, headers=headers)
        res_data = parse_jsonp(res.text)
        if res_data and 'data' in res_data:
            for item in res_data['data']:
                y, m, d = item.get('date', '').split('/')
                schedules.append({
                    "source": "nogizaka46",
                    "date": f"{y}-{m}-{d}",
                    "time": item.get('start_time', ''),
                    "title": item.get('title', ''),
                    "category": item.get('cate_name', 'MEDIA'),
                    "link": "https://www.nogizaka46.com" + item.get('link_url', '')
                })
    except: pass
            
    return news, schedules

def scrape_bokuao():
    from bs4 import BeautifulSoup
    news_url = "https://bokuao.com/news/1/"
    schedule_url = "https://bokuao.com/schedule/list/"
    headers = {'User-Agent': 'Mozilla/5.0'}
    
    news = []
    try:
        res = requests.get(news_url, headers=headers)
        soup = BeautifulSoup(res.text, "html.parser")
        items = soup.select("a.clearfix")
        for item in items:
            date_el = item.select_one("time")
            p_tags = item.select("div p")
            if date_el and p_tags:
                title = p_tags[-1].get_text(strip=True)
                category = p_tags[0].get_text(strip=True) if len(p_tags) > 1 else "NEWS"
                news.append({
                    "source": "bokuao",
                    "date": normalize_date(date_el.get_text(strip=True)),
                    "title": title,
                    "category": category,
                    "link": "https://bokuao.com" + item.get("href", "")
                })
    except: pass

    schedules = []
    try:
        res = requests.get(schedule_url, headers=headers)
        soup = BeautifulSoup(res.text, "html.parser")
        links = soup.select("a[href*='/schedule/detail/']")
        for link in links:
            # Re-scoping title selection: title is p.title inside the link
            title_el = link.select_one("p.title")
            info_div = link.select_one(".list__txt")
            date_header = link.find_previous("p", class_="date")
            date_str = normalize_date(date_header.get_text(strip=True) if date_header else "")
            
            if title_el:
                info_text = info_div.get_text(strip=True) if info_div else ""
                
                # Intelligent splitting using Regex for "CATEGORY HH:MM" patterns
                # This handles cases like "RADIO13:00" or "TV 19:00"
                category = info_text
                time = ""
                # Search for the start of the time pattern (numbers and colon)
                match = re.search(r'([A-Z/&/_]+)?(\d{1,2}:\d{2}.*)', info_text)
                if match:
                    category = match.group(1) or "MEDIA"
                    time = match.group(2)
                
                schedules.append({
                    "source": "bokuao",
                    "date": date_str,
                    "time": time,
                    "title": title_el.get_text(strip=True),
                    "category": category,
                    "link": "https://bokuao.com" + link.get("href", "")
                })
    except: pass

    return news, schedules

def main():
    print("Scraping starting...")
    n46_news, n46_sched = scrape_nogizaka()
    ba_news, ba_sched = scrape_bokuao()
    
    data = {
        "last_updated": datetime.now().isoformat(),
        "news": n46_news + ba_news,
        "schedule": n46_sched + ba_sched
    }
    
    os.makedirs("data", exist_ok=True)
    with open("data/fan_data.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"Finished. Saved {len(data['news'])} news and {len(data['schedule'])} schedules.")

if __name__ == "__main__":
    main()
