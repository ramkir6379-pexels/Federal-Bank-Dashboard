import json
import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from geo_processor import GeoProcessor

app = Flask(__name__)
CORS(app)
processor = GeoProcessor()

CATEGORIES = [
    {"id": "atm_location",          "name": "ATM Locations",         "icon": "🏧", "color": "#1D4ED8", "group": "Banking"},
    {"id": "bank_branches",         "name": "Bank Branches",         "icon": "🏦", "color": "#059669", "group": "Banking"},
    {"id": "commercial_buildings",  "name": "Commercial Buildings",  "icon": "🏢", "color": "#DC2626", "group": "Commercial"},
    {"id": "retails",               "name": "Retail Shops",          "icon": "🛍️", "color": "#BE185D", "group": "Commercial"},
    {"id": "malls",                 "name": "Malls",                 "icon": "🏬", "color": "#2563EB", "group": "Commercial"},
    {"id": "cafes",                 "name": "Cafes",                 "icon": "☕", "color": "#B45309", "group": "Commercial"},
    {"id": "restaurants",           "name": "Restaurants",           "icon": "🍽️", "color": "#DB2777", "group": "Commercial"},
    {"id": "hotels",                "name": "Hotels",                "icon": "🏨", "color": "#0891B2", "group": "Commercial"},
    {"id": "car_showrooms",         "name": "Car Showrooms",         "icon": "🚗", "color": "#16A34A", "group": "Commercial"},
    {"id": "petrol_bunks",          "name": "Petrol Bunks",          "icon": "⛽", "color": "#15803D", "group": "Commercial"},
    {"id": "schools",               "name": "Schools",               "icon": "🏫", "color": "#D97706", "group": "Education"},
    {"id": "colleges",              "name": "Colleges",              "icon": "🎓", "color": "#7C3AED", "group": "Education"},
    {"id": "gated_community",       "name": "Gated Communities",     "icon": "🏘️", "color": "#4F46E5", "group": "Residential"},
    {"id": "resedential_townships", "name": "Residential Townships", "icon": "🏠", "color": "#9333EA", "group": "Residential"},
    {"id": "villa",                 "name": "Villas",                "icon": "🏡", "color": "#B91C1C", "group": "Residential"},
    {"id": "villa_gated_community", "name": "Villa Gated Community", "icon": "🏯", "color": "#6D28D9", "group": "Residential"},
    {"id": "bunglow",               "name": "Bungalows",             "icon": "🏛️", "color": "#0369A1", "group": "Residential"},
    {"id": "luxury_villas",         "name": "Luxury Villas",         "icon": "💎", "color": "#C2410C", "group": "Wealth"},
    {"id": "jewellery",             "name": "Jewellery Shops",       "icon": "💍", "color": "#CA8A04", "group": "Wealth"},
]

CATEGORY_MAP = {c["id"]: c for c in CATEGORIES}
_CAT_CACHE: dict = {}

def _filter_properties(cat_id: str, props: dict) -> dict:
    """Extract only required fields based on category (max 5 fields)"""
    filtered = {}
    
    # Common fields (always include)
    filtered["name"] = props.get("name", "")
    filtered["address"] = props.get("address", "")
    filtered["pincode"] = props.get("pincode", "")
    
    # Category-specific fields (max 2 additional)
    if cat_id == "atm_location":
        if "is_24_7" in props:
            filtered["is_24_7"] = props["is_24_7"]
        if "status" in props:
            filtered["status"] = props["status"]
    
    elif cat_id == "bank_branches":
        if "bank_name" in props:
            filtered["bank_name"] = props["bank_name"]
        if "branch_name" in props:
            filtered["branch_name"] = props["branch_name"]
        elif "ifsc_code" in props:
            filtered["ifsc_code"] = props["ifsc_code"]
    
    elif cat_id in ["commercial_buildings", "retails", "malls"]:
        if "category" in props:
            filtered["category"] = props["category"]
        if "rating" in props:
            filtered["rating"] = props["rating"]
    
    elif cat_id in ["hotels", "restaurants", "cafes"]:
        if "rating" in props:
            filtered["rating"] = props["rating"]
        if "price_level" in props:
            filtered["price_level"] = props["price_level"]
    
    elif cat_id == "schools":
        if "rating" in props:
            filtered["rating"] = props["rating"]
        if "facilities" in props:
            filtered["facilities"] = props["facilities"]
    
    elif cat_id == "colleges":
        if "streams_count" in props:
            filtered["streams_count"] = props["streams_count"]
        elif "rating" in props:
            filtered["rating"] = props["rating"]
    
    elif cat_id == "car_showrooms":
        if "brand_name" in props:
            filtered["brand_name"] = props["brand_name"]
        if "is_premium" in props:
            filtered["is_premium"] = props["is_premium"]
    
    elif cat_id in ["gated_community", "resedential_townships", "villa", "villa_gated_community", "bunglow", "luxury_villas"]:
        if "subcategory" in props:
            filtered["subcategory"] = props["subcategory"]
        elif "category" in props:
            filtered["category"] = props["category"]
        if "road_type" in props:
            filtered["road_type"] = props["road_type"]
    
    elif cat_id in ["jewellery", "petrol_bunks"]:
        if "category" in props:
            filtered["category"] = props["category"]
        if "road_type" in props:
            filtered["road_type"] = props["road_type"]
    
    return filtered

def _load_category(cat_id: str) -> list:
    if cat_id in _CAT_CACHE:
        return _CAT_CACHE[cat_id]
    base_dir = os.path.dirname(os.path.abspath(__file__))
    fpath = os.path.join(base_dir, "data", "categories", f"{cat_id}.geojson")
    if not os.path.exists(fpath):
        _CAT_CACHE[cat_id] = []
        return []
    with open(fpath, "r", encoding="utf-8") as f:
        data = json.load(f)
    _CAT_CACHE[cat_id] = data.get("features", [])
    return _CAT_CACHE[cat_id]

@app.route("/", methods=["GET"])
def health():
    return jsonify({"status": "Geo-Intelligence Backend is running!"})

@app.route("/categories", methods=["GET"])
def get_categories():
    return jsonify(CATEGORIES)

@app.route("/category-data", methods=["GET"])
def get_category_data():
    cats_param = request.args.get("categories", "")
    pincode    = request.args.get("pincode", "").strip()
    if not cats_param:
        return jsonify({"error": "Provide 'categories' query param"}), 400
    requested = [c.strip() for c in cats_param.split(",") if c.strip()]
    locations = []
    for cat_id in requested:
        cat_info = CATEGORY_MAP.get(cat_id, {"name": cat_id, "color": "#6B7280"})
        features = _load_category(cat_id)
        if pincode:
            features = [f for f in features if str(f.get("properties", {}).get("pincode", "")).strip() == pincode]
        for feat in features:
            props = feat.get("properties", {})
            try:
                lat = float(props.get("lat", 0))
                lng = float(props.get("lng", 0))
                if lat and lng:
                    filtered_props = _filter_properties(cat_id, props)
                    locations.append({
                        "lat": lat,
                        "lng": lng,
                        "name": props.get("name", ""),
                        "category": cat_id,
                        "color": cat_info.get("color", "#6B7280"),
                        "properties": filtered_props
                    })
            except (TypeError, ValueError):
                pass
    return jsonify({"locations": locations})

@app.route("/boundaries/perungudi", methods=["GET"])
def get_perungudi_boundary():
    """Serves the dedicated Perungudi boundary GeoJSON file."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    fpath = os.path.join(base_dir, "data", "perungudi boundary.geojson")
    with open(fpath, "r", encoding="utf-8") as f:
        data = json.load(f)
    return jsonify(data)

@app.route("/boundaries/city-areas", methods=["GET"])
def get_city_areas():
    """Returns city-level groupings with their pincodes for boundary selection."""
    all_pincodes = processor.get_all_pincodes()
    pincode_map = {}
    for f in all_pincodes.get("features", []):
        p = f["properties"]
        pc = str(p.get("Pincode", ""))
        name = p.get("Office_Nam", pc).replace(" S.O", "").replace(" SO", "").strip()
        div  = p.get("Division", "")
        pincode_map[pc] = {"pincode": pc, "name": name, "division": div}

    # Perungudi contains all 13 pincodes within its boundary
    PERUNGUDI_PINCODES = ["600041","600042","600061","600088","600091",
                          "600096","600097","600100","600113","600115",
                          "600117","600119","600129"]

    CITY_GROUPS = [
        {"id": "perungudi",     "name": "Perungudi",     "pincodes": PERUNGUDI_PINCODES},
        {"id": "velachery",     "name": "Velachery",     "pincodes": ["600042"]},
        {"id": "sholinganallur","name": "Sholinganallur","pincodes": ["600119"]},
        {"id": "medavakkam",    "name": "Medavakkam",    "pincodes": ["600100", "600129"]},
        {"id": "tiruvanmiyur",  "name": "Tiruvanmiyur",  "pincodes": ["600041"]},
        {"id": "nanganallur",   "name": "Nanganallur",   "pincodes": ["600061"]},
        {"id": "adambakkam",    "name": "Adambakkam",    "pincodes": ["600088"]},
        {"id": "madipakkam",    "name": "Madipakkam",    "pincodes": ["600091"]},
        {"id": "taramani",      "name": "Taramani",      "pincodes": ["600113"]},
        {"id": "injambakkam",   "name": "Injambakkam",   "pincodes": ["600115"]},
        {"id": "pallavaram",    "name": "Old Pallavaram","pincodes": ["600117"]},
        {"id": "kovilambakkam", "name": "Kovilambakkam", "pincodes": ["600129"]},
    ]

    result = []
    for city in CITY_GROUPS:
        pincodes_detail = []
        for pc in city["pincodes"]:
            if pc in pincode_map:
                pincodes_detail.append(pincode_map[pc])
        result.append({
            "id": city["id"],
            "name": city["name"],
            "pincodes": pincodes_detail
        })
    return jsonify(result)

@app.route("/boundaries/city-areas/search", methods=["GET"])
def search_city_areas():
    """Search Chennai city areas by name."""
    query = request.args.get("q", "").lower().strip()

    PERUNGUDI_PINCODES = ["600041","600042","600061","600088","600091",
                          "600096","600097","600100","600113","600115",
                          "600117","600119","600129"]

    CITY_GROUPS = [
        {"id": "perungudi",     "name": "Perungudi",     "pincodes": PERUNGUDI_PINCODES},
        {"id": "velachery",     "name": "Velachery",     "pincodes": ["600042"]},
        {"id": "sholinganallur","name": "Sholinganallur","pincodes": ["600119"]},
        {"id": "medavakkam",    "name": "Medavakkam",    "pincodes": ["600100", "600129"]},
        {"id": "tiruvanmiyur",  "name": "Tiruvanmiyur",  "pincodes": ["600041"]},
        {"id": "nanganallur",   "name": "Nanganallur",   "pincodes": ["600061"]},
        {"id": "adambakkam",    "name": "Adambakkam",    "pincodes": ["600088"]},
        {"id": "madipakkam",    "name": "Madipakkam",    "pincodes": ["600091"]},
        {"id": "taramani",      "name": "Taramani",      "pincodes": ["600113"]},
        {"id": "injambakkam",   "name": "Injambakkam",   "pincodes": ["600115"]},
        {"id": "pallavaram",    "name": "Old Pallavaram","pincodes": ["600117"]},
        {"id": "kovilambakkam", "name": "Kovilambakkam", "pincodes": ["600129"]},
    ]

    if not query:
        return jsonify(CITY_GROUPS)

    results = [c for c in CITY_GROUPS if query in c["name"].lower()]
    return jsonify(results)

@app.route("/boundaries/pincode", methods=["GET"])
def get_pincode_boundaries():
    return jsonify(processor.get_all_pincodes())

@app.route("/boundaries/street", methods=["GET"])
def get_street_boundaries():
    pincode = request.args.get("pincode")
    if not pincode:
        return jsonify({"error": "Provide 'pincode' param"}), 400
    return jsonify(processor.get_streets_for_pincode(pincode))

@app.route("/boundaries/pincode/centroids", methods=["GET"])
def get_pincode_centroids():
    return jsonify(processor.get_all_pincode_centroids())

@app.route("/boundaries/pincode/intelligence", methods=["GET"])
def get_all_intelligence():
    return jsonify(processor.get_all_intelligence())

@app.route("/boundaries/pincode/intelligence/<pincode>", methods=["GET"])
def get_pincode_intelligence(pincode):
    intel = processor.get_pincode_intelligence(pincode)
    if not intel:
        return jsonify({"error": f"Pincode '{pincode}' not found"}), 404
    return jsonify(intel)

@app.route("/search", methods=["GET"])
def search_locations():
    query = request.args.get("q", "").lower().strip()
    if not query or len(query) < 2:
        return jsonify([])
    results = []
    for cat in CATEGORIES:
        for feat in _load_category(cat["id"]):
            props = feat.get("properties", {})
            name = str(props.get("name", "")).lower()
            addr = str(props.get("address", "")).lower()
            pin  = str(props.get("pincode", ""))
            if query in name or query in addr or query in pin:
                try:
                    lat = float(props.get("lat", 0))
                    lng = float(props.get("lng", 0))
                    if lat and lng:
                        results.append({"name": props.get("name",""), "address": props.get("address",""), "lat": lat, "lng": lng, "pincode": pin, "category": cat["id"], "categoryName": cat["name"], "color": cat["color"], "icon": cat["icon"]})
                except (TypeError, ValueError):
                    pass
        if len(results) >= 20:
            break
    return jsonify(results[:20])

@app.route("/insights/heatmap/<category>", methods=["GET"])
def get_heatmap_data(category):
    """Returns heatmap GeoJSON data for insights visualization"""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    heatmap_dir = os.path.join(base_dir, "data", "heatmap")
    
    result = []
    
    file_map = {
        "atm_location": ["all_atm.geojson"],
        "bank_branches": ["all_bank_branches.geojson", "federal_bank_branches.geojson"]
    }
    
    if category not in file_map:
        return jsonify(result)
    
    files = file_map[category]
    
    for filename in files:
        filepath = os.path.join(heatmap_dir, filename)
        if os.path.exists(filepath):
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    geojson_data = json.load(f)
                
                # Determine style based on filename
                style = get_heatmap_style(filename)
                
                result.append({
                    "filename": filename,
                    "geojson": geojson_data,
                    "style": style
                })
            except Exception as e:
                print(f"Error reading {filename}: {e}")
    
    return jsonify(result)

@app.route("/insights/category/<category>", methods=["GET"])
def get_category_insights(category):
    """Returns insights with counts for any category"""
    boundary = request.args.get("boundary", "").strip()
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    category_path = os.path.join(base_dir, "data", "categories", f"{category}.geojson")
    
    if not os.path.exists(category_path):
        return jsonify({"error": f"Category {category} data not found"}), 404
    
    with open(category_path, "r", encoding="utf-8") as f:
        category_data = json.load(f)
    
    features = category_data.get("features", [])
    
    # Perungudi boundary pincodes
    perungudi_pincodes = ["600041","600042","600061","600088","600091",
                          "600096","600097","600100","600113","600115",
                          "600117","600119","600129"]
    
    # Filter by boundary if specified
    if boundary and boundary.lower() == "perungudi":
        filtered_features = []
        for feat in features:
            props = feat.get("properties", {})
            pincode = str(props.get("pincode", "")).strip()
            if pincode in perungudi_pincodes:
                filtered_features.append(feat)
    else:
        filtered_features = features
    
    # Calculate total count
    total_count = len(filtered_features)
    
    # Calculate pincode-wise count
    pincode_counts = {}
    for feat in filtered_features:
        props = feat.get("properties", {})
        pincode = str(props.get("pincode", "")).strip()
        if pincode:
            pincode_counts[pincode] = pincode_counts.get(pincode, 0) + 1
    
    # Sort by pincode
    pincode_list = [{"pincode": pc, "count": cnt} for pc, cnt in sorted(pincode_counts.items())]
    
    # Get category display name
    cat_info = CATEGORY_MAP.get(category, {"name": category})
    category_name = cat_info.get("name", category.replace("_", " ").title())
    
    return jsonify({
        "category": category,
        "category_name": category_name,
        "boundary": boundary if boundary else "All",
        "total_count": total_count,
        "pincode_breakdown": pincode_list,
        "opportunity_analysis": [
            "High opportunity in low-density areas",
            "Moderate saturation zones detected",
            "Strategic expansion recommended in underserved pincodes"
        ]
    })

@app.route("/insights/compare", methods=["POST"])
def get_compare_insights():
    """Returns comparison data for multiple categories with pincode-wise breakdown"""
    data = request.get_json()
    categories = data.get("categories", [])
    boundary = data.get("boundary", "").strip()
    
    if not categories:
        return jsonify({"error": "Provide categories array"}), 400
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Perungudi boundary pincodes
    perungudi_pincodes = ["600041","600042","600061","600088","600091",
                          "600096","600097","600100","600113","600115",
                          "600117","600119","600129"]
    
    # Get pincode names mapping
    all_pincodes = processor.get_all_pincodes()
    pincode_names = {}
    for f in all_pincodes.get("features", []):
        p = f["properties"]
        pc = str(p.get("Pincode", ""))
        name = p.get("Office_Nam", pc).replace(" S.O", "").replace(" SO", "").strip()
        pincode_names[pc] = name
    
    # Collect data for all categories
    pincode_data = {}
    category_totals = {}
    
    for category in categories:
        category_path = os.path.join(base_dir, "data", "categories", f"{category}.geojson")
        
        if not os.path.exists(category_path):
            continue
        
        with open(category_path, "r", encoding="utf-8") as f:
            category_data = json.load(f)
        
        features = category_data.get("features", [])
        
        # Filter by boundary if specified
        if boundary and boundary.lower() == "perungudi":
            filtered_features = []
            for feat in features:
                props = feat.get("properties", {})
                pincode = str(props.get("pincode", "")).strip()
                if pincode in perungudi_pincodes:
                    filtered_features.append(feat)
        else:
            filtered_features = features
        
        # Get category display name
        cat_info = CATEGORY_MAP.get(category, {"name": category})
        category_name = cat_info.get("name", category.replace("_", " ").title())
        
        # Calculate pincode-wise count
        pincode_counts = {}
        for feat in filtered_features:
            props = feat.get("properties", {})
            pincode = str(props.get("pincode", "")).strip()
            if pincode:
                pincode_counts[pincode] = pincode_counts.get(pincode, 0) + 1
        
        # Store data
        for pincode, count in pincode_counts.items():
            if pincode not in pincode_data:
                pincode_data[pincode] = {}
            pincode_data[pincode][category_name] = count
        
        # Calculate total for this category
        category_totals[category_name] = sum(pincode_counts.values())
    
    # Build pincode table rows
    pincode_rows = []
    for pincode in sorted(pincode_data.keys()):
        row = {
            "pincode": pincode,
            "city_name": pincode_names.get(pincode, pincode)
        }
        for category in categories:
            cat_info = CATEGORY_MAP.get(category, {"name": category})
            category_name = cat_info.get("name", category.replace("_", " ").title())
            row[category_name] = pincode_data[pincode].get(category_name, 0)
        pincode_rows.append(row)
    
    # Build total table rows
    total_rows = []
    for category in categories:
        cat_info = CATEGORY_MAP.get(category, {"name": category})
        category_name = cat_info.get("name", category.replace("_", " ").title())
        total_rows.append({
            "data_category": category_name,
            "total_count": category_totals.get(category_name, 0)
        })
    
    return jsonify({
        "pincode_table": pincode_rows,
        "total_table": total_rows,
        "categories": [CATEGORY_MAP.get(cat, {"name": cat}).get("name", cat.replace("_", " ").title()) for cat in categories]
    })

def get_heatmap_style(filename):
    """Return predefined styles for heatmap layers"""
    styles = {
        "all_atm.geojson": {
            "color": "#1D4ED8",
            "size": 8,
            "shape": "circle",
            "opacity": 0.8,
            "name": "ATM"
        },
        "all_bank_branches.geojson": {
            "color": "#059669",
            "size": 8,
            "shape": "square",
            "opacity": 0.8,
            "name": "Bank Branches"
        },
        "federal_bank_branches.geojson": {
            "color": "#DC2626",
            "size": 10,
            "shape": "triangle",
            "opacity": 1.0,
            "name": "Federal Bank Branches"
        }
    }
    return styles.get(filename, {
        "color": "#6B7280",
        "size": 8,
        "shape": "circle",
        "opacity": 0.8,
        "name": "Unknown"
    })

@app.route("/correlation/data", methods=["POST"])
def get_correlation_data():
    """Returns correlation data based on selected categories from sample_correlation.json"""
    data = request.get_json()
    categories = data.get("categories", [])
    
    if not categories:
        return jsonify({"error": "Provide categories array"}), 400
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    correlation_path = os.path.join(base_dir, "data", "correlation", "sample_correlation.json")
    
    if not os.path.exists(correlation_path):
        return jsonify({"error": "Correlation data not found"}), 404
    
    with open(correlation_path, "r", encoding="utf-8") as f:
        all_correlations = json.load(f)
    
    def normalize_text(text):
        """STEP 1: Normalize - Convert × to x, lowercase, remove extra spaces"""
        return text.lower().replace("×", "x").replace(" ", "").strip()
    
    # STEP 1: Normalize user selected categories
    normalized_user_cats = [normalize_text(cat) for cat in categories]
    
    # STEP 2: Split into array (already done)
    # STEP 3: Sort both arrays
    sorted_user_cats = sorted(normalized_user_cats)
    
    # STEP 4: Find matching correlation by correlation_name
    for correlation in all_correlations:
        corr_name = correlation.get("correlation_name", "").strip()
        
        # STEP 1: Normalize correlation name
        normalized_corr = normalize_text(corr_name)
        
        # STEP 2: Split by x into array
        corr_parts = [p.strip() for p in normalized_corr.split("x") if p.strip()]
        
        # STEP 3: Sort JSON categories
        sorted_corr_parts = sorted(corr_parts)
        
        # STEP 4: STRICT MATCH - Length must be SAME and All categories must be SAME
        if len(sorted_user_cats) == len(sorted_corr_parts) and sorted_user_cats == sorted_corr_parts:
            return jsonify(correlation)
    
    # STEP 5: No match found - Do NOT show data
    return jsonify({
        "correlation_id": "NO_MATCH",
        "correlation_name": " x ".join(categories),
        "summary_insights": [],
        "expanded_view_details": []
    })

if __name__ == "__main__":
    app.run(port=5000, debug=True)
