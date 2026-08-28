import requests
import math
from datetime import datetime
from functools import lru_cache

COUNCIL_TAX_MATRIX = {
    "Westminster": 973, "Wandsworth": 985, "City of London": 1205, "Hammersmith and Fulham": 1386,
    "Kensington and Chelsea": 1495, "Camden": 1950, "Greenwich": 1920, "Croydon": 2450,
    "Richmond upon Thames": 2280, "Kingston upon Thames": 2374, "Ealing": 1900, "Bexley": 2150,
    "Redbridge": 2100, "Barking and Dagenham": 2050, "Havering": 2150, "Enfield": 2080,
    "Barnet": 1950, "Islington": 1850, "Brent": 2030, "Lewisham": 2050, "Southwark": 1800, 
    "Tower Hamlets": 1700, "Hackney": 1880, "Lambeth": 1950, "Hillingdon": 1850, "Hounslow": 1950, 
    "Haringey": 2100, "Waltham Forest": 2150, "Sutton": 2250, "Merton": 2100, "Bromley": 2050, 
    "Harrow": 2250, "Newham": 1750, "Default": 2000
}

# HARDCODED AMENITIES & SAFETY SCORES FOR 110+ NEIGHBORHOODS
HARDCODED_AMENITIES = {
    "Abbey Wood": ("Sainsbury's Local", "The Abbey Arms", 72), "Acton": ("Waitrose", "The George & Dragon", 78),
    "Aldgate": ("Tesco Express", "The Hoop and Grapes", 81), "Angel": ("Waitrose", "The Angelic", 86),
    "Archway": ("Aldi", "St John's Tavern", 76), "Balham": ("Waitrose", "The Bedford", 84),
    "Bankside": ("M&S Food", "The Anchor Bankside", 85), "Barbican": ("Waitrose", "The Jugged Hare", 88),
    "Barking": ("Asda", "The Barking Dog", 68), "Barnes": ("M&S Food", "The Sun Inn", 92),
    "Barnet": ("Waitrose", "The Mitre", 83), "Battersea": ("Waitrose", "The Woodman", 86),
    "Bayswater": ("Waitrose", "The Churchill Arms", 84), "Beckenham": ("Waitrose", "The George Inn", 82),
    "Beckton": ("Asda", "The Tollgate", 69), "Belgravia": ("Waitrose", "The Thomas Cubitt", 94),
    "Belsize Park": ("Budgens", "The Washington", 88), "Bermondsey": ("Sainsbury's Local", "The Woolpack", 81),
    "Bethnal Green": ("Tesco Express", "The Sun Tavern", 73), "Bexleyheath": ("Asda", "The Golden Lion", 77),
    "Blackheath": ("M&S Food", "The Princess of Wales", 86), "Bloomsbury": ("Waitrose", "The Museum Tavern", 85),
    "Bow": ("Tesco Express", "The Bow Bells", 71), "Brentford": ("Sainsbury's", "The Magpie and Crown", 75),
    "Brixton": ("Tesco Superstore", "The Trinity Arms", 70), "Brockley": ("Sainsbury's Local", "The Wickham Arms", 76),
    "Bromley": ("Waitrose", "The Partridge", 81), "Camberwell": ("Morrisons", "The Camberwell Arms", 72),
    "Camden Town": ("Sainsbury's", "The Hawley Arms", 74), "Canary Wharf": ("Waitrose", "The Gun", 89),
    "Canning Town": ("Lidl", "The Durham Arms", 68), "Catford": ("Tesco", "The Catford Bridge Tavern", 70),
    "Chelsea": ("M&S Food", "The Builders Arms", 93), "Chingford": ("Co-op Food", "The Royal Oak", 78),
    "Chiswick": ("Waitrose", "The George IV", 88), "Clapham": ("Waitrose", "The Falcon", 83),
    "Clerkenwell": ("Waitrose", "The Eagle", 85), "Colindale": ("Asda", "The Chandos Arms", 74),
    "Covent Garden": ("Tesco Express", "The Lamb & Flag", 84), "Cricklewood": ("Co-op Food", "The Crown", 71),
    "Crouch End": ("Waitrose", "The Queens", 86), "Croydon": ("Waitrose", "The Dog & Bull", 69),
    "Crystal Palace": ("Sainsbury's", "The Westow House", 78), "Dalston": ("Sainsbury's", "The Farr's", 72),
    "Deptford": ("Tesco Express", "The Dog & Bell", 71), "Dulwich": ("M&S Food", "The Crown & Greyhound", 89),
    "Ealing": ("Waitrose", "The North Star", 85), "Earls Court": ("M&S Food", "The Blackbird", 83),
    "East Ham": ("Tesco Express", "The Denmark Arms", 67), "Edgware": ("Sainsbury's", "The Change of Horses", 75),
    "Elephant and Castle": ("Tesco Express", "The Elephant & Castle", 70), "Eltham": ("Sainsbury's", "The Rusty Bucket", 76),
    "Enfield": ("Waitrose", "The Crown and Horseshoes", 79), "Farringdon": ("Tesco Express", "The Betsey Trotwood", 84),
    "Finchley": ("Waitrose", "The Catcher In The Rye", 82), "Finsbury Park": ("Lidl", "The Faltering Fullback", 73),
    "Forest Gate": ("Co-op Food", "The Forest Tavern", 72), "Forest Hill": ("Sainsbury's", "The Capitol", 77),
    "Fulham": ("Waitrose", "The White Horse", 87), "Golders Green": ("Sainsbury's", "The Old Bull & Bush", 84),
    "Greenwich": ("M&S Food", "The Cutty Sark", 86), "Hackney": ("Tesco Express", "The Pembury Tavern", 74),
    "Hammersmith": ("Waitrose", "The Blue Anchor", 83), "Hampstead": ("Waitrose", "The Holly Bush", 92),
    "Harrow": ("Tesco Superstore", "The Castle", 79), "Highbury": ("Waitrose", "The Highbury Barn", 85),
    "Highgate": ("M&S Food", "The Flask", 90), "Holborn": ("Waitrose", "The Princess Louise", 83),
    "Holloway": ("Waitrose", "The Swimmer at the Grafton", 75), "Hornchurch": ("Sainsbury's", "The Fatling", 80),
    "Hounslow": ("Asda", "The Moon Under Water", 68), "Ilford": ("Sainsbury's", "The Great Spoon of Ilford", 67),
    "Isle of Dogs": ("Asda", "The Ferry House", 82), "Islington": ("Waitrose", "The Drapers Arms", 85),
    "Kennington": ("Tesco Express", "The Tommyfield", 78), "Kensington": ("Whole Foods", "The Churchill Arms", 91),
    "Kentish Town": ("Sainsbury's", "The Pineapple", 79), "Kew": ("Tesco Express", "The Greyhound", 93),
    "Kilburn": ("Aldi", "The Black Lion", 72), "King's Cross": ("Waitrose", "The Parcel Yard", 79),
    "Kingston upon Thames": ("Waitrose", "The Ram", 86), "Lewisham": ("Tesco Superstore", "The Fox & Firkin", 71),
    "Leyton": ("Asda", "The Leyton Technical", 72), "Marylebone": ("Waitrose", "The Barley Mow", 89),
    "Mayfair": ("M&S Food", "The Audley", 95), "Notting Hill": ("M&S Food", "The Elgin", 88),
    "Orpington": ("Tesco Extra", "The Maxwell", 81), "Paddington": ("Waitrose", "The Victoria", 82),
    "Peckham": ("Morrisons", "The Prince of Peckham", 71), "Pimlico": ("Sainsbury's", "The Marquis of Westminster", 86),
    "Poplar": ("Co-op Food", "The Ledger Building", 70), "Putney": ("Waitrose", "The Half Moon", 88),
    "Richmond": ("Waitrose", "The White Cross", 94), "Romford": ("Asda", "The Golden Lion", 73),
    "Rotherhithe": ("Co-op Food", "The Mayflower", 83), "Shepherd's Bush": ("Waitrose", "The Defector's Weld", 76),
    "Shoreditch": ("Co-op Food", "The Ten Bells", 73), "Soho": ("Tesco Express", "The French House", 82),
    "South Kensington": ("Waitrose", "The Anglesea Arms", 91), "Southwark": ("Tesco Express", "The Founders Arms", 81),
    "Stratford": ("Waitrose", "The Cart and Horses", 74), "Streatham": ("Aldi", "The Rabbit Hole", 75),
    "Surbiton": ("Waitrose", "The Antelope", 87), "Sutton": ("Sainsbury's", "The Cock & Bull", 80),
    "Tooting": ("Aldi", "The Castle", 77), "Tottenham": ("Asda", "The Antwerp Arms", 68),
    "Twickenham": ("Waitrose", "The Barmy Arms", 89), "Vauxhall": ("Sainsbury's", "The Black Dog", 79),
    "Walthamstow": ("Lidl", "The Bell", 76), "Wandsworth": ("Waitrose", "The Ship", 85),
    "Waterloo": ("Sainsbury's Local", "The Fire Station", 81), "Wembley": ("Asda", "The White Horse", 71),
    "Westminster": ("Waitrose", "The Red Lion", 86), "Whitechapel": ("Sainsbury's", "The Blind Beggar", 70),
    "Wimbledon": ("Waitrose", "The Dog & Fox", 91), "Woolwich": ("Tesco Extra", "The Dial Arch", 73)
}

RAW_LONDON_DATA = """Abbey Wood|Bexley|SE2|51.4924|0.1170|Elizabeth Line / Southeastern Rail
Acton|Ealing|W3|51.5081|-0.2734|Elizabeth Line / Central / District
Aldgate|City of London|EC3|51.5135|-0.0760|Circle Line / Metropolitan / Bus 25
Angel|Islington|N1|51.5327|-0.1058|Northern Line (Bank Branch) / Bus 38
Archway|Islington|N19|51.5654|-0.1348|Northern Line / Bus 134
Balham|Wandsworth|SW12|51.4427|-0.1526|Northern Line / Southern Rail
Bankside|Southwark|SE1|51.5076|-0.0994|Jubilee Line / Thameslink
Barbican|City of London|EC1|51.5203|-0.0938|Circle / Hammersmith & City / Met
Barking|Barking and Dagenham|IG11|51.5401|0.0784|District / Hammersmith & City / c2c
Barnes|Richmond upon Thames|SW13|51.4735|-0.2415|South Western Railway / Bus 33
Barnet|Barnet|EN5|51.6531|-0.2010|Northern Line (High Barnet)
Battersea|Wandsworth|SW11|51.4646|-0.1666|Northern Line / Overground
Bayswater|Westminster|W2|51.5123|-0.1878|District / Circle / Central
Beckenham|Bromley|BR3|51.4080|-0.0298|Southeastern Rail / Tramlink
Beckton|Newham|E6|51.5152|0.0631|DLR (Docklands Light Railway)
Belgravia|Westminster|SW1|51.4984|-0.1506|Victoria Line / Piccadilly Line
Belsize Park|Camden|NW3|51.5501|-0.1645|Northern Line (Edgware Branch)
Bermondsey|Southwark|SE1|51.4988|-0.0740|Jubilee Line / Bus 188
Bethnal Green|Tower Hamlets|E2|51.5273|-0.0555|Central Line / Overground
Bexleyheath|Bexley|DA6|51.4580|0.1384|Southeastern Railway / Bus 89
Blackheath|Lewisham|SE3|51.4658|0.0076|Southeastern Railway
Bloomsbury|Camden|WC1|51.5233|-0.1245|Piccadilly Line / Central Line
Bow|Tower Hamlets|E3|51.5284|-0.0245|District / Hammersmith & City
Brentford|Hounslow|TW8|51.4862|-0.3061|South Western Railway / Bus E8
Brixton|Lambeth|SW2|51.4626|-0.1155|Victoria Line / Bus 133
Brockley|Lewisham|SE4|51.4646|-0.0366|London Overground / Southern
Bromley|Bromley|BR1|51.4055|0.0147|Southeastern Railway / Thameslink
Camberwell|Southwark|SE5|51.4736|-0.0931|Thameslink / Bus 36 / 185
Camden Town|Camden|NW1|51.5390|-0.1426|Northern Line (Both Branches)
Canary Wharf|Tower Hamlets|E14|51.5054|-0.0235|Jubilee Line / Elizabeth Line / DLR
Canning Town|Newham|E16|51.5139|0.0081|Jubilee Line / DLR
Catford|Lewisham|SE6|51.4452|-0.0207|Southeastern / Thameslink
Chelsea|Kensington and Chelsea|SW3|51.4875|-0.1681|District Line / Circle Line
Chingford|Waltham Forest|E4|51.6318|0.0028|London Overground
Chiswick|Hounslow|W4|51.4930|-0.2646|District Line / Overground
Clapham|Lambeth|SW4|51.4622|-0.1378|Northern Line / Overground
Clerkenwell|Islington|EC1|51.5242|-0.1062|Farringdon Thameslink / Circle
Colindale|Barnet|NW9|51.5954|-0.2500|Northern Line (Edgware Branch)
Covent Garden|Westminster|WC2|51.5117|-0.1240|Piccadilly Line / Northern Line
Cricklewood|Brent|NW2|51.5583|-0.2078|Thameslink / Bus 189
Crouch End|Haringey|N8|51.5800|-0.1235|Bus W7 to Finsbury Park (Victoria Line)
Croydon|Croydon|CR0|51.3762|-0.0982|Southern Rail / Thameslink / Tramlink
Crystal Palace|Bromley|SE19|51.4206|-0.0706|London Overground / Southern Rail
Dalston|Hackney|E8|51.5463|-0.0756|London Overground (East London Line)
Deptford|Lewisham|SE8|51.4784|-0.0264|Southeastern Rail / DLR
Dulwich|Southwark|SE21|51.4456|-0.0845|Southeastern / Southern Rail
Ealing|Ealing|W5|51.5130|-0.3043|Elizabeth Line / Central / District
Earls Court|Kensington and Chelsea|SW5|51.4912|-0.1932|District / Piccadilly Line
East Ham|Newham|E6|51.5323|0.0554|District / Hammersmith & City
Edgware|Barnet|HA8|51.6135|-0.2755|Northern Line (Edgware Branch)
Elephant and Castle|Southwark|SE1|51.4942|-0.1011|Bakerloo / Northern / Thameslink
Eltham|Greenwich|SE9|51.4517|0.0526|Southeastern Railway
Enfield|Enfield|EN1|51.6521|-0.0814|London Overground / Great Northern
Farringdon|Islington|EC1|51.5204|-0.1050|Elizabeth Line / Thameslink / Circle
Finchley|Barnet|N3|51.6006|-0.1887|Northern Line (High Barnet Branch)
Finsbury Park|Islington|N4|51.5642|-0.1063|Victoria / Piccadilly / Great Northern
Forest Gate|Newham|E7|51.5471|0.0245|Elizabeth Line / London Overground
Forest Hill|Lewisham|SE23|51.4396|-0.0534|London Overground / Southern Rail
Fulham|Hammersmith and Fulham|SW6|51.4800|-0.2001|District Line
Golders Green|Barnet|NW11|51.5721|-0.1940|Northern Line / Bus 13
Greenwich|Greenwich|SE10|51.4811|-0.0052|DLR / Southeastern / Thameslink
Hackney|Hackney|E8|51.5450|-0.0553|London Overground / Bus 38
Hammersmith|Hammersmith and Fulham|W6|51.4922|-0.2236|District / Piccadilly / Hammersmith & City
Hampstead|Camden|NW3|51.5558|-0.1762|Northern Line / London Overground
Harrow|Harrow|HA1|51.5806|-0.3323|Metropolitan Line / Chiltern Railways
Highbury|Islington|N5|51.5517|-0.1005|Victoria Line / London Overground
Highgate|Camden|N6|51.5735|-0.1453|Northern Line (High Barnet Branch)
Holborn|Camden|WC1|51.5173|-0.1199|Central Line / Piccadilly Line
Holloway|Islington|N7|51.5555|-0.1166|Piccadilly Line / Northern Line
Hornchurch|Havering|RM11|51.5630|0.2185|District Line / Overground
Hounslow|Hounslow|TW3|51.4714|-0.3614|Piccadilly Line / South Western
Ilford|Redbridge|IG1|51.5583|0.0716|Elizabeth Line
Isle of Dogs|Tower Hamlets|E14|51.4910|-0.0159|DLR (Docklands Light Railway)
Islington|Islington|N1|51.5386|-0.1028|Victoria Line / Northern Line
Kennington|Lambeth|SE11|51.4883|-0.1058|Northern Line (Both Branches)
Kensington|Kensington and Chelsea|SW7|51.5020|-0.1873|District / Circle / High Street Ken
Kentish Town|Camden|NW5|51.5505|-0.1402|Northern Line / Thameslink
Kew|Richmond upon Thames|TW9|51.4817|-0.2858|District Line / Overground
Kilburn|Brent|NW6|51.5413|-0.2017|Jubilee Line / Overground
King's Cross|Camden|N1|51.5300|-0.1236|Victoria / Piccadilly / Northern / Circle
Kingston upon Thames|Kingston upon Thames|KT1|51.4111|-0.3005|South Western Railway
Lewisham|Lewisham|SE13|51.4619|-0.0108|DLR / Southeastern Railway
Leyton|Waltham Forest|E10|51.5647|-0.0163|Central Line
Marylebone|Westminster|W1|51.5178|-0.1517|Bakerloo Line / Chiltern Railways
Mayfair|Westminster|W1|51.5100|-0.1456|Jubilee / Victoria / Central
Notting Hill|Kensington and Chelsea|W11|51.5103|-0.2010|Central / District / Circle
Orpington|Bromley|BR6|51.3752|0.0984|Southeastern Railway
Paddington|Westminster|W2|51.5167|-0.1739|Elizabeth Line / Bakerloo / Circle
Peckham|Southwark|SE15|51.4739|-0.0683|London Overground / Southern Rail
Pimlico|Westminster|SW1|51.4888|-0.1378|Victoria Line
Poplar|Tower Hamlets|E14|51.5085|-0.0175|DLR (Docklands Light Railway)
Putney|Wandsworth|SW15|51.4633|-0.2155|District Line / South Western
Richmond|Richmond upon Thames|TW9|51.4616|-0.3018|District Line / Overground / SWR
Romford|Havering|RM1|51.5794|0.1804|Elizabeth Line / Overground
Rotherhithe|Southwark|SE16|51.5011|-0.0450|London Overground (East London Line)
Shepherd's Bush|Hammersmith and Fulham|W12|51.5042|-0.2185|Central Line / London Overground
Shoreditch|Hackney|N1|51.5229|-0.0776|London Overground / Northern Line
Soho|Westminster|W1|51.5136|-0.1328|Central Line / Northern / Piccadilly
South Kensington|Kensington and Chelsea|SW7|51.4941|-0.1738|Piccadilly / District / Circle
Southwark|Southwark|SE1|51.5031|-0.1047|Jubilee Line / Waterloo & City
Stratford|Newham|E15|51.5416|-0.0034|Central / Jubilee / Elizabeth / DLR
Streatham|Lambeth|SW16|51.4286|-0.1293|Southern Rail / Thameslink
Surbiton|Kingston upon Thames|KT6|51.3934|-0.3050|South Western Railway
Sutton|Sutton|SM1|51.3614|-0.1940|Southern Rail / Thameslink
Tooting|Wandsworth|SW17|51.4276|-0.1664|Northern Line / Southern Rail
Tottenham|Haringey|N17|51.5947|-0.0718|Victoria Line / London Overground
Twickenham|Richmond upon Thames|TW1|51.4475|-0.3275|South Western Railway
Vauxhall|Lambeth|SW8|51.4862|-0.1229|Victoria Line / South Western
Walthamstow|Waltham Forest|E17|51.5833|-0.0211|Victoria Line / London Overground
Wandsworth|Wandsworth|SW18|51.4552|-0.1924|South Western Railway
Waterloo|Lambeth|SE1|51.5036|-0.1143|Jubilee / Northern / Bakerloo
Wembley|Brent|HA9|51.5561|-0.2797|Jubilee / Metropolitan / Bakerloo
Westminster|Westminster|SW1|51.4975|-0.1357|Jubilee / District / Circle
Whitechapel|Tower Hamlets|E1|51.5194|-0.0612|Elizabeth / District / Overground
Woolwich|Greenwich|SE18|51.4917|0.0628|Elizabeth Line / DLR"""

PARSED_HUBS = []
for line in RAW_LONDON_DATA.strip().split("\n"):
    if line:
        parts = line.split("|")
        PARSED_HUBS.append({"name": parts[0], "borough": parts[1], "outcode": parts[2], "lat": float(parts[3]), "lon": float(parts[4]), "transit": parts[5]})

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    dlat, dlon = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    return 6371.0 * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))

def round_to_100(value: float) -> int: return int(round(value / 100) * 100)

# LRU Cache dramatically speeds up the search function by remembering postcodes in memory
@lru_cache(maxsize=1024)
def get_postcode_data(clean_input: str):
    return requests.get(f"https://api.postcodes.io/postcodes/{clean_input}", timeout=3).json()

def fetch_convenient_commuter_hubs(target_postcode: str, property_type: str, total_budget: float):
    clean_input = target_postcode.upper().replace(" ", "")
    market_multiplier = 1.0 + (max(0, datetime.now().year - 2024) + (datetime.now().month / 12.0)) * 0.045
    
    try:
        geo_json = get_postcode_data(clean_input)
        if "error" in geo_json or "result" not in geo_json: return {"error": "That postcode doesn't seem to exist. Please check your spelling."}
        res_data = geo_json["result"]
        office_lat, office_lon, region, outward_code = res_data["latitude"], res_data["longitude"], res_data.get("region", ""), res_data.get("outcode", "London")
    except Exception: return {"error": "Our routing map is currently waking up. Please try searching again in 5 seconds."}

    if region != "London" and "London" not in res_data.get("european_electoral_region", ""):
        return {"is_outside_london": True, "message": f"{outward_code}"}

    computed_cards = []

    for hub in PARSED_HUBS:
        d_office = calculate_haversine_distance(hub["lat"], hub["lon"], office_lat, office_lon)
        d_center_home = calculate_haversine_distance(hub["lat"], hub["lon"], 51.5074, -0.1278)
        
        target_zone = 1 if d_center_home <= 3 else (2 if d_center_home <= 6 else (3 if d_center_home <= 10 else 4))
        office_zone = 1 if calculate_haversine_distance(office_lat, office_lon, 51.5074, -0.1278) <= 3 else 2
        
        if d_office <= 1.5:
            duration, route, fare, log = int((d_office / 5.0) * 60), "🚶‍♂️ Direct Walk", 0.00, "Free door-to-door walk."
        else:
            if d_office < 5: duration = 12 + int((d_office / 20.0) * 60)
            elif d_office < 15: duration = 12 + int((d_office / 30.0) * 60)
            else: duration = 15 + int((d_office / 45.0) * 60)
            
            route = f"🚇 {hub['transit']}"
            if target_zone == 1 and office_zone == 1: fare, log = 3.10, "Zone 1 Core peak single tube journey."
            elif (target_zone == 2 and office_zone == 1) or (target_zone == 1 and office_zone == 2): fare, log = 3.60, "Zone 1-2 interconnect peak single journey."
            else: fare, log = 3.90 + ((target_zone - 3) * 0.90), f"Zone {target_zone} to Zone {office_zone} peak journey."
            
        base_rent = max(1100, 2700 - (d_center_home * 55))
        if "2-Bed" in property_type: base_rent *= 1.35
        rent_lower, rent_upper = round_to_100(base_rent * market_multiplier * 0.88), round_to_100(base_rent * market_multiplier * 1.12)
        
        if rent_lower > (total_budget + 400): continue 
        
        score = round(max(5.0, 100.0 - (duration * 1.5) - (fare * 4.5)), 1)
        
        # PULL FROM HARDCODED DICTIONARY
        amenities = HARDCODED_AMENITIES.get(hub["name"], ("🛒 Local Grocer", "🍻 The Local Pub", 75))

        computed_cards.append({
            "Neighborhood": hub["name"], "Borough": hub["borough"], "Station_Outcode": hub["outcode"], "Line_Route": route,
            "Commute_Duration": duration, "Rent_Range": f"£{rent_lower:,} - £{rent_upper:,}",
            "Single_Fare_Cost": float(fare), "Fare_Log": log, "Latitude": hub["lat"], "Longitude": hub["lon"],
            "Suggestion_Score": score, "Council_Tax_Band_D_Base": COUNCIL_TAX_MATRIX.get(hub["borough"], 2000),
            "Nearest_Grocery": f"🛒 {amenities[0]}", "Nearest_Pub": f"🍻 {amenities[1]}",
            "Safety_Score": amenities[2]
        })

    computed_cards.sort(key=lambda x: x["Suggestion_Score"], reverse=True)
    return {"hubs": computed_cards, "is_outside_london": False}