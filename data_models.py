import pandas as pd
import requests

def get_council_tax_explanation():
    return ("Council Tax estimates are based on 2026 London Band C averages. Actual costs vary by your specific property band (A-H), your borough, and a 25% discount if you live alone.")

def get_live_council_tax(borough_name, single_occupant=False):
    borough_rates = {
        "newham": 1620, "waltham forest": 1824, "lewisham": 1692, "lambeth": 1572, 
        "islington": 1776, "croydon": 1944, "bexley": 1860, "city of london": 1120, 
        "tower hamlets": 1380, "hackney": 1540, "southwark": 1510, "camden": 1490
    }
    base = borough_rates.get(borough_name.lower(), 1600)
    monthly = (base / 12) * 1.15
    return round(monthly * 0.75 if single_occupant else monthly, 2)

def fetch_live_tfl_fares(origin_zone, destination_zone, is_national_rail=False):
    zones_crossed = abs(origin_zone - destination_zone) + 1
    single = 3.90 if is_national_rail else 3.10
    daily_cap = 10.50 if zones_crossed <= 3 else 12.80
    return {"Single_Peak_Fare": single, "Daily_Cap": daily_cap, "Monthly_Travelcard": daily_cap * 22}

def fetch_live_proximity_hubs(office_lat, office_lon):
    url = f"https://api.postcodes.io/outcodes?lat={office_lat}&lon={office_lon}&limit=8"
    london_identity_map = {
        "E1": {"Place": "Whitechapel", "Station": "Whitechapel Station", "Line": "District/Elizabeth", "Zone": 2, "Time": 10, "Region": "North"},
        "E13": {"Place": "Plaistow", "Station": "Plaistow Station", "Line": "District/H&C", "Zone": 3, "Time": 14, "Region": "North"},
        "E14": {"Place": "Canary Wharf", "Station": "Canary Wharf Station", "Line": "Jubilee/DLR", "Zone": 2, "Time": 12, "Region": "North"},
        "E16": {"Place": "Canning Town", "Station": "Canning Town Station", "Line": "Jubilee/DLR", "Zone": 3, "Time": 12, "Region": "North"},
        "SE10": {"Place": "Greenwich", "Station": "Greenwich Station", "Line": "DLR", "Zone": 2, "Time": 16, "Region": "South"},
        "SE13": {"Place": "Lewisham", "Station": "Lewisham Station", "Line": "DLR", "Zone": 2, "Time": 22, "Region": "South"},
        "N1P": {"Place": "Angel / Islington", "Station": "Angel Station", "Line": "Northern Line", "Zone": 1, "Time": 6, "Region": "North"}
    }
    processed = []
    try:
        data = requests.get(url, timeout=4).json().get("result", [])
        for item in data:
            outcode = item.get("outcode", "").upper()
            meta = london_identity_map.get(outcode, {"Place": f"Area {outcode}", "Station": "Local Station", "Line": "Transport", "Zone": 3, "Time": 15, "Region": "North"})
            dist = item.get("distance", 1000) / 1000
            
            rent_tiers = {
                "Shared Flatshare / Room": max(700, 1000 - (dist * 30)),
                "1-Bed Private Flat": max(1350, 1850 - (dist * 50)),
                "2-Bed Private Flat": max(1750, 2450 - (dist * 70)),
                "3-Bed Private Flat": max(2250, 3200 - (dist * 90))
            }
            processed.append({
                "Neighborhood": meta["Place"], "Borough": item.get("admin_district", ["Newham"])[0],
                "TfL_Zone": meta["Zone"], "Rent_Tiers": rent_tiers, "latitude": item.get("latitude"),
                "longitude": item.get("longitude"), "Station_Outcode": outcode, 
                "Nearest_Station": meta["Station"], "Transit_Line": meta["Line"], 
                "Base_Time": meta["Time"], "Geographic_Region": meta["Region"]
            })
    except: pass
    return pd.DataFrame(processed)