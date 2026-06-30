import pandas as pd
import requests

def get_council_tax_explanation():
    return (
        "Council Tax estimates are based on 2026 London Band C averages. "
        "Actual costs vary by your specific property band (A-H), your borough, "
        "and a 25% statutory discount if you live alone."
    )

def get_live_council_tax(borough_name, single_occupant=False):
    borough_rates = {
        "newham": 1620, "waltham forest": 1824, "lewisham": 1692, "lambeth": 1572, 
        "islington": 1776, "croydon": 1944, "bexley": 1860, "city of london": 1120, 
        "tower hamlets": 1380, "hackney": 1540, "southwark": 1510, "camden": 1490
    }
    base = borough_rates.get(borough_name.lower(), 1600)
    monthly = (base / 12) * 1.15
    return round(monthly * 0.75 if single_occupant else monthly, 2)

def fetch_convenient_commuter_hubs(office_outcode):
    """
    Evaluates strategic commuter pathways rather than geographic distance.
    Maps out high-value, direct-line residential sectors to major corporate engines.
    """
    office_outcode = office_outcode.strip().upper()
    
    # Complete operational database of high-yield London residential sectors
    london_master_registry = {
        "E1": {"Place": "Whitechapel / Stepney", "Station": "Whitechapel Station", "Line": "Elizabeth / District / Overground", "Zone": 2, "Borough": "Tower Hamlets", "Rent_Base": 950},
        "E2": {"Place": "Bethnal Green / Shoreditch", "Station": "Bethnal Green Station", "Line": "Central Line / Overground", "Zone": 2, "Borough": "Tower Hamlets", "Rent_Base": 1050},
        "E3": {"Place": "Bow / Bromley-by-Bow", "Station": "Bow Road Station", "Line": "District / Hammersmith & City", "Zone": 2, "Borough": "Tower Hamlets", "Rent_Base": 880},
        "E14": {"Place": "Canary Wharf / Poplar", "Station": "Canary Wharf Station", "Line": "Jubilee / DLR / Elizabeth Line", "Zone": 2, "Borough": "Tower Hamlets", "Rent_Base": 1150},
        "E15": {"Place": "Stratford", "Station": "Stratford International", "Line": "Elizabeth / Central / Jubilee / DLR", "Zone": 3, "Borough": "Newham", "Rent_Base": 850},
        "E16": {"Place": "Canning Town / Custom House", "Station": "Canning Town Station", "Line": "Jubilee Line / DLR", "Zone": 3, "Borough": "Newham", "Rent_Base": 820},
        "E17": {"Place": "Walthamstow", "Station": "Walthamstow Central", "Line": "Victoria Line / Overground", "Zone": 3, "Borough": "Waltham Forest", "Rent_Base": 800},
        "N1": {"Place": "Islington / Angel", "Station": "Angel Station", "Line": "Northern Line", "Zone": 2, "Borough": "Islington", "Rent_Base": 1100},
        "N4": {"Place": "Finsbury Park", "Station": "Finsbury Park Station", "Line": "Victoria / Piccadilly / Great Northern", "Zone": 2, "Borough": "Islington", "Rent_Base": 850},
        "SE10": {"Place": "Greenwich", "Station": "Greenwich Station", "Line": "DLR / Southeastern Rail", "Zone": 2, "Borough": "Greenwich", "Rent_Base": 920},
        "SE13": {"Place": "Lewisham", "Station": "Lewisham Station", "Line": "DLR / Southeastern Rail", "Zone": 2, "Borough": "Lewisham", "Rent_Base": 810},
        "CR0": {"Place": "Croydon", "Station": "East Croydon Station", "Line": "Thameslink / Southern Rail", "Zone": 5, "Borough": "Croydon", "Rent_Base": 680}
    }
    
    # Establish dynamic convenience routing weights based on transit lines running to the destination
    processed_hubs = []
    
    for outcode, meta in london_master_registry.items():
        # Default baseline calculations
        transit_time = 25
        convenience_score = 70
        is_direct = False
        
        # MOORGATE / LIVERPOOL STREET / CITY HUB ROUTING LOGIC (EC1, EC2, EC3, EC4)
        if office_outcode.startswith(("EC", "WC", "SE1")) or office_outcode in ["E1", "E14"]:
            if "Elizabeth" in meta["Line"] or "Northern" in meta["Line"]:
                transit_time = 12 if meta["Zone"] == 2 else 16
                convenience_score = 95  # Premium direct convenience rating
                is_direct = True
            elif "Jubilee" in meta["Line"] and office_outcode in ["E14", "EC2"]:
                transit_time = 14
                convenience_score = 90
                is_direct = True
            elif "Central" in meta["Line"]:
                transit_time = 15
                convenience_score = 88
                is_direct = True
            elif "Thameslink" in meta["Line"] and office_outcode.startswith("EC"):
                transit_time = 18
                convenience_score = 85
                is_direct = True
                
        # STRATFORD / NEWHAM HUB ROUTING LOGIC
        elif office_outcode in ["E15", "E16"]:
            if "Jubilee" in meta["Line"] or "DLR" in meta["Line"] or "Elizabeth" in meta["Line"]:
                transit_time = 10 if meta["Zone"] == 2 else 15
                convenience_score = 92
                is_direct = True
                
        # Scale pricing matrices to match actual market spreads for the configuration tier
        rent_multiplier = meta["Rent_Base"]
        rent_tiers = {
            "Shared Flatshare / Room": rent_multiplier,
            "1-Bed Private Flat": rent_multiplier * 1.85,
            "2-Bed Private Flat": rent_multiplier * 2.40,
            "3-Bed Private Flat": rent_multiplier * 3.10
        }
        
        processed_hubs.append({
            "Neighborhood": meta["Place"],
            "Borough": meta["Borough"],
            "TfL_Zone": meta["Zone"],
            "Rent_Tiers": rent_tiers,
            "Station_Outcode": outcode,
            "Nearest_Station": meta["Station"],
            "Transit_Line": meta["Line"],
            "Commute_Duration": transit_time,
            "Convenience_Rating": convenience_score,
            "Direct_Line": is_direct
        })
        
    df = pd.DataFrame(processed_hubs)
    # Return sorted by optimal convenience and commuter value instead of simple visual radius
    return df.sort_values(by=["Convenience_Rating", "Commute_Duration"], ascending=[False, True])