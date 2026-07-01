import streamlit as st
import pandas as pd
import urllib.parse
from data_models import fetch_convenient_commuter_hubs, generate_all_monthly_bands, get_council_tax_explanation

st.set_page_config(page_title="KeelEngine", layout="wide")

st.markdown("""
    <style>
    .metric-card { background-color: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 5px solid #2c3e50; margin-bottom: 15px; }
    .grade-badge { background-color: #2e7d32; color: white; padding: 5px 12px; border-radius: 4px; font-weight: 600; font-size: 13px; display: inline-block; margin-bottom: 12px; }
    .status-pass { color: #2e7d32; font-weight: bold; font-size: 14px; }
    .status-fail { color: #c62828; font-weight: bold; font-size: 14px; }
    </style>
""", unsafe_allow_html=True)

st.title("KeelEngine")
st.markdown("### Structural Convenience & Cost Allocation Matrix")

with st.form("matrix_criteria_form"):
    st.markdown("##### 📥 Define Relocation Parameters")
    
    c1, c2, c3 = st.columns(3)
    salary_input = c1.text_input("Gross Annual Salary (£)", placeholder="e.g. 45000")
    postcode_input = c2.text_input("Office Postcode (Full Target Recommended)", placeholder="e.g. EC2M 2PA")
    days_input = c3.slider("Required Weekly Office Days", 1, 5, 3)

    c4, c5 = st.columns(2)
    profile_input = c4.selectbox("Household Composition Scenario", ["Single Occupant", "Couple", "Group"])
    property_input = c5.selectbox("Target Property Configuration Type", ["Shared Flatshare / Room", "1-Bed Private Flat", "2-Bed Private Flat", "3-Bed Private Flat"])

    # ADDED DIRECT UI FIELD: Paste key straight into the application code flow securely
    api_key_input = st.text_input("Optional: Google Maps API Key (For Live Real-Time Commutes)", type="password", placeholder="AIzaSy...")

    ceiling_input = st.slider("Max Take-Home Budget Allocation Ceiling (%)", 20, 75, 45)
    submit_triggered = st.form_submit_button("Generate Relocation Matrix ➔", use_container_width=True)

if submit_triggered:
    if not salary_input or not postcode_input:
        st.error("❌ Action Blocked: Please supply both a Gross Annual Salary and an Office Postcode to evaluate options.")
    else:
        # Pass UI input key straight into the computation loop execution
        active_key = api_key_input.strip() if api_key_input else None
        df_hubs, google_error = fetch_convenient_commuter_hubs(postcode_input, api_key=active_key)
        
        net_monthly = (float(salary_input) * 0.78) / 12  
        earners = 1 if profile_input == "Single Occupant" else (2 if profile_input == "Couple" else 3)
        pooled_budget = net_monthly * earners
        max_allowed = pooled_budget * (ceiling_input / 100)
        
        st.markdown("---")
        st.markdown(f"### 📊 Active Household Financial Capacity")
        
        # Diagnostic Error Logging Module
        if active_key and not google_error:
            st.success("🛰️ Connected to Google Transit API Engine: Commute times and route lines are real-time calculations.")
        elif active_key and google_error:
            st.warning(f"⚠️ Google API Connection Rejected! Falling back to static estimates. Details: {google_error}")
        else:
            st.info("ℹ️ Running via Native Baseline Transit Matrix. Paste your Google Key in the field above for real-time live routing.")
            
        st.write(f"Combined Household Monthly Net Income: **£{pooled_budget:,.2f}/mo** | Maximum Spending Boundary: **£{max_allowed:,.2f}/mo**")
        st.markdown("---")

        for _, row in df_hubs.iterrows():
            rent_share = row["Rent_Tiers"].get(property_input, 1200) / earners
            commute_share = (row["Single_Fare_Cost"] * 2 * (days_input * 4.33)) / earners
            
            is_single = (profile_input == "Single Occupant")
            tax_matrix = generate_all_monthly_bands(row["Borough"], single_occupant=is_single, earners=earners)
            total_estimated_commitment = rent_share + tax_matrix["Band C"] + commute_share
            
            with st.container():
                col_meta, col_metrics, col_actions = st.columns([1.5, 1.8, 1.3])
                
                with col_meta:
                    st.markdown(f"### {row['Neighborhood']}")
                    st.markdown(f"<div class='grade-badge'>{row['Convenience_Grade']}</div>", unsafe_allow_html=True)
                    st.write(f"**Primary Hub:** {row['Nearest_Station']} (Zone {row['TfL_Zone']})")
                    st.write(f"**Route Active Path:** `{row['Transit_Line']}`")
                    st.write(f"**Commute Duration:** ~{row['Commute_Duration']} mins ({row['Transit_Mode']})")
                    
                with col_metrics:
                    m1, m3 = st.columns(2)
                    m1.metric("Rent Share", f"£{rent_share:,.0f}", help="Individual share of estimated structural rent.")
                    m3.metric("Commute Cost", f"£{commute_share:,.0f}", help="Expected travel expenditure over monthly cycle.")
                    
                    with st.expander("📊 View Local Council Tax Spectrum (A-H Share)", expanded=False):
                        st.caption(get_council_tax_explanation())
                        if property_input == "Shared Flatshare / Room":
                            st.info("Professional house shares typically bundle Council Tax directly into flat-rate utility contributions.")
                        else:
                            tax_data = [{"Valuation Band": b, "Your Monthly Cost": f"£{v:,.2f}"} for b, v in tax_matrix.items()]
                            st.table(pd.DataFrame(tax_data))
                            
                with col_actions:
                    st.write("<p style='margin-bottom:10px;'></p>", unsafe_allow_html=True)
                    if total_estimated_commitment <= max_allowed:
                        st.markdown("<p class='status-pass'>✅ Within Budget Ceiling</p>", unsafe_allow_html=True)
                    else:
                        st.markdown("<p class='status-fail'>⚠️ Exceeds Allocation Target</p>", unsafe_allow_html=True)
                        
                    outcode_target = row['Station_Outcode']
                    if property_input == "Shared Flatshare / Room":
                        spareroom_url = f"https://www.spareroom.co.uk/flatshare/search.pl?mode=list&action=search&query={outcode_target}&max_per_month={int(rent_share * 1.15)}"
                        st.link_button(f"Search Rooms in {outcode_target} ➔", spareroom_url, use_container_width=True)
                    else:
                        rightmove_url = f"https://www.rightmove.co.uk/property-to-rent/find.html?searchLocation={outcode_target}&propertyTypes=flat&index=0&sortType=6&channel=RENT&includeLetAgreed=false"
                        st.link_button(f"Search Flats in {outcode_target} ➔", rightmove_url, use_container_width=True)
                        
                st.markdown("<hr style='border-top: 1px dashed #ddd; margin:15px 0;'>", unsafe_allow_html=True)