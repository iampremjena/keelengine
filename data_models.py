import pandas as pd
import requests

def get_council_tax_explanation():
    return (
        "WARNING: This is an estimation matrix. Always cross-reference and check with your "
        "letting agent or landlord to confirm the exact official Council Tax band for a property "
        "before signing a tenancy agreement."
    )

def calculate_banded_council_tax(borough_name, band_tier="Band C", single_occupant=False):
    """
    Computes precise monthly liabilities using statutory proportions 
    against baseline local authority Band D tables.
    """
    borough_rates = {
        "newham": 1620, "waltham forest": 1824, "lewisham": 1692, "lambeth": 1572, 
        "islington": 1776, "croydon": 1944, "bexley": 1860, "city of london": 1120, 
        "tower hamlets": 1380, "hackney": 1540, "southwark": 1510, "camden": 1490
    }
    base_band_d = borough_rates.get(borough_name.lower(), 1600)
    
    # Official UK statutory proportions for property valuation bands
    band_proportions = {
        "Band A": 6/9, "Band B": 7/9, "Band C": 8/9, "Band D": 9/9,
        "Band E": 11/9, "Band F": 13/9, "Band G": 15/9, "Band H": 18/9
    }
    
    multiplier = band_proportions.get(band_tier, 8/9)
    annual_total = base_band_d * multiplier
    monthly_rate = annual_total / 12
    
    if single_occupant:
        monthly_rate *= 0.75  # Apply 25% single person discount
        
    return round(monthly_rate, 2)

def fetch_convenient_commuter_hubs(office_outcode):
    office_outcode = office_outcode.strip().upper()
    
    london_master_registry = {
        "E1": {"Place": "Whitechapel", "Station": "Whitechapel Station", "Line": "Elizabeth / District", "Zone": 2, "Borough": "Tower Hamlets", "Rent_Base": 950},
        "E2": {"Place": "Bethnal Green", "Station": "Bethnal Green Station", "Line": "Central Line", "Zone": 2, "Borough": "Tower Hamlets", "Rent_Base": 1050},
        "E3": {"Place": "Bow", "Station": "Bow Road Station", "Line": "District Line", "Zone": 2, "Borough": "Tower Hamlets", "Rent_Base": 880},
        "E13": {"Place": "Plaistow", "Station": "Plaistow Station", "Line": "District Line / Local Bus", "Zone": 3, "Borough": "Newham", "Rent_Base": 780},
        "E14": {"Place": "Canary Wharf", "Station": "Canary Wharf", "Line": "Jubilee / Elizabeth", "Zone": 2, "Borough": "Tower Hamlets", "Rent_Base": 1150},
        "E15": {"Place": "Stratford", "Station": "Stratford Station", "Line": "Central / Jubilee / Elizabeth", "Zone": 3, "Borough": "Newham", "Rent_Base": 850},
        "E16": {"Place": "Canning Town", "Station": "Canning Town Station", "Line": "Jubilee / DLR Network", "Zone": 3, "Borough": "Newham", "Rent_Base": 820},
        "E17": {"Place": "Walthamstow", "Station": "Walthamstow Central", "Line": "Victoria Line", "Zone": 3, "Borough": "Waltham Forest", "Rent_Base": 800},
        "N1": {"Place": "Islington", "Station": "Angel Station", "Line": "Northern Line", "Zone": 2, "Borough": "Islington", "Rent_Base": 1100},
        "N4": {"Place": "Finsbury Park", "Station": "Finsbury Park Station", "Line": "Victoria Line", "Zone": 2, "Borough": "Islington", "Rent_Base": 850},
        "SE10": {"Place": "Greenwich", "Station": "Greenwich Station", "Line": "DLR / National Rail", "Zone": 2, "Borough": "Greenwich", "Rent_Base": 920},
        "SE13": {"Place": "Lewisham", "Station": "Lewisham Station", "Line": "DLR Core", "Zone": 2, "Borough": "Lewisham", "Rent_Base": 810}
    }
    
    processed_hubs = []
    for outcode, meta in london_master_registry.items():
        transit_time = 25
        convenience_score = 70
        transit_mode = "TfL Rail Network"
        cost_weight = 3.20
        
        # Dynamic Localized Bus Core (e.g., Plaistow E13 to Canning Town E16)
        if office_outcode == "E16" and outcode == "E13":
            transit_time = 12  # Clean bus stop run vs 35 min walk
            convenience_score = 90
            transit_mode = "TfL Bus Route (Flat Fare)"
            cost_weight = 1.75  # Flat statutory bus tariff
        elif office_outcode == outcode:
            transit_time = 8
            convenience_score = 100
            transit_mode = "Immediate Neighborhood Proximity"
            cost_weight = 0.00
        elif office_outcode.startswith(("EC", "WC", "SE1")) or office_outcode in ["E1", "E14"]:
            if "Elizabeth" in meta["Line"] or "Northern" in meta["Line"]:
                transit_time = 12 if meta["Zone"] == 2 else 16
                convenience_score = 95
                cost_weight = 3.10
            elif "Jubilee" in meta["Line"]:
                transit_time = 14
                convenience_score = 90
                cost_weight = 3.10
                
        rent_multiplier = meta["Rent_Base"]
        rent_tiers = {
            "Shared Flatshare / Room": rent_multiplier,
            "1-Bed Private Flat": rent_multiplier * 1.85,
            "2-Bed Private Flat": rent_multiplier * 2.40,
            "3-Bed Private Flat": rent_multiplier * 3.10
        }
        
        processed_hubs.append({
            "Neighborhood": meta["Place"], "Borough": meta["Borough"], "TfL_Zone": meta["Zone"],
            "Rent_Tiers": rent_tiers, "Station_Outcode": outcode, "Nearest_Station": meta["Station"],
            "Transit_Line": meta["Line"], "Commute_Duration": transit_time,
            "Convenience_Rating": convenience_score, "Transit_Mode": transit_mode, "Single_Fare_Cost": cost_weight
        })
        
    return pd.DataFrame(processed_hubs).sort_values(by=["Convenience_Rating", "Commute_Duration"], ascending=[False, True])