import streamlit as st
import pandas as pd
import urllib.parse
import requests
import math
from data_models import fetch_live_proximity_hubs, get_live_council_tax, fetch_live_tfl_fares

# Corporate Interface Configuration
st.set_page_config(page_title="KeelEngine | Spatial Affordability Suite", layout="wide")

st.markdown("""
    <style>
    .metric-card {
        background-color: #f8f9fa;
        padding: 18px;
        border-radius: 6px;
        border-left: 4px solid #2c3e50;
        margin-bottom: 12px;
    }
    .status-safe { color: #27ae60; font-weight: 600; }
    .status-leeway { color: #d35400; font-weight: 600; }
    .status-unaffordable { color: #c0392b; font-weight: 600; }
    div.stButton > button:first-child {
        border-radius: 4px;
        background-color: #2c3e50;
        color: white;
    }
    </style>
""", unsafe_allow_html=True)

def resolve_postcode_live(postcode_string):
    """Resolves coordinates and official administrative geography via live ONS data services."""
    clean_postcode = postcode_string.replace(" ", "").upper()
    url = f"https://api.postcodes.io/postcodes/{clean_postcode}"
    
    failsafe_database = {
        "E16": {"lat": 51.5149, "lon": 0.0081, "borough": "Newham"},
        "E15": {"lat": 51.5417, "lon": 0.0031, "borough": "Newham"},
        "SE13": {"lat": 51.4624, "lon": -0.0101, "borough": "Lewisham"}
    }
    
    try:
        response = requests.get(url, timeout=3)
        if response.status_code == 200:
            data = response.json()["result"]
            
            # Formulate river region classification parameter strings based on ONS district tags
            out = data["outcode"].upper()
            region = "South" if out.startswith("SE") or out.startswith("SW") or out.startswith("CR") or out.startswith("DA") else "North"
            
            return {
                "valid": True, "lat": data["latitude"], "lon": data["longitude"],
                "borough": data["admin_district"], "incode": data["incode"], "outcode": data["outcode"],
                "Region": region
            }
    except Exception:
        pass
    
    for prefix, dataset in failsafe_database.items():
        if clean_postcode.startswith(prefix):
            region = "South" if prefix.startswith("SE") or prefix.startswith("SW") or prefix.startswith("CR") else "North"
            return {
                "valid": True, "lat": dataset["lat"], "lon": dataset["lon"],
                "borough": dataset["borough"], "incode": "1AA", "outcode": prefix,
                "Region": region
            }
    return {"valid": False, "lat": 51.5074, "lon": -0.1278, "borough": "City of London", "Region": "North"}

st.title("KeelEngine | Professional Spatial Affordability Suite")
st.text("Analytical Point-to-Point Relocation Matrix for Corporate Entities and Professionals")

with st.expander("System Assumptions and Framework Disclosures", expanded=False):
    st.markdown("""
    * **Zonal Point-to-Point Routing Mechanics:** Commute costs and times are generated strictly from the closest primary station hub to your target corporate office outcode sector. Local doorway variations are excluded.
    * **Operational Non-Commitment Statement:** This software operates strictly as an optimization framework to aid regional financial profiling. Real-time listing inventory and final lease agreements must be verified independently by the client.
    """)

st.markdown("---")

# ==========================================
# CONFIGURATION PANEL
# ==========================================
st.sidebar.header("Configuration Panel")
gross_salary = st.sidebar.number_input("Annual Gross Salary (£)", min_value=20000, max_value=150000, value=45000, step=2500)
housing_type = st.sidebar.radio("Target Strategy", options=["1-Bed Private Flat", "Shared Flatshare / Room"], index=0)
budget_ceiling_pct = st.sidebar.slider("Net Income Housing Ceiling Max (%)", min_value=30, max_value=75, value=50, step=5)

st.sidebar.markdown("---")
raw_pc = st.sidebar.text_input("Corporate Office Postcode", value="E16 1AA")
office_days = st.sidebar.slider("Required Weekly Office Attendance", min_value=1, max_value=5, value=3)

# Execute Live Database Handshake
geo_profile = resolve_postcode_live(raw_pc)
df_locations = fetch_live_proximity_hubs(geo_profile["lat"], geo_profile["lon"])

# Statutory UK Tax Processing Formulas (2026 Fiscal Framework)
taxable_income = max(0.0, gross_salary - 12570)
income_tax = (taxable_income * 0.20) if gross_salary <= 50270 else (7400 + (gross_salary - 50270) * 0.40)
ni_contributions = max(0.0, gross_salary - 12570) * 0.08
net_monthly = round((gross_salary - income_tax - ni_contributions) / 12, 2)
max_survival_budget = round(net_monthly * (budget_ceiling_pct / 100), 2)

# ==========================================
# CENTRAL AREA: PERFORMANCE VISUALIZATIONS
# ==========================================
col_metrics, col_map = st.columns([1, 1.8])

with col_metrics:
    st.subheader("Financial Capacity Review")
    st.markdown(f"""
    <div class='metric-card'>
        <p style='margin:0; font-size:13px; color:#555;'>Calculated Net Monthly Salary</p>
        <h2 style='margin:0; color:#2c3e50; font-weight:500;'>£{net_monthly:,.2f}</h2>
    </div>
    <div class='metric-card' style='border-left-color: #d35400;'>
        <p style='margin:0; font-size:13px; color:#555;'>Maximum Budget Ceiling Allocation ({budget_ceiling_pct}%)</p>
        <h2 style='margin:0; color:#d35400; font-weight:500;'>£{max_survival_budget:,.2f}</h2>
    </div>
    """, unsafe_allow_html=True)

# ==========================================
# DATA COMPILING AND PARSING LOOP
# ==========================================
borough_to_zone_map = {
    "City of London": 1, "Camden": 1,
    "Lambeth": 2, "Islington": 2, "Lewisham": 2, "Tower Hamlets": 2, "Hackney": 2, "Southwark": 2,
    "Newham": 3, "Waltham Forest": 3, "Croydon": 5, "Bexley": 6
}
office_zone = borough_to_zone_map.get(geo_profile["borough"], 1)
processed_neighborhoods = []

for idx, row in df_locations.iterrows():
    rent = row["Avg_Rent_1Bed"] if housing_type == "1-Bed Private Flat" else row["Avg_Share_Rent"]
    council_tax = get_live_council_tax(row["Borough"]) if housing_type == "1-Bed Private Flat" else 0.0
    
    lat_delta = row["latitude"] - geo_profile["lat"]
    lon_delta = row["longitude"] - geo_profile["lon"]
    proximity_distance = math.sqrt(lat_delta**2 + lon_delta**2)
    
    home_zone = row["TfL_Zone"]
    is_nat_rail = True if "Southeastern" in row["Transit_Line"] or "Southern" in row["Transit_Line"] else False
    
    # 🌁 PHYSICAL BARRIER ASSESSMENT LOOP (RIVER SEPARATION BLOCKS)
    river_barrier_active = True if (geo_profile["Region"] != row["Geographic_Region"]) else False
    
    # Walking logic overrides are killed immediately if a river barrier separates the terminal nodes
    if geo_profile["valid"] and (geo_profile["outcode"].strip().upper() == row["Station_Outcode"].strip().upper()) and not river_barrier_active:
        optimal_commute = 0.00
        commute_label = "Walking Distance"
        calculated_time = 10
        math_explanation = "The office is within walking distance of this neighborhood's primary station hub platform node. Transit costs are evaluated at £0.00."
    elif proximity_distance <= 0.035 and not river_barrier_active:
        optimal_commute = 0.00
        commute_label = "Proximity Foot Route"
        calculated_time = 18
        math_explanation = "Geographic distance between local stations falls within walking parameters. Transit costs evaluated at £0.00."
    else:
        live_fare_data = fetch_live_tfl_fares(home_zone, office_zone, is_national_rail=is_nat_rail)
        
        single_peak_fare = live_fare_data["Single_Peak_Fare"]
        daily_return_fare = single_peak_fare * 2
        actual_daily_charge = min(daily_return_fare, live_fare_data["Daily_Cap"])
        
        daily_commute_cost = actual_daily_charge * (office_days * 4.333)
        monthly_card_cost = live_fare_data["Monthly_Travelcard"]
        
        # Surcharge travel time buffer penalty applied if an under-river cross is executed
        time_buffer = 8 if river_barrier_active else 0
        calculated_time = int(row["Base_Time_To_Hub"] + (live_fare_data["Zones_Crossed"] * 4) + time_buffer)
        
        if daily_commute_cost <= monthly_card_cost:
            optimal_commute = daily_commute_cost
            commute_label = "PAYG Contactless"
            math_explanation = f"Calculated from {row['Nearest_Station']} via {row['Transit_Line']}. Single peak fare: £{single_peak_fare:.2f}. Monthly cost for {office_days} days/week: £{optimal_commute:.2f}."
            if river_barrier_active:
                math_explanation += " (Note: Direct walking path blocked by River Thames. Route maps via localized cross-river transit infrastructure lines.)"
        else:
            optimal_commute = monthly_card_cost
            commute_label = "Fixed Monthly Travelcard"
            math_explanation = f"High travel frequency detected. Switched to an upfront Monthly Travelcard capped at £{monthly_card_cost:.2f} to minimize expense."
            
    total_survival_cost = rent + council_tax + optimal_commute
    soft_leeway_limit = max_survival_budget * 1.10
    
    if total_survival_cost <= max_survival_budget:
        status = "Approved Options"
        status_class = "status-safe"
    elif total_survival_cost <= soft_leeway_limit:
        status = "Within 10% Leeway Buffer"
        status_class = "status-leeway"
    else:
        status = "Exceeds Financial Allocation"
        status_class = "status-unaffordable"
        
    processed_neighborhoods.append({
        "Neighborhood": row["Neighborhood"], "Borough": row["Borough"], "Zone": row["TfL_Zone"],
        "Rent": rent, "Council Tax": council_tax, "Commute (Optimized)": round(optimal_commute, 2),
        "Commute_Mode": commute_label, "Math_Log": math_explanation, "Total Combined Cost": round(total_survival_cost, 2),
        "Status": status, "Status_Class": status_class, "Distance_Weight": proximity_distance,
        "latitude": float(row["latitude"]), "longitude": float(row["longitude"]), "Station_Outcode": row["Station_Outcode"],
        "Nearest_Station": row["Nearest_Station"], "Transit_Line": row["Transit_Line"], "Duration": calculated_time
    })

df_processed = pd.DataFrame(processed_neighborhoods)
df_affordable = df_processed.sort_values(by="Distance_Weight", ascending=True)

with col_map:
    st.subheader("Spatial Feasibility Map")
    df_map_view = df_affordable[df_affordable["Status"] != "Exceeds Financial Allocation"].copy()
    if not df_map_view.empty:
        st.map(df_map_view, latitude="latitude", longitude="longitude", size=80, zoom=10)
    else:
        st.error("No locations meet your current budget criteria. Adjust your allocation metrics in the panel.")

# ==========================================
# COMPONENT LIST PRESENTATION BLOCKS
# ==========================================
st.markdown("---")
st.subheader("Verified Living Options and Cost Breakdown")

for idx, area in df_affordable.iterrows():
    with st.container():
        col_area_meta, col_area_financials, col_area_links = st.columns([1.5, 2, 1.2])
        
        with col_area_meta:
            st.markdown(f"### {area['Neighborhood']}")
            st.markdown(f"**Nearest Station:** {area['Nearest_Station']} (Zone {area['Zone']})")
            st.markdown(f"**Transit Route:** {area['Transit_Line']}")
            st.markdown(f"**Commute Duration:** {area['Duration']} minutes")
            st.markdown(f"**Financial Status:** <span class='{area['Status_Class']}'>{area['Status']}</span>", unsafe_allow_html=True)
            
        with col_area_financials:
            subcol1, subcol2, subcol3 = st.columns(3)
            subcol1.metric("Average Monthly Rent", f"£{area['Rent']:,.2f}")
            subcol2.metric("Council Tax (Band C)", f"£{area['Council Tax']:,.2f}")
            subcol3.metric("Calculated Commute", f"£{area['Commute (Optimized)']:,.2f}", delta=area["Commute_Mode"], delta_color="normal")
            
            with st.expander("Review Commute Breakdown Math"):
                st.caption(area["Math_Log"])
                
        with col_area_links:
            st.markdown("<p style='margin-bottom:15px;'></p>", unsafe_allow_html=True)
            max_rent_ceil = int(area["Rent"] * 1.05)
            
            rightmove_url = f"https://www.rightmove.co.uk/tags/renderer.html?searchLocation={area['Station_Outcode']}&context=RENT&maxPrice={max_rent_ceil}"
            spareroom_url = f"https://www.spareroom.co.uk/flatshare/?max_per_month={max_rent_ceil}&search={area['Station_Outcode']}&flatshare_type=offered"
            
            if housing_type == "1-Bed Private Flat":
                st.link_button(f"Find Flats in {area['Neighborhood']}", rightmove_url, use_container_width=True)
            else:
                st.link_button(f"Find Rooms in {area['Neighborhood']}", spareroom_url, use_container_width=True)
        st.markdown("<hr style='margin: 10px 0; border: 0; border-top: 1px solid #eee;'>", unsafe_allow_html=True)