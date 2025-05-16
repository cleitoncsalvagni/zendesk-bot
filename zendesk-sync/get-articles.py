import requests
import json
import os
from bs4 import BeautifulSoup
from typing import Dict, List, Tuple

BASE_URL = "https://appbarber-appbeleza.zendesk.com/api/v2/help_center/pt-br/articles"

def get_total_pages():
    """Get the total number of pages from the Zendesk API"""
    try:
        response = requests.get(f"{BASE_URL}?page=1&per_page=100")
        response.raise_for_status()
        data = response.json()
        
        count = data.get('count', 0)  
        per_page = data.get('per_page', 30)
        
        total_pages = (count + per_page - 1) // per_page
        print(f"Found {count} total articles across {total_pages} pages")
        return total_pages
    except requests.RequestException as e:
        print(f"Error getting total pages: {e}")
        raise

def fetch_articles():
    all_articles = []
    total_pages = get_total_pages()
    
    for page in range(1, total_pages + 1):
        url = f"{BASE_URL}?page={page}&per_page=100"
        try:
            response = requests.get(url)
            response.raise_for_status()
            data = response.json()
            articles = data.get('articles', [])
            
            for article in articles:
                processed_article = {
                    'id': article['id'],
                    'title': article['title'],
                    'body': clean_html(article['body']),
                    'link': article['html_url'],
                }
                all_articles.append(processed_article)
                
            print(f"Processed page {page}/{total_pages}")
            
        except requests.RequestException as e:
            print(f"Error fetching page {page}: {e}")
            continue
    
    return all_articles

def clean_html(html_content):
    """Remove HTML tags and clean up the text."""
    soup = BeautifulSoup(html_content, 'html.parser')
    text = soup.get_text(separator=' ', strip=True)
    text = ' '.join(text.split())
    return text

def save_articles(articles, filename='zendesk_articles.json'):
    """Save articles to a JSON file."""
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(articles, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(articles)} articles to {filename}")

def compare_articles(new_articles: List[Dict], existing_file: str) -> Tuple[bool, List[Dict]]:
    """
    Compare new articles with existing ones and return if there are changes
    """
    if not os.path.exists(existing_file):
        return True, new_articles
    
    try:
        with open(existing_file, 'r', encoding='utf-8') as f:
            existing_articles = json.load(f)
        
        existing_ids = {str(article['id']) for article in existing_articles}
        new_ids = {str(article['id']) for article in new_articles}
        
        if existing_ids != new_ids:
            return True, new_articles
            
        for new_article in new_articles:
            for existing_article in existing_articles:
                if str(new_article['id']) == str(existing_article['id']):
                    if new_article['title'] != existing_article['title'] or \
                       new_article['body'] != existing_article['body']:
                        return True, new_articles
        
        return False, existing_articles
        
    except Exception as e:
        print(f"Error comparing articles: {e}")
        return True, new_articles

def main():
    print("Starting to fetch Zendesk articles...")
    articles = fetch_articles()
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    server_data_dir = os.path.join(current_dir, '..', 'server', 'src', 'data')
    articles_path = os.path.join(server_data_dir, 'articles.json')
    
    has_changes, final_articles = compare_articles(articles, articles_path)
    
    if has_changes:
        os.makedirs(server_data_dir, exist_ok=True)
        save_articles(final_articles, articles_path)
        print("Articles updated - changes detected")
        return True
    else:
        print("No changes detected in articles")
        return False

if __name__ == "__main__":
    main()
