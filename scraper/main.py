import requests
import json
from datetime import datetime
import os
import re

def normalize_date(date_str):
    """Converts various date formats to YYYY-MM-DD."""
    if not date_str:
        return ""
    clean_str = re.sub(r'[\s\n\r\t]', '', date_str)
    current_year = datetime.now().year
    
    match_full = re.search(r'(\d{4})[./-](\d{2})[./-](\d{2})', clean_str)
    if match_full:
        return f"{match_full.group(1)}-{match_full.group(2)}-{match_full.group(3)}"
    
    match_short = re.search(r'(\d{2})[./](\d{2})', clean_str)
    if match_short:
        return f"{current_year}-{match_short.group(1)}-{match_short.group(2)}"
        
    return clean_str

def parse_jsonp(text):
    """Parses JSONP response (res({...});) into a Python dict."""
    try:
        # Extract the content inside res(...)
        json_str = re.search(r'^res\((.*)\);$', text.strip(), re.DOTALL).group(1)
        return json.loads(json_str)
    except Exception as e:
        print(f"JSONP parse error: {e}")
        return None

def scrape_nogizaka():
    current_month_str = datetime.now().strftime("%Y%m")
    # Using internal APIs for 100% reliability
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
    except Exception as e:
        print(f"N46 News API Error: {e}")

    schedules = []
    try:
        res = requests.get(schedule_api, headers=headers)
        res_data = parse_jsonp(res.text)
        if res_data and 'data' in res_data:
            for item in res_data['data']:
                # Extract date components
                y, m, d = item.get('date', '').split('/')
                schedules.append({
                    "source": "nogizaka46",
                    "date": f"{y}-{m}-{d}",
                    "time": item.get('start_time', ''),
                    "title": item.get('title', ''),
                    "category": item.get('cate_name', 'MEDIA'),
                    "link": "https://www.nogizaka46.com" + item.get('link_url', '')
                })
    except Exception as e:
        print(f"N46 Schedule API Error: {e}")
            
    return news, schedules

def scrape_bokuao():
    news_url = "https://bokuao.com/news/1/"
    schedule_url = "https://bokuao.com/schedule/list/"
    headers = {'User-Agent': 'Mozilla/5.0'}
    
    from bs4 import BeautifulSoup
    
    news = []
    try:
        res = requests.get(news_url, headers=headers)
        soup = BeautifulSoup(res.text, "html.parser")
        # Selector refined to ul.news_list li
        items = soup.select(".news_list li a")
        for item in items:
            title_el = item.select_one(".tit")
            date_el = item.select_one(".date")
            category_el = item.select_one(".label")
            
            if date_el and title_el:
                news.append({
                    "source": "bokuao",
                    "date": normalize_date(date_el.get_text(strip=True)),
                    "title": title_el.get_text(strip=True),
                    "category": category_el.get_text(strip=True) if category_el else "NEWS",
                    "link": "https://bokuao.com" + item.get("href", "")
                })
    except Exception as e:
        print(f"Bokuao News Error: {e}")

    schedules = []
    try:
        res = requests.get(schedule_url, headers=headers)
        soup = BeautifulSoup(res.text, "html.parser")
        # Grouped by day in ul.schedule_list > li
        days = soup.select(".schedule_list > li")
        for day in days:
            date_el = day.select_one(".date strong")
            date_str = normalize_date(date_el.get_text(strip=True) if date_el else "")
            
            events = day.select(".list__item a")
            for event in events:
                title_el = event.select_one(".tit")
                time_info = event.select_one(".list__txt") # contains cat and time
                
                if title_el:
                    info_text = time_info.get_text(strip=True) if time_info else ""
                    # Format is often "CATEGORY 18:00〜"
                    parts = info_text.split()
                    category = parts[0] if parts else "MEDIA"
                    time = parts[1] if len(parts) > 1 else ""
                    
                    schedules.append({
                        "source": "bokuao",
                        "date": date_str,
                        "time": time,
                        "title": title_el.get_text(strip=True),
                        "category": category,
                        "link": "https://bokuao.com" + event.get("href", "")
                    })
    except Exception as e:
        print(f"Bokuao Schedule Error: {e}")

    return news, schedules

def main():
    print("Scraping with API and refined selectors...")
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
    
    print(f"Saved {len(data['news'])} news and {len(data['schedule'])} schedules.")

if __name__ == "__main__":
    main()
