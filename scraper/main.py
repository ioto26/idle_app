import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime
import os
import re

def normalize_date(date_str):
    """Converts various date formats to YYYY-MM-DD."""
    current_year = datetime.now().year
    
    # Try YYYY.MM.DD or YYYY-MM-DD
    match_full = re.search(r'(\d{4})[./-](\d{2})[./-](\d{2})', date_str)
    if match_full:
        return f"{match_full.group(1)}-{match_full.group(2)}-{match_full.group(3)}"
    
    # Try MM.DD or MM/DD with optional trailing text (DAY)
    match_short = re.search(r'(\d{2})[./](\d{2})', date_str)
    if match_short:
        return f"{current_year}-{match_short.group(1)}-{match_short.group(2)}"
        
    return date_str

def scrape_nogizaka():
    current_month_str = datetime.now().strftime("%Y%m")
    news_url = f"https://www.nogizaka46.com/s/n46/news/list?dy={current_month_str}"
    schedule_url = f"https://www.nogizaka46.com/s/n46/media/list?dy={current_month_str}"
    
    news = []
    # Scrape News
    res = requests.get(news_url)
    res.encoding = res.apparent_encoding
    soup = BeautifulSoup(res.text, "html.parser")
    
    # News items
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
        title_el = item.select_one(".m--scone__ttl") or item.select_one(".m--scone__title")
        time_el = item.select_one(".m--scone__time")
        category_el = item.select_one(".m--scone__cat p") or item.select_one(".m--scone__cat")
        href = item.get("href", "")
        
        # Most reliable: Extract date from href parameters (wd00=YYYY, wd01=MM, wd02=DD)
        match_y = re.search(r'wd00=(\d{4})', href)
        match_m = re.search(r'wd01=(\d{2})', href)
        match_d = re.search(r'wd02=(\d{2})', href)
        
        if match_y and match_m and match_d:
            date_str = f"{match_y.group(1)}-{match_m.group(2)}-{match_d.group(3)}"
        else:
            # Fallback to header
            date_header = item.find_previous("div", class_="m--scone__hd") or item.find_previous("div", class_="sc--day")
            date_str = normalize_date(date_header.get_text(strip=True) if date_header else "")

        if title_el:
            schedules.append({
                "source": "nogizaka46",
                "date": date_str,
                "time": time_el.get_text(strip=True) if time_el else "",
                "title": title_el.get_text(strip=True),
                "category": category_el.get_text(strip=True) if category_el else "OTHER",
                "link": "https://www.nogizaka46.com" + href
            })
            
    return news, schedules

def scrape_bokuao():
    news_url = "https://bokuao.com/news/1/"
    schedule_url = "https://bokuao.com/schedule/list/"
    
    news = []
    # Scrape News
    res = requests.get(news_url)
    res.encoding = "utf-8"
    soup = BeautifulSoup(res.text, "html.parser")
    
    items = soup.select("a.clearfix")
    for item in items:
        # Title is in the second div usually
        title_div = item.select_one(".news-article-title")
        if not title_div:
            # Fallback: look for p that isn't the category
            title_div = item.select("div p")[-1] if item.select("div p") else None
            
        date_el = item.select_one("time")
        category_el = item.select_one(".news-article-category") or item.select_one(".label")
        
        if date_el and title_div:
            news.append({
                "source": "bokuao",
                "date": normalize_date(date_el.get_text(strip=True)),
                "title": title_div.get_text(strip=True),
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
        title_el = item.select_one("p.title") or item.select_one("p")
        category_time_el = item.select_one("div")
        
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
        print(f"Error Nogizaka46: {e}")
        n46_news, n46_sched = [], []
    
    print("Scraping Bokuao...")
    try:
        ba_news, ba_sched = scrape_bokuao()
    except Exception as e:
        print(f"Error Bokuao: {e}")
        ba_news, ba_sched = [], []
    
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
