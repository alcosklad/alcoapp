#!/usr/bin/env python3
import requests
import json

BASE_URL = "http://146.103.121.96:8090/api"

def fix_articles():
    # Получаем все товары
    resp = requests.get(f"{BASE_URL}/collections/products/records?perPage=500")
    all_products = resp.json()['items']
    
    print(f"Всего товаров: {len(all_products)}")
    
    # Находим максимальный артикул
    max_article = 0
    for p in all_products:
        art = p.get('article', '')
        if art and art != '-':
            try:
                num = int(art)
                if num > max_article:
                    max_article = num
            except:
                pass
    
    print(f"Максимальный артикул: {max_article}")
    
    # Получаем товары без артикула
    resp = requests.get(f"{BASE_URL}/collections/products/records?perPage=500&filter=article=''")
    no_article_products = resp.json()['items']
    
    print(f"Товаров без артикула: {len(no_article_products)}")
    
    # Обновляем каждый товар
    updated = 0
    for product in no_article_products:
        max_article += 1
        new_article = str(max_article).zfill(4)
        
        # Обновляем товар
        update_data = {"article": new_article}
        resp = requests.patch(
            f"{BASE_URL}/collections/products/records/{product['id']}",
            json=update_data,
            headers={"Content-Type": "application/json"}
        )
        
        if resp.status_code == 200:
            print(f"✓ {product['name'][:50]} → {new_article}")
            updated += 1
        else:
            print(f"✗ Ошибка для {product['name'][:50]}: {resp.text}")
    
    print(f"\nОбновлено товаров: {updated}")

if __name__ == "__main__":
    fix_articles()
