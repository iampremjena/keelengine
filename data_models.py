import pandas as pd
import requests

def get_council_tax_explanation():
    return (
        "WARNING: This is an estimation matrix. Always cross-reference and check with your "
        "letting agent or landlord to confirm the exact official Council Tax band for a property "
        "before signing a tenancy agreement."
    )

def calculate_banded_council_tax(borough_name, band_tier="Band C", single_occupant=False):
    borough_rates = {
        "newham": 1620, "waltham forest": 1824, "lewisham": 1692, "lambeth": 1572, 
        "islington": 1776, "croydon": 1944, "bexley": 1860, "city of london": 1120, 
        "tower hamlets": 1380, "hackney": 1540, "southwark": 1510, "camden": 1490
    }
    base_band_d = borough_rates.get(borough_name.lower(), 1600)
    
    band_proportions = {
        "Band A": 6/9, "Band B": 7/9, "Band C": 8/9, "Band D": 9/9,
        "Band E": 11/9, "Band F": 13/9, "Band G": 15/9, "Band H": 18/9
    }
    
    multiplier = band_proportions.get(band_tier, 8/9)
    annual_total = base_band_d * multiplier
    monthly_rate = annual_total / 12
    
    if single_occupant:
        monthly_rate *= 0.75
        
    return round(monthly_rate, 2)

def fetch_convenient_commuter_hubs(office_outcode):
    """
    Evaluates neighborhood transit connectivity vectors. 
    Ranks locations dynamically by structural convenience (changes/direct lines)
    instead of raw geometric proximity.
    """
    office_outcode = office_outcode.strip().upper()
    
    # Comprehensive real-world naming registry mapping outcodes to definitive London neighborhoods
    london_master_registry = {
        "E1": {"Place": "Whitechapel & Stepney", "Station": "Whitechapel Station", "Line": "Elizabeth Line / District / Overground", "Zone": 2, "Borough": "Tower Hamlets", "Rent_Base": 950},
        "E2": {"Place": "Bethnal Green & Shoreditch", "Station": "Bethnal Green Station", "Line": "Central Line / Overground", "Zone": 2, "Borough": "Tower Hamlets", "Rent_Base": 1050},
        "E3": {"Place": "Bow & Mile End", "Station": "Bow Road Station", "Line": "District / Central / Hammersmith & City", "Zone": 2, "Borough": "Tower Hamlets", "Rent_Base": 880},
        "E14": {"Place": "Canary Wharf & Isle of Dogs", "Station": "Canary Wharf Station", "Line": "Jubilee / DLR / Elizabeth Line", "Zone": 2, "Borough": "Tower Hamlets", "Rent_Base": 1150},
        "E15": {"Place": "Stratford & Olympic Park", "Station": "Stratford Station", "Line": "Elizabeth / Central / Jubilee / DLR", "Zone": 3, "Borough": "Newham", "Rent_Base": 850},
        "E16": {"Place": "Canning Town & Custom House", "Station": "Canning Town Station", "Line": "Jubilee Line / DLR", "Zone": 3, "Borough": "Newham", "Rent_Base": 820},
        "E17": {"Place": "Walthamstow Central", "Station": "Walthamstow Central", "Line": "Victoria Line / Overground", "Zone": 3, "Borough": "Waltham Forest", "Rent_Base": 800},
        "N1": {"Place": "Angel & Islington", "Station": "Angel Station", "Line": "Northern Line", "Zone": 2, "Borough": "Islington", "Rent_Base": 1100},
        "N4": {"Place": "Finsbury Park", "Station": "Finsbury Park Station", "Line": "Victoria / Piccadilly / National Rail", "Zone": 2, "Borough": "Islington", "Rent_Base": 850},
        "SE10": {"Place": "Greenwich Village", "Station": "Greenwich Station", "Line": "DLR / Southeastern Rail", "Zone": 2, "Borough": "Greenwich", "Rent_Base": 920},
        "SE13": {"Place": "Lewisham Hub", "Station": "Lewisham Station", "Line": "DLR / Southeastern Rail", "Zone": 2, "Borough": "Lewisham", "Rent_Base": 810},
        "CR0": {"Place": "Croydon Central", "Station": "East Croydon Station", "Line": "Thameslink / Southern Rail", "Zone": 5, "Borough": "Croydon", "Rent_Base": 680}
    }
    
    processed_hubs = []
    
    for outcode, meta in london_master_registry.items():
        # Baseline structural metrics
        transit_time = 25
        score = 60
        grade = "Grade C (Standard)"
        transit_mode = "Standard Rail Connection"
        cost_weight = 3.20
        
        # 1. IMMEDIATE LOCAL MATCH
        if office_outcode == outcode:
            transit_time = 5
            score = 100
            grade = "Grade A+ (Walking/Immediate)"
            transit_mode = "Walking Route"
            cost_weight = 0.00
            
        # 2. LOCAL TFL BUS CORRIDOR CORE (Handles Plaistow/Canning Town dynamics seamlessly)
        elif office_outcode == "E16" and outcode == "E13":
            transit_time = 12
            score = 92
            grade = "Grade A (Direct Local Bus)"
            transit_mode = "TfL Bus Connection (Flat Tariff)"
            cost_weight = 1.75
            
        # 3. PREMIUM CENTRAL/CITY TRANSIT PIPELINES (EC1-4, WC1-2, Liverpool St/Moorgate Hubs)
        elif office_outcode.startswith(("EC", "WC", "SE1")) or office_outcode in ["E1", "E14"]:
            if "Elizabeth" in meta["Line"] or "Northern" in meta["Line"]:
                transit_time = 11 if meta["Zone"] == 2 else 15
                score = 95
                grade = "Grade A (High-Speed Direct)"
                transit_mode = "Direct Express Trunk Line"
                cost_weight = 3.10
            elif "Jubilee" in meta["Line"] or "Central" in meta["Line"]:
                transit_time = 14
                score = 88
                grade = "Grade B+ (Direct Tube Line)"
                transit_mode = "Direct Underground Trunk Line"
                cost_weight = 3.10
            else:
                transit_time = 22
                score = 75
                grade = "Grade B (1 Quick Transfer)"
                transit_mode = "Single Interchange Connection"
                cost_weight = 3.10
                
        # 4. EAST LONDON INTER-HUB CONNECTIONS
        elif office_outcode in ["E15", "E16"]:
            if "Jubilee" in meta["Line"] or "DLR" in meta["Line"]:
                transit_time = 10 if meta["Zone"] == 2 else 14
                score = 90
                grade = "Grade A (Direct East Link)"
                transit_mode = "Direct High-Frequency Transit"
                cost_weight = 2.50
                
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
            "Convenience_Score": score, "Convenience_Grade": grade, "Transit_Mode": transit_mode, "Single_Fare_Cost": cost_weight
        })
        
    # Sort options strictly by Convenience Score descending so the best connections appear first
    return pd.DataFrame(processed_hubs).sort_values(by="Convenience_Score", ascending=False)