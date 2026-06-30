import streamlit as st
import pandas as pd
import urllib.parse
import requests
from data_models import fetch_live_proximity_hubs, get_live_council_tax, fetch_live_tfl_fares, get_council_tax_explanation

st.set_page_config(page_title="KeelEngine", layout="wide")

def resolve_postcode(pc):
    pc = pc.replace(" ", "").upper()
    try:
        res = requests.get(f"https://api.postcodes.io/postcodes/{pc}", timeout=3).json()["result"]
        return {"lat": res["latitude"], "lon": res["longitude"], "borough": res["admin_district"], "outcode": res["outcode"], "Region": "South" if res["outcode"].startswith(("SE", "SW")) else "North"}
    except: return {"lat": 51.5074, "lon": -0.1278, "borough": "City of London", "Region": "North"}

st.title("KeelEngine")
st.markdown("### Relocation & Affordability Matrix")

with st.expander("ℹ️ How to use"):
    st.write("1. Input salary and office postcode.\n2. Select household size (this divides rent/tax costs automatically).\n3. View affordable neighborhoods below.")

# Input Row 1
c1, c2, c3 = st.columns(3)
salary = c1.text_input("Gross Annual Salary (£)", placeholder="45000")
pc = c2.text_input("Office Postcode", placeholder="E16 1AA")
days = c3.slider("Weekly Office Days", 1, 5, 3)

# Input Row 2
c4, c5, c6 = st.columns(3)
profile = c4.selectbox("Household", ["Single Occupant", "Couple", "Group"])
strategy = c5.selectbox("Property Type", ["Shared Flatshare / Room", "1-Bed Private Flat", "2-Bed Private Flat", "3-Bed Private Flat"])
ceiling = c6.slider("Max Budget (%)", 20, 75, 45)

if salary and pc:
    geo = resolve_postcode(pc)
    df = fetch_live_proximity_hubs(geo["lat"], geo["lon"])
    
    # Financials
    net = (float(salary) * 0.8) / 12 # Simplified tax
    earners = 1 if profile == "Single Occupant" else (2 if profile == "Couple" else 3)
    pool = net * earners
    max_budget = pool * (ceiling / 100)

    st.markdown("---")
    for _, row in df.iterrows():
        rent = row["Rent_Tiers"].get(strategy, 1500) / earners
        tax = get_live_council_tax(row["Borough"], single_occupant=(profile=="Single Occupant")) / earners
        commute = (fetch_live_tfl_fares(row["TfL_Zone"], 1)["Single_Peak_Fare"] * 2 * (days * 4.3)) / earners
        
        with st.container():
            col1, col2, col3 = st.columns([1, 2, 1])
            col1.markdown(f"#### {row['Neighborhood']}")
            col1.write(f"Station: {row['Nearest_Station']}")
            
            # Transparency Metrics
            col2.metric("Rent", f"£{rent:,.0f}", help="Monthly share based on sector average.")
            col2.metric("Council Tax", f"£{tax:,.0f}", help=get_council_tax_explanation())
            col2.metric("Commute", f"£{commute:,.0f}", help="TfL cost based on zones and attendance.")
            
            # URL Encoded Links
            loc_query = urllib.parse.quote(row['Neighborhood'] + " London")
            link = f"https://www.spareroom.co.uk/flatshare/?search={loc_query}&max_per_month={int(rent * 1.1)}"
            col3.link_button("View Listings", link)
            st.markdown("---")