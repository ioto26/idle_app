import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime
import os
import re

def scrape_nogizaka():
    news_url = "https://www.nogizaka46.com/s/n46/news/list"
    schedule_url = "https://www.nogizaka46.com/s/n46/media/list"
    
    news = []
    # Scrape News
    res = requests.get(news_url)
    res.encoding = res.apparent_encoding
    soup = BeautifulSoup(res.text, "html.parser")
    
    items = soup.select("a[href*='/news/detail/']")
    for item in items:
        # Check structure carefully
        date_el = item.select_one("div:nth-of-type(1) > p")
        title_el = item.select_one("div:nth-of-type(2) > div")
        category_el = item.select_one("div:nth-of-type(1) > div > p")
        
        if date_el and title_el:
            news.append({
                "source": "nogizaka46",
                "date": date_el.get_text(strip=True),
                "title": title_el.get_text(strip=True),
                "category": category_el.get_text(strip=True) if category_el else "OTHER",
                "link": "https://www.nogizaka46.com" + item.get("href", "")
            })

    # Scrape Schedule
    schedules = []
    res = requests.get(schedule_url)
    res.encoding = res.apparent_encoding
    soup = BeautifulSoup(res.text, "html.parser")
    
    # Schedule items on Nogizaka site are often grouped by date
    # Selectors based on report: a.m--scone__a
    items = soup.select("a.m--scone__a")
    for item in items:
        time_el = item.select_one("div:nth-of-type(2) > p:nth-of-type(1)")
        title_el = item.select_one("div:nth-of-type(2) > p:nth-of-type(2)")
        category_el = item.select_one("div:nth-of-type(1) > p")
        href = item.get("href", "")
        
        # Extract date from href parameters if possible: wd00=YYYY, wd01=MM, wd02=DD
        date_match = re.search(r"wd00=(\d{4})&wd01=(\d{2})&wd02=(\d{2})", href)
        if date_match:
            date_str = f"{date_match.group(1)}.{date_match.group(2)}.{date_match.group(3)}"
        else:
            date_str = datetime.now().strftime("%Y.%m.%d") # Fallback

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
    news_url = "https://bokuao.com/news/"
    schedule_url = "https://bokuao.com/schedule/list/"
    
    news = []
    # Scrape News
    res = requests.get(news_url)
    res.encoding = "utf-8"
    soup = BeautifulSoup(res.text, "html.parser")
    
    # Scraper report says: a.clearfix (the item itself is a link)
    items = soup.select("a.clearfix")
    for item in items:
        title_el = item.select_one("div > div > p")
        date_el = item.select_one("time")
        category_el = item.select_one("div > p")
        
        if date_el and title_el:
            news.append({
                "source": "bokuao",
                "date": date_el.get_text(strip=True).replace("-", "."),
                "title": title_el.get_text(strip=True),
                "category": category_el.get_text(strip=True) if category_el else "OTHER",
                "link": "https://bokuao.com" + item.get("href", "")
            })

    # Scrape Schedule
    schedules = []
    res = requests.get(schedule_url)
    res.encoding = "utf-8"
    soup = BeautifulSoup(res.text, "html.parser")
    
    # Schedule items are links to detail
    items = soup.select("a[href^='/schedule/detail/']")
    for item in items:
        title_el = item.select_one("p")
        category_time_el = item.select_one("div") # Contains Category and Time
        href = item.get("href", "")
        
        # Date is often in a parent container or preceding text node
        # We try to find the nearest date text
        # On Bokuao, date headers are like "04.01" in a separate div
        date_header = item.find_previous("p", class_="date")
        date_str = date_header.get_text(strip=True) if date_header else datetime.now().strftime("%m.%d")

        if title_el:
            cat_time_text = category_time_el.get_text(strip=True) if category_time_el else ""
            # Split category and time if possible (e.g. "TV 18:00")
            parts = cat_time_text.split()
            category = parts[0] if len(parts) > 0 else "OTHER"
            time = parts[1] if len(parts) > 1 else ""

            schedules.append({
                "source": "bokuao",
                "date": date_str,
                "time": time,
                "title": title_el.get_text(strip=True),
                "category": category,
                "link": "https://bokuao.com" + href
            })

    return news, schedules

def main():
    print("Scraping Nogizaka46...")
    n46_news, n46_sched = scrape_nogizaka()
    
    print("Scraping Bokuao...")
    ba_news, ba_sched = scrape_bokuao()
    
    data = {
        "last_updated": datetime.now().isoformat(),
        "news": n46_news + ba_news,
        "schedule": n46_sched + ba_sched
    }
    
    # Ensure directory exists
    os.makedirs("data", exist_ok=True)
    
    with open("data/fan_data.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"Successfully saved {len(data['news'])} news items and {len(data['schedule'])} schedule items.")

if __name__ == "__main__":
    main()
