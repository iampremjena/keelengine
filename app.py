import streamlit as st
import pandas as pd
import urllib.parse
import requests
from data_models import fetch_convenient_commuter_hubs, calculate_banded_council_tax, get_council_tax_explanation

st.set_page_config(page_title="KeelEngine", layout="wide")

st.markdown("""
    <style>
    .metric-card { background-color: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 5px solid #2c3e50; margin-bottom: 15px; }
    .grade-badge { background-color: #2e7d32; color: white; padding: 4px 10px; border-radius: 4px; font-weight: 600; font-size: 14px; display: inline-block; margin-bottom: 10px; }
    </style>
""", unsafe_allow_html=True)

def resolve_office_outcode(postcode_string):
    clean = postcode_string.replace(" ", "").upper()
    if len(clean) >= 5:
        return clean[:-3]
    try:
        res = requests.get(f"https://api.postcodes.io/postcodes/{clean}", timeout=3).json()["result"]
        return res["outcode"].upper()
    except:
        return clean

st.title("KeelEngine")
st.markdown("### Structural Convenience & Cost Allocation Matrix")

# Clean-Slate Setup: No preset values or hardcoded configurations inside the viewport fields
c1, c2, c3 = st.columns(3)
salary_input = c1.text_input("Gross Annual Salary (£)", placeholder="")
postcode_input = c2.text_input("Office Postcode (Full or Outcode)", placeholder="")
days_input = c3.slider("Weekly Office Days", 1, 5, 3)

c4, c5, c6 = st.columns(3)
profile_input = c4.selectbox("Household Composition", ["Single Occupant", "Couple", "Group"])
property_input = c5.selectbox("Property Configuration", ["Shared Flatshare / Room", "1-Bed Private Flat", "2-Bed Private Flat", "3-Bed Private Flat"])
selected_band = c6.selectbox("Assumed Property Council Tax Band", ["Band A", "Band B", "Band C", "Band D", "Band E", "Band F", "Band G", "Band H"], index=2)

ceiling_input = st.slider("Max Take-Home Budget Allocation Ceiling (%)", 20, 75, 45)

if salary_input and postcode_input:
    office_outcode = resolve_office_outcode(postcode_input)
    df_hubs = fetch_convenient_commuter_hubs(office_outcode)
    
    # Financial Core Processing
    net_monthly = (float(salary_input) * 0.78) / 12  
    earners = 1 if profile_input == "Single Occupant" else (2 if profile_input == "Couple" else 3)
    pooled_budget = net_monthly * earners
    max_allowed = pooled_budget * (ceiling_input / 100)
    
    st.markdown("---")
    st.markdown(f"### 📊 Household Budget Parameter Matrix")
    st.write(f"Combined Monthly Net Capacity: **£{pooled_budget:,.2f}/mo** | Maximum Spending Boundary: **£{max_allowed:,.2f}/mo**")
    st.markdown("---")

    for _, row in df_hubs.iterrows():
        rent_share = row["Rent_Tiers"].get(property_input, 1200) / earners
        
        if property_input == "Shared Flatshare / Room":
            tax_share = 0.00
        else:
            tax_share = calculate_banded_council_tax(row["Borough"], band_tier=selected_band, single_occupant=(profile_input == "Single Occupant")) / earners
            
        commute_share = (row["Single_Fare_Cost"] * 2 * (days_input * 4.33)) / earners
        total_monthly_commitment = rent_share + tax_share + commute_share
        
        if total_monthly_commitment <= max_allowed:
            with st.container():
                col_meta, col_metrics, col_actions = st.columns([1.6, 2, 1.1])
                
                with col_meta:
                    # Renders definitive names cleanly instead of raw code blocks
                    st.markdown(f"### {row['Neighborhood']}")
                    st.markdown(f"<div class='grade-badge'>{row['Convenience_Grade']}</div>", unsafe_allow_html=True)
                    st.write(f"**Station Target:** {row['Nearest_Station']} (Zone {row['TfL_Zone']})")
                    st.write(f"**Transit Pipeline:** {row['Transit_Mode']} via {row['Transit_Line']}")
                    st.write(f"**Door-to-Platform Est:** ~{row['Commute_Duration']} mins")
                    
                with col_metrics:
                    m1, m2, m3 = st.columns(3)
                    m1.metric("Rent Share", f"£{rent_share:,.0f}", help="Calculated individual share of local market structural averages.")
                    m2.metric("Council Tax", f"£{tax_share:,.2f}", help=get_council_tax_explanation())
                    m3.metric("Commute Cost", f"£{commute_share:,.0f}", help="Expected travel expenditure based on required weekly attendance cycles.")
                    
                with col_actions:
                    st.write("<p style='margin-bottom:25px;'></p>", unsafe_allow_html=True)
                    outcode_target = row['Station_Outcode']
                    
                    if property_input == "Shared Flatshare / Room":
                        spareroom_url = f"https://www.spareroom.co.uk/flatshare/search.pl?mode=list&action=search&query={outcode_target}&max_per_month={int(rent_share * 1.15)}"
                        st.link_button(f"Search Rooms in {outcode_target} ➔", spareroom_url, use_container_width=True)
                    else:
                        rightmove_url = f"https://www.rightmove.co.uk/property-to-rent/find.html?searchLocation={outcode_target}&propertyTypes=flat&index=0&sortType=6&channel=RENT&includeLetAgreed=false"
                        st.link_button(f"Search Flats in {outcode_target} ➔", rightmove_url, use_container_width=True)
                        
                st.markdown("<hr style='border-top: 1px dashed #ddd; margin:15px 0;'>", unsafe_allow_html=True)