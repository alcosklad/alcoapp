#!/usr/bin/env python3
import requests
import json

BASE_URL = "http://146.103.121.96:8090/api"

def fix_articles():
    # Получаем все товары
    resp = requests.get(f"{BASE_URL}/collections/products/records?perPage=500")
    all_products = resp.json()['items']
    
    print(f"Всего товаров: {len(all_products)}")
    
    # Находим максимальный номер в артикулах формата VIN-XXXX или просто XXXX
    max_article = 0
    for p in all_products:
        art = p.get('article', '')
        if art and art != '-':
            # Пытаемся извлечь число из VIN-XXXX или просто XXXX
            if art.startswith('VIN-'):
                try:
                    num = int(art[4:])
                    if num > max_article:
                        max_article = num
                except:
                    pass
            else:
                try:
                    num = int(art)
                    if num > max_article:
                        max_article = num
                except:
                    pass
    
    print(f"Максимальный номер артикула: {max_article}")
    
    # Получаем товары с неправильным форматом артикула (не VIN-XXXX)
    resp = requests.get(f"{BASE_URL}/collections/products/records?perPage=500")
    all_products = resp.json()['items']
    
    to_fix = []
    for p in all_products:
        art = p.get('article', '')
        # Если артикул пустой, или не начинается с VIN-, или это просто число
        if not art or art == '-' or not art.startswith('VIN-'):
            to_fix.append(p)
    
    print(f"Товаров для исправления: {len(to_fix)}")
    
    # Обновляем каждый товар
    updated = 0
    for product in to_fix:
        max_article += 1
        new_article = f"VIN-{str(max_article).zfill(4)}"
        
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
