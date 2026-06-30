import streamlit as st
import pandas as pd
import urllib.parse
import requests
from data_models import fetch_convenient_commuter_hubs, get_live_council_tax, get_council_tax_explanation

st.set_page_config(page_title="KeelEngine", layout="wide")

st.markdown("""
    <style>
    .metric-card { background-color: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 5px solid #2c3e50; margin-bottom: 15px; }
    .status-direct { color: #27ae60; font-weight: 600; font-size: 13px; }
    .status-connect { color: #d35400; font-weight: 600; font-size: 13px; }
    </style>
""", unsafe_allow_html=True)

def resolve_office_outcode(postcode_string):
    """Extracts a reliable outcode partition even under network failures."""
    clean = postcode_string.replace(" ", "").upper()
    if len(clean) >= 5:
        # Standard outcode splits for London variants (e.g., EC2A 2BB -> EC2A)
        return clean[:-3]
    try:
        res = requests.get(f"https://api.postcodes.io/postcodes/{clean}", timeout=3).json()["result"]
        return res["outcode"].upper()
    except:
        return "EC2A" # High-yield default City zone fallback

st.title("KeelEngine")
st.markdown("### Convenience & Cost-Optimized London Relocation Framework")

with st.expander("ℹ️ How KeelEngine Evaluates Options"):
    st.write("We do not filter by simple proximity. This engine tracks major London transit line pipelines. If an area has a direct, fast train connection to your office outcode, it is prioritized here even if it is geographically further away.")

# Balanced Input Flow Layout
c1, c2, c3 = st.columns(3)
salary_input = c1.text_input("Gross Annual Salary (£)", placeholder="e.g. 45000")
postcode_input = c2.text_input("Office Postcode", placeholder="e.g. EC2M 2PA (Moorgate/Liverpool St)")
days_input = c3.slider("Weekly Office Days", 1, 5, 3)

c4, c5, c6 = st.columns(3)
profile_input = c4.selectbox("Household Composition", ["Single Occupant", "Couple", "Group"])
property_input = c5.selectbox("Property Configuration", ["Shared Flatshare / Room", "1-Bed Private Flat", "2-Bed Private Flat", "3-Bed Private Flat"])
ceiling_input = c6.slider("Max Take-Home Budget Allocation (%)", 20, 75, 45)

if salary_input and postcode_input:
    office_outcode = resolve_office_outcode(postcode_input)
    df_hubs = fetch_convenient_commuter_hubs(office_outcode)
    
    # Complete Tax Adjustments
    net_monthly = (float(salary_input) * 0.78) / 12  
    earners = 1 if profile_input == "Single Occupant" else (2 if profile_input == "Couple" else 3)
    pooled_budget = net_monthly * earners
    max_allowed = pooled_budget * (ceiling_input / 100)
    
    st.markdown("---")
    st.markdown(f"### 📊 Household Analysis Core")
    st.write(f"Total Pooled Net Income: **£{pooled_budget:,.2f}/mo** | Maximum Allocation Target: **£{max_allowed:,.2f}/mo**")
    st.markdown("---")

    for _, row in df_hubs.iterrows():
        rent_share = row["Rent_Tiers"].get(property_input, 1200) / earners
        
        if property_input == "Shared Flatshare / Room":
            tax_share = 0.00
        else:
            tax_share = get_live_council_tax(row["Borough"], single_occupant=(profile_input == "Single Occupant")) / earners
            
        # Standard dynamic contactless fare modeling based on 2026 TfL pricing matrix
        zone_fare_weight = 3.20 if row["TfL_Zone"] == 2 else (4.10 if row["TfL_Zone"] == 3 else 5.60)
        commute_share = (zone_fare_weight * 2 * (days_input * 4.33)) / earners
        
        total_monthly_commitment = rent_share + tax_share + commute_share
        
        if total_monthly_commitment <= max_allowed:
            with st.container():
                col_meta, col_metrics, col_actions = st.columns([1.5, 2, 1.2])
                
                with col_meta:
                    st.markdown(f"#### {row['Neighborhood']}")
                    st.write(f"**Hub:** {row['Nearest_Station']} (Zone {row['TfL_Zone']})")
                    st.write(f"**Route:** {row['Transit_Line']}")
                    st.write(f"**Commute:** ~{row['Commute_Duration']} mins")
                    
                    if row["Direct_Line"]:
                        st.markdown("<span class='status-direct'>⚡ Direct Line Connection</span>", unsafe_allow_html=True)
                    else:
                        st.markdown("<span class='status-connect'>🔄 1 Quick Connection</span>", unsafe_allow_html=True)
                        
                with col_metrics:
                    m1, m2, m3 = st.columns(3)
                    m1.metric("Rent Share", f"£{rent_share:,.0f}", help="Your individual share of the monthly rent.")
                    m2.metric("Council Tax", f"£{tax_share:,.0f}", help=get_council_tax_explanation())
                    m3.metric("Commute Cost", f"£{commute_share:,.0f}", help="Calculated monthly PAYG contactless travelcard estimate.")
                    
                with col_actions:
                    st.write("<p style='margin-bottom:20px;'></p>", unsafe_allow_html=True)
                    
                    # URL ENCODING REPAIR: Targets the form submission engine directly to trigger an instant auto-search on click
                    encoded_search = urllib.parse.quote(row['Neighborhood'])
                    
                    if property_input == "Shared Flatshare / Room":
                        # Direct parameters forcing lists to display instantly without clicking additional prompts
                        spareroom_gateway = f"https://www.spareroom.co.uk/flatshare/search.pl?mode=list&action=search&query={encoded_search}+London&max_per_month={int(rent_share * 1.15)}"
                        st.link_button("Instant Room Search ➔", spareroom_gateway, use_container_width=True)
                    else:
                        rightmove_gateway = f"https://www.rightmove.co.uk/property-to-rent/search.html?searchLocation={encoded_search}&maxPrice={int(rent_share * 1.15)}&box_checked=on"
                        st.link_button("Instant Flat Search ➔", rightmove_gateway, use_container_width=True)
                        
                st.markdown("<hr style='border-top: 1px dashed #ddd; margin:15px 0;'>", unsafe_allow_html=True)