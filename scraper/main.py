import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime
import os
import re

def normalize_date(date_str):
    """
    Converts various date formats to YYYY-MM-DD.
    Examples:
    - 2026.04.18 -> 2026-04-18
    - 04.01 WED -> 2026-04-01
    - 04.28 Tue -> 2026-04-28
    - 2026/04/18 -> 2026-04-18
    """
    current_year = datetime.now().year
    
    # Try YYYY.MM.DD or YYYY-MM-DD
    match_full = re.search(r'(\d{4})[./-](\d{2})[./-](\d{2})', date_str)
    if match_full:
        return f"{match_full.group(1)}-{match_full.group(2)}-{match_full.group(3)}"
    
    # Try MM.DD or MM/DD with optional trailing text (DAY)
    match_short = re.search(r'(\d{2})[./](\d{2})', date_str)
    if match_short:
        return f"{current_year}-{match_short.group(1)}-{match_short.group(2)}"
        
    return date_str # Fallback

def scrape_nogizaka():
    news_url = "https://www.nogizaka46.com/s/n46/news/list"
    schedule_url = "https://www.nogizaka46.com/s/n46/media/list"
    
    news = []
    # Scrape News
    res = requests.get(news_url)
    res.encoding = res.apparent_encoding
    soup = BeautifulSoup(res.text, "html.parser")
    
    # Updated selectors based on latest site check
    items = soup.select("a.p-news__item")
    for item in items:
        date_el = item.select_one(".p-news__item__date")
        title_el = item.select_one(".p-news__item__title")
        category_el = item.select_one(".p-news__item__category")
        
        if date_el and title_el:
            news.append({
                "source": "nogizaka46",
                "date": normalize_date(date_el.get_text(strip=True)),
                "title": title_el.get_text(strip=True),
                "category": category_el.get_text(strip=True) if category_el else "OTHER",
                "link": "https://www.nogizaka46.com" + item.get("href", "")
            })

    # Scrape Schedule
    schedules = []
    res = requests.get(schedule_url)
    res.encoding = res.apparent_encoding
    soup = BeautifulSoup(res.text, "html.parser")
    
    items = soup.select("a.m--scone__a")
    for item in items:
        # Title and Time
        content_el = item.select_one(".m--scone__content")
        title_el = content_el.select_one(".m--scone__title") if content_el else None
        time_el = content_el.select_one(".m--scone__time") if content_el else None
        category_el = item.select_one(".m--scone__cat")
        
        # Date is often in a nearby header sc--day or similar
        # Find the parent or sibling that has the date
        date_header = item.find_previous("div", class_="sc--day")
        date_text = date_header.get_text(strip=True) if date_header else ""
        
        if title_el:
            schedules.append({
                "source": "nogizaka46",
                "date": normalize_date(date_text),
                "time": time_el.get_text(strip=True) if time_el else "",
                "title": title_el.get_text(strip=True),
                "category": category_el.get_text(strip=True) if category_el else "OTHER",
                "link": "https://www.nogizaka46.com" + item.get("href", "")
            })
            
    return news, schedules

def scrape_bokuao():
    # Bokuao news index 1 is used for the latest news
    news_url = "https://bokuao.com/news/1/"
    schedule_url = "https://bokuao.com/schedule/list/"
    
    news = []
    # Scrape News
    res = requests.get(news_url)
    res.encoding = "utf-8"
    soup = BeautifulSoup(res.text, "html.parser")
    
    items = soup.select("ul.news-article-list li a")
    if not items: # try old selector if empty
        items = soup.select("a.clearfix")
        
    for item in items:
        # Structure: <time>...</time> <div class="news-article-category">...</div> <div class="news-article-title">...</div>
        title_el = item.select_one(".news-article-title") or item.select_one("p")
        date_el = item.select_one("time")
        category_el = item.select_one(".news-article-category") or item.select_one("div > p")
        
        if date_el and title_el:
            news.append({
                "source": "bokuao",
                "date": normalize_date(date_el.get_text(strip=True)),
                "title": title_el.get_text(strip=True),
                "category": category_el.get_text(strip=True) if category_el else "OTHER",
                "link": "https://bokuao.com" + item.get("href", "")
            })

    # Scrape Schedule
    schedules = []
    res = requests.get(schedule_url)
    res.encoding = "utf-8"
    soup = BeautifulSoup(res.text, "html.parser")
    
    items = soup.select("a[href^='/schedule/detail/']")
    for item in items:
        title_el = item.select_one("p")
        category_time_el = item.select_one("div")
        
        # Date text example: "04.01 WED"
        date_header = item.find_previous("p", class_="date")
        date_text = date_header.get_text(strip=True) if date_header else ""

        if title_el:
            cat_time_text = category_time_el.get_text(strip=True) if category_time_el else ""
            parts = cat_time_text.split()
            category = parts[0] if len(parts) > 0 else "OTHER"
            time = parts[1] if len(parts) > 1 else ""

            schedules.append({
                "source": "bokuao",
                "date": normalize_date(date_text),
                "time": time,
                "title": title_el.get_text(strip=True),
                "category": category,
                "link": "https://bokuao.com" + item.get("href", "")
            })

    return news, schedules

def main():
    print("Scraping Nogizaka46...")
    try:
        n46_news, n46_sched = scrape_nogizaka()
    except Exception as e:
        print(f"Error scraping Nogizaka46: {e}")
        n46_news, n46_sched = [], []
    
    print("Scraping Bokuao...")
    try:
        ba_news, ba_sched = scrape_bokuao()
    except Exception as e:
        print(f"Error scraping Bokuao: {e}")
        ba_news, ba_sched = [], []
    
    data = {
        "last_updated": datetime.now().isoformat(),
        "news": n46_news + ba_news,
        "schedule": n46_sched + ba_sched
    }
    
    os.makedirs("data", exist_ok=True)
    with open("data/fan_data.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"Successfully saved {len(data['news'])} news items and {len(data['schedule'])} schedule items.")

if __name__ == "__main__":
    main()
