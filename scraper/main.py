import requests
import json
from datetime import datetime
import os
import re

def normalize_date(date_str):
    """Converts various date formats to YYYY-MM-DD."""
    if not date_str:
        return ""
    clean_str = re.sub(r'[^0-9./-]', '', date_str.replace('\n', ''))
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
    except: return None

def scrape_nogizaka():
    current_month_str = datetime.now().strftime("%Y%m")
    news_api = f"https://www.nogizaka46.com/s/n46/api/list/news?dy={current_month_str}"
    schedule_api = f"https://www.nogizaka46.com/s/n46/api/list/schedule?dy={current_month_str}"
    headers = {'User-Agent': 'Mozilla/5.0'}
    
    news, schedules = [], []
    # News
    try:
        res = requests.get(news_api, headers=headers)
        data = parse_jsonp(res.text)
        if data and 'data' in data:
            for item in data['data']:
                news.append({
                    "source": "nogizaka46",
                    "date": normalize_date(item.get('date', '')),
                    "title": item.get('title', ''),
                    "category": item.get('cate', 'NEWS'),
                    "link": "https://www.nogizaka46.com" + item.get('link_url', '')
                })
    except: pass
    # Schedule
    try:
        res = requests.get(schedule_api, headers=headers)
        data = parse_jsonp(res.text)
        if data and 'data' in data:
            for item in data['data']:
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
    
    news, schedules = [], []
    # News
    try:
        res = requests.get(news_url, headers=headers)
        soup = BeautifulSoup(res.text, "html.parser")
        items = soup.select("a.clearfix")
        for item in items:
            date_el = item.select_one("time")
            # Title is the last P in the div
            p_tags = item.select("div p")
            if date_el and p_tags:
                news.append({
                    "source": "bokuao",
                    "date": normalize_date(date_el.get_text(strip=True)),
                    "title": p_tags[-1].get_text(strip=True),
                    "category": p_tags[0].get_text(strip=True) if len(p_tags) > 1 else "NEWS",
                    "link": "https://bokuao.com" + item.get("href", "")
                })
    except: pass

    # Schedule
    try:
        res = requests.get(schedule_url, headers=headers)
        soup = BeautifulSoup(res.text, "html.parser")
        # Direct list items have the date and sub-items
        days = soup.select(".schedule_list > li")
        for day in days:
            date_el = day.select_one(".date strong")
            date_val = normalize_date(date_el.get_text(strip=True) if date_el else "")
            
            # Each event inside the day
            events = day.select(".list__item a")
            for event in events:
                try:
                    title_el = event.select_one(".tit") or event.select_one("p")
                    info_el = event.select_one(".list__txt")
                    
                    info_text = info_el.get_text(strip=True) if info_el else ""
                    # Improved parsing: handles no-time cases (e.g. MAGAZINE)
                    match = re.search(r'^([A-Z/&/_ ]+)?(\d{2}:\d{2}.*)?$', info_text)
                    if match:
                        category = match.group(1).strip() if match.group(1) else "MEDIA"
                        time = match.group(2).strip() if match.group(2) else ""
                    else:
                        category = info_text
                        time = ""

                    schedules.append({
                        "source": "bokuao",
                        "date": date_val,
                        "time": time,
                        "title": title_el.get_text(strip=True),
                        "category": category,
                        "link": "https://bokuao.com" + event.get("href", "")
                    })
                except: continue
    except: pass

    return news, schedules

def main():
    print("Scraping with improved fail-safes...")
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
    print(f"Done. News: {len(data['news'])}, Sched: {len(data['schedule'])}")

if __name__ == "__main__":
    main()
