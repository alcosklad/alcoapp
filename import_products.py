#!/usr/bin/env python3
"""
Import products from CSV price lists into PocketBase.
Parses all price_*.csv files, maps categories, and creates missing products.
CSV columns: col0=name, col1="новая цена"(sale price), col2=Наличие, col3="New"(purchase price)
"""

import csv
import json
import os
import re
import sys
import urllib.request
import urllib.error
import time

PB_URL = "http://146.103.121.96:8090"
ADMIN_EMAIL = "admin@nashsklad.store"
ADMIN_PASSWORD = "admin12345"

# CSV file -> city name mapping
FILE_CITY_MAP = {
    "price_59.csv": "Пермь",
    "price_ekb.csv": "Екатеринбург",
    "price_irk.csv": "Иркутск",
    "price_kazan.csv": "Казань",
    "price_kld.csv": "Калининград",
    "price_krasno9rsk.csv": "Красноярск",
    "price_krasnodar.csv": "Краснодар",
    "price_msk.csv": "Москва",
    "price_mur.csv": "Мурманск",
    "price_nn.csv": "Нижний Новгород",
    "price_nsk.csv": "Новосибирск",
    "price_omsk.csv": "Омск",
    "price_samara.csv": "Самара",
    "price_saratov.csv": "Саратов",
    "price_sochi.csv": "Сочи",
    "price_spb.csv": "Санкт-Петербург",
    "price_surgut.csv": "Сургут",
    "price_ufa.csv": "Уфа",
    "price_vlg.csv": "Волгоград",
    "price_vrn.csv": "Воронеж",
}

# CSV section header -> (PB category, PB subcategory)
CATEGORY_MAP = {
    "ВИНО БЕЛОЕ СУХОЕ": ("Вино", "Белое сухое"),
    "ВИНО БЕЛОЕ ПОЛУСЛАДКОЕ": ("Вино", "Белое полусладкое"),
    "ВИНО БЕЛОЕ ПОЛУСУХОЕ": ("Вино", "Белое полусухое"),
    "ВИНО РОЗОВОЕ СУХОЕ": ("Вино", "Розовое сухое"),
    "ВИНО РОЗОВОЕ ПОЛУСУХОЕ": ("Вино", "Розовое полусухое"),
    "ВИНО КРАСНОЕ СУХОЕ": ("Вино", "Красное сухое"),
    "ВИНО КРАСНОЕ ПОЛУСЛАДКОЕ": ("Вино", "Красное полусладкое"),
    "ВИНО КРАСНОЕ ПОЛУСУХОЕ": ("Вино", "Красное полусухое"),
    "ПОРТВЕЙН": ("Портвейн", ""),
    "ВОДКА 0,5Л": ("Водка", ""),
    "ВОДКА 0,7Л": ("Водка", ""),
    "ВОДКА 1Л": ("Водка", ""),
    "ВИСКИ 0,5Л": ("Виски", ""),
    "ВИСКИ 0,7Л": ("Виски", ""),
    "ВИСКИ 0.7Л": ("Виски", ""),
    "ВИСКИ 1Л": ("Виски", ""),
    "КОНЬЯК 0,5Л": ("Коньяк", ""),
    "КОНЬЯК 0,7Л": ("Коньяк", ""),
    "РОМ": ("Ром", ""),
    "РОМ 0,5Л": ("Ром", ""),
    "РОМ 0.5Л": ("Ром", ""),
    "РОМ 0,7Л": ("Ром", ""),
    "ТЕКИЛА": ("Текила", ""),
    "ДЖИН": ("Джин", ""),
    "ЛИКЕР": ("Ликер", ""),
    "ПРОСЕККО, БРЮТ": ("Игристое", "Просекко/Брют"),
    "АСТИ": ("Игристое", "Асти"),
    "ШАМПАНСКОЕ": ("Шампанское", ""),
    "ВЕРМУТ": ("Вермут", ""),
    "ПИВО": ("Пиво", ""),
    "НАПИТКИ Б\\А": ("Напитки", ""),
    "НАПИТКИ Б/А": ("Напитки", ""),
    "ЭЛЕКТРОНКИ": ("Электронки", ""),
    "СНЭКИ И ДР": ("Снэки и Закуски", ""),
    "СИГАРЕТЫ И СТИКИ (ЗА ПАЧКУ)": ("Сигареты и Стики", ""),
    "ШОКОЛАД И КОНФЕТЫ": ("Шоколад", ""),
}

# Patterns for "ПИВО 1л и больше" variants
PIVO_1L_PATTERNS = [
    "ПИВО 1Л И БОЛЬШЕ",
    "ПИВО 1Л И БОЛЬШЕ (ОТ 3ШТ)",
    "ПИВО 1Л И БОЛЬШЕ (ПРОДАЖА ОТ 3ШТ)",
]

# Patterns for "МЯСО, РЫБА И СЫР" variants  
MYASO_PATTERNS = [
    "МЯСО, РЫБА И СЫР",
    "МЯСО, РЫБА И СЫР КОПЧЕНОЕ",
    "МЯСО, РЫбА И СЫР",
]

# City names that appear as first-row headers (to skip)
CITY_HEADERS = {
    "САМАРА", "ВОЛГОГРАД", "ВОРОНЕЖ", "ИРКУТСК", "КАЗАНЬ", "КРАСНОДАР",
    "МОСКВА", "МУРМАНСК", "ОМСК", "ПЕРМЬ", "САРАТОВ", "СОЧИ", "СУРГУТ",
    "УФА", "НН", "НСК", "СПБ", "ЕКБ", "КЛД", "КАЛИНИНГРАД", "КРАСНОЯРСК",
    "НИЖНИЙ НОВГОРОД", "НОВОСИБИРСК", "ЕКАТЕРИНБУРГ",
}


def parse_price(val):
    """Parse a price value from CSV. Returns int or None."""
    if not val:
        return None
    val = val.strip().replace(" ", "").replace("\xa0", "")
    if val.lower() in ("нет", "не", "—", "-", ""):
        return None
    # Remove trailing non-numeric chars
    val = re.sub(r"[^\d.,]", "", val)
    if not val:
        return None
    try:
        val = val.replace(",", ".")
        return int(float(val))
    except (ValueError, TypeError):
        return None


def normalize_name(name):
    """Normalize product name for matching."""
    n = name.strip()
    # Normalize quotes
    n = n.replace('"', '"').replace('"', '"').replace('«', '"').replace('»', '"')
    n = n.replace("'", "'").replace("`", "'")
    # Normalize whitespace
    n = re.sub(r"\s+", " ", n)
    return n


def name_key(name):
    """Create a lowercase key for fuzzy matching."""
    n = normalize_name(name).lower()
    # Remove common variations
    n = n.replace("ё", "е")
    n = re.sub(r"[\"'`«»"".,;:!?()\\/-]", "", n)
    n = re.sub(r"\s+", " ", n).strip()
    return n


def is_section_header(row):
    """Check if row is a section header (category row)."""
    if not row or not row[0]:
        return False
    first = row[0].strip()
    if len(first) < 3:
        return False
    second = row[1].strip() if len(row) > 1 else ""
    # Must have category-like second column
    if "цена" in second.lower() or "наличие" in second.lower() or "новая" in second.lower():
        # Check if it looks like a category (starts with uppercase word)
        first_word = first.split()[0] if first.split() else ""
        if first_word.isupper() and len(first_word) >= 2:
            return True
        upper_count = sum(1 for c in first if c.isupper())
        if upper_count > len(first) * 0.3 and len(first) > 2:
            return True
    return False


def identify_category(header_text):
    """Map a CSV section header to (category, subcategory)."""
    h = header_text.strip().upper()
    
    # Skip city names
    if h in CITY_HEADERS:
        return None
    
    # Direct match
    if h in CATEGORY_MAP:
        return CATEGORY_MAP[h]
    
    # Пиво 1л+ variants
    for pat in PIVO_1L_PATTERNS:
        if h.startswith(pat):
            return ("Пиво Разливное", "")
    
    # Мясо variants
    for pat in MYASO_PATTERNS:
        if h.startswith(pat):
            return ("Мясо и рыба", "")
    
    # Try partial matches for common patterns
    if "ВОДКА" in h and ("0,5" in h or "0.5" in h):
        return ("Водка", "")
    if "ВОДКА" in h and ("0,7" in h or "0.7" in h):
        return ("Водка", "")
    if "ВОДКА" in h and "1" in h:
        return ("Водка", "")
    if "ВИСКИ" in h:
        return ("Виски", "")
    if "КОНЬЯК" in h or "БРЕНДИ" in h:
        return ("Коньяк", "")
    if "РОМ" in h and len(h) < 20:
        return ("Ром", "")
    if "ПИВО" in h and "1" in h:
        return ("Пиво Разливное", "")
    if "ПИВО" in h:
        return ("Пиво", "")
    if "СИГАРЕТ" in h or "СТИК" in h:
        return ("Сигареты и Стики", "")
    if "СНЭК" in h:
        return ("Снэки и Закуски", "")
    if "МЯСО" in h or "РЫБА" in h:
        return ("Мясо и рыба", "")
    if "ШОКОЛАД" in h or "КОНФЕТ" in h:
        return ("Шоколад", "")
    if "НАПИТКИ" in h:
        return ("Напитки", "")
    if "ЭЛЕКТРОН" in h:
        return ("Электронки", "")
    if "ВЕРМУТ" in h:
        return ("Вермут", "")
    if "ПОРТВЕЙН" in h:
        return ("Портвейн", "")
    if "ПРОСЕККО" in h or "БРЮТ" in h:
        return ("Игристое", "Просекко/Брют")
    if "АСТИ" in h:
        return ("Игристое", "Асти")
    if "ШАМПАНСКОЕ" in h:
        return ("Шампанское", "")
    if "ТЕКИЛА" in h and len(h) < 15:
        return ("Текила", "")
    if "ДЖИН" in h and len(h) < 10:
        return ("Джин", "")
    if "ЛИКЕР" in h and len(h) < 12:
        return ("Ликер", "")
    
    return None


def is_product_row(row, current_category):
    """Check if row is a product (not a header, not empty)."""
    if not row or not row[0] or not row[0].strip():
        return False
    first = row[0].strip()
    if len(first) < 3:
        return False
    # Skip section headers
    if is_section_header(row):
        return False
    # Skip separator rows (all empty after first col)
    if all(not c.strip() for c in row[1:4]):
        # If all first 4 cols empty except name, it might be a sub-header, skip
        if first.isupper() and len(first) > 5:
            return False
    # Must have at least a name
    return current_category is not None


def parse_csv_file(filepath, city_name):
    """Parse a single CSV file and return list of products."""
    products = []
    current_category = None
    current_subcategory = ""
    
    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.reader(f)
        for row_num, row in enumerate(reader, 1):
            if not row or not row[0].strip():
                continue
            
            # Check if this is a section header
            if is_section_header(row):
                result = identify_category(row[0])
                if result:
                    current_category, current_subcategory = result
                continue
            
            # Check if product row
            if not current_category:
                continue
            
            first = row[0].strip()
            
            # Skip if looks like a sub-header (all uppercase, short)
            if first.isupper() and len(first) < 60:
                # Check if it's a known category we missed
                result = identify_category(first)
                if result:
                    current_category, current_subcategory = result
                    continue
                # Skip other uppercase rows
                if len(first) > 5 and not any(c.islower() for c in first):
                    continue
            
            # Skip empty separator rows
            if all(not c.strip() for c in row[1:4] if len(row) > 1):
                if first.isupper():
                    continue
            
            name = normalize_name(first)
            if len(name) < 3:
                continue
            
            # Parse prices: col1 = sale price, col3 = purchase price
            sale_price = parse_price(row[1] if len(row) > 1 else "")
            purchase_price = parse_price(row[3] if len(row) > 3 else "")
            
            # Skip if no valid data at all (no name or no price data)
            if not name:
                continue
            # Skip rows without any price — likely continuation/description lines
            if sale_price is None and purchase_price is None:
                continue
            
            products.append({
                "name": name,
                "category": current_category,
                "subcategory": current_subcategory,
                "price": sale_price,
                "cost": purchase_price,
                "city": city_name,
            })
    
    return products


def pb_auth():
    """Authenticate with PocketBase admin."""
    url = f"{PB_URL}/api/admins/auth-with-password"
    data = json.dumps({"identity": ADMIN_EMAIL, "password": ADMIN_PASSWORD}).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())["token"]


def pb_get_all_products(token):
    """Get all existing products from PocketBase."""
    all_products = []
    page = 1
    while True:
        url = f"{PB_URL}/api/collections/products/records?perPage=500&page={page}"
        req = urllib.request.Request(url, headers={"Authorization": token})
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
            all_products.extend(data["items"])
            if page >= data["totalPages"]:
                break
            page += 1
    return all_products


def pb_create_product(token, product_data):
    """Create a product in PocketBase."""
    url = f"{PB_URL}/api/collections/products/records"
    data = json.dumps(product_data).encode()
    req = urllib.request.Request(url, data=data, headers={
        "Content-Type": "application/json",
        "Authorization": token,
    })
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  ERROR creating '{product_data.get('name', '?')}': {e.code} {body[:200]}")
        return None


def pb_update_product(token, product_id, update_data):
    """Update a product in PocketBase."""
    url = f"{PB_URL}/api/collections/products/records/{product_id}"
    data = json.dumps(update_data).encode()
    req = urllib.request.Request(url, data=data, headers={
        "Content-Type": "application/json",
        "Authorization": token,
    }, method="PATCH")
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"  ERROR updating {product_id}: {e.code} {body[:200]}")
        return None


def main():
    csv_dir = os.path.dirname(os.path.abspath(__file__))
    
    print("=" * 60)
    print("IMPORT PRODUCTS FROM CSV TO POCKETBASE")
    print("=" * 60)
    
    # Step 1: Parse all CSV files
    print("\n[1/4] Parsing CSV files...")
    all_csv_products = []  # list of {name, category, subcategory, price, cost, city}
    
    for filename, city in sorted(FILE_CITY_MAP.items()):
        filepath = os.path.join(csv_dir, filename)
        if not os.path.exists(filepath):
            print(f"  SKIP {filename} (not found)")
            continue
        products = parse_csv_file(filepath, city)
        all_csv_products.extend(products)
        print(f"  {filename} -> {city}: {len(products)} products")
    
    print(f"\n  Total CSV entries: {len(all_csv_products)}")
    
    # Step 2: Aggregate products (same product across cities)
    print("\n[2/4] Aggregating products across cities...")
    # Group by name_key -> {name, category, subcategory, cities: {city: {price, cost}}}
    product_map = {}
    
    for p in all_csv_products:
        key = name_key(p["name"])
        if not key:
            continue
        
        if key not in product_map:
            product_map[key] = {
                "name": p["name"],
                "category": p["category"],
                "subcategory": p["subcategory"],
                "cities": {},
            }
        
        city = p["city"]
        product_map[key]["cities"][city] = {
            "price": p["price"],
            "cost": p["cost"],
        }
    
    print(f"  Unique products in CSV: {len(product_map)}")
    
    # Category stats
    cat_counts = {}
    for p in product_map.values():
        cat = p["category"]
        cat_counts[cat] = cat_counts.get(cat, 0) + 1
    print("\n  Products per category:")
    for cat in sorted(cat_counts.keys()):
        print(f"    {cat}: {cat_counts[cat]}")
    
    # Step 3: Auth and get existing products
    print("\n[3/4] Connecting to PocketBase...")
    token = pb_auth()
    print("  Authenticated")
    
    existing = pb_get_all_products(token)
    print(f"  Existing products in DB: {len(existing)}")
    
    # Build lookup by name_key
    existing_by_key = {}
    for p in existing:
        key = name_key(p.get("name", ""))
        if key:
            existing_by_key[key] = p
    
    # Step 4: Create/update products
    print("\n[4/4] Creating/updating products...")
    created = 0
    updated = 0
    skipped = 0
    errors = 0
    
    for key, csv_prod in sorted(product_map.items()):
        # Determine best price/cost (use first valid price from any city)
        best_price = None
        best_cost = None
        for city_data in csv_prod["cities"].values():
            if best_price is None and city_data["price"]:
                best_price = city_data["price"]
            if best_cost is None and city_data["cost"]:
                best_cost = city_data["cost"]
        
        city_names = sorted(csv_prod["cities"].keys())
        
        if key in existing_by_key:
            # Product exists — update cities and fix category if needed
            existing_prod = existing_by_key[key]
            existing_cities = existing_prod.get("cities", []) or []
            existing_cat = existing_prod.get("category", []) or []
            existing_subcat = existing_prod.get("subcategory", "") or ""
            existing_price = existing_prod.get("price", 0) or 0
            existing_cost = existing_prod.get("cost", 0) or 0
            
            new_cities = sorted(set(existing_cities) | set(city_names))
            new_cat = csv_prod["category"]
            new_subcat = csv_prod["subcategory"]
            
            # Check if update needed
            needs_update = False
            update_data = {}
            
            if set(new_cities) != set(existing_cities):
                update_data["cities"] = new_cities
                needs_update = True
            
            if new_cat and (not existing_cat or existing_cat == [""]):
                update_data["category"] = [new_cat]
                needs_update = True
            
            if new_subcat and not existing_subcat:
                update_data["subcategory"] = new_subcat
                needs_update = True
            
            # Update price/cost if currently 0
            if existing_price == 0 and best_price:
                update_data["price"] = best_price
                needs_update = True
            if existing_cost == 0 and best_cost:
                update_data["cost"] = best_cost
                needs_update = True
            
            if needs_update:
                result = pb_update_product(token, existing_prod["id"], update_data)
                if result:
                    updated += 1
                else:
                    errors += 1
            else:
                skipped += 1
        else:
            # New product — create
            product_data = {
                "name": csv_prod["name"],
                "category": [csv_prod["category"]],
                "subcategory": csv_prod["subcategory"],
                "price": best_price or 0,
                "cost": best_cost or 0,
                "cities": city_names,
            }
            
            result = pb_create_product(token, product_data)
            if result:
                created += 1
                # Small delay to avoid rate limiting
                if created % 50 == 0:
                    print(f"    ... created {created} products so far")
                    time.sleep(0.5)
            else:
                errors += 1
    
    print(f"\n{'=' * 60}")
    print(f"DONE!")
    print(f"  Created: {created}")
    print(f"  Updated: {updated}")
    print(f"  Skipped (no changes): {skipped}")
    print(f"  Errors: {errors}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
