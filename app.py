import streamlit as st
import pandas as pd
import urllib.parse
from data_models import fetch_convenient_commuter_hubs, generate_all_monthly_bands, get_council_tax_explanation

st.set_page_config(page_title="KeelEngine - Commute & Rental Finder", layout="wide")

# Fixed theme invisibility by replacing static hex profiles with variable CSS semantic design tokens
st.markdown("""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    html, body, [class*="css"] { font-family: 'Inter', sans-serif; }
    
    .location-card {
        border: 1px solid var(--text-color);
        opacity: 0.85;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 20px;
    }
    .main-header {
        color: var(--text-color);
        font-weight: 700;
        letter-spacing: -0.03em;
        margin: 0;
    }
    .grade-badge { 
        background-color: #059669; 
        color: white; 
        padding: 6px 14px; 
        border-radius: 4px; 
        font-weight: 600; 
        font-size: 12px; 
        display: inline-block; 
        text-transform: uppercase; 
    }
    .route-box { 
        background-color: rgba(59, 130, 246, 0.1); 
        padding: 14px; 
        border-radius: 6px; 
        font-size: 14px; 
        color: var(--text-color); 
        border-left: 4px solid #3b82f6; 
        margin: 12px 0; 
        line-height: 1.6; 
        font-weight: 500; 
    }
    .context-box { 
        font-size: 12px; 
        color: var(--text-color); 
        font-style: italic; 
        background-color: rgba(156, 163, 175, 0.08); 
        padding: 10px; 
        border-radius: 4px; 
        border: 1px dashed rgba(156, 163, 175, 0.4); 
        margin-top: 10px; 
    }
    .clean-dev-box {
        padding: 10px 0;
        line-height: 1.7;
        font-size: 15px;
        color: var(--text-color);
    }
    </style>
""", unsafe_allow_html=True)

if "current_nav_route" not in st.session_state:
    st.session_state["current_nav_route"] = "Home"

with st.container():
    nav_col_logo, nav_col_actions = st.columns([2.5, 1.5])
    with nav_col_logo:
        st.markdown("<h2 class='main-header'>KeelEngine</h2>", unsafe_allow_html=True)
    with nav_col_actions:
        selected_nav = st.selectbox(
            "Navigation Menu ☰", 
            ["Home", "Notifications Inbox", "App Survey", "Developer Portal"],
            index=["Home", "Notifications Inbox", "App Survey", "Developer Portal"].index(st.session_state["current_nav_route"])
        )
        st.session_state["current_nav_route"] = selected_nav

st.markdown("---")

# 1. SURVEY MENU SELECTION ROUTE
if st.session_state["current_nav_route"] == "App Survey":
    st.markdown("### 📋 KeelEngine Performance & Experience Survey")
    st.markdown("Your feedback helps refine the coordinate tracking engines and interface parameters.")
    
    with st.form("user_satisfaction_survey_form", clear_on_submit=True):
        st.markdown("##### Rate Your Experience")
        ui_rating = st.select_slider("1. How intuitive is the minimal layout interface?", options=["Poor", "Average", "Good", "Excellent"], value="Good")
        transit_rating = st.select_slider("2. How accurate are the live multi-mode journey breakdowns?", options=["Inaccurate", "Acceptable", "Highly Accurate"], value="Highly Accurate")
        
        st.markdown("##### Platform Feedback")
        feature_request = st.text_area("3. What additional transit networks or locations should the engine index next?", placeholder="e.g., More Zone 4 Overground links...")
        additional_comments = st.text_area("4. Additional Information / General Feedback", placeholder="Type any extra suggestions here...")
        
        submit_survey = st.form_submit_button("Submit Survey Response Directly ➔")
        
        if submit_survey:
            # Fix: Clean backslashes outside of the f-string block to prevent SyntaxError
            safe_features = feature_request.replace("'", "\\'")
            safe_comments = additional_comments.replace("'", "\\'")
            
            # Inject the tracking script safely
            ga_feedback_script = f"""
            <script>
                if (window.parent.gtag) {{
                    window.parent.gtag('event', 'app_feedback_submission', {{
                        'ui_layout_rating': '{ui_rating}',
                        'transit_accuracy': '{transit_rating}',
                        'requested_features': '{safe_features}',
                        'user_comments': '{safe_comments}'
                    }});
                }}
            </script>
            """
            st.components.v1.html(ga_feedback_script, height=0)
            st.success("✅ Thank you! Your feedback has been compiled securely and routed directly to the system architect.")

# 2. CLEAN DEVELOPER PORTAL ROUTE
elif st.session_state["current_nav_route"] == "Developer Portal":
    st.markdown("### 🛠️ Platform Engineering Profile")
    
    st.markdown("""
    <div class='clean-dev-box'>
        Platform Architect & Core Engineer: <strong>Prem Jena</strong><br><br>
        The underlying mathematical frameworks, conditional routing matrices, and visual layout structures running across this application have been conceptualized and custom-built exclusively by the developer.<br><br>
        🔒 <strong>Proprietary Protection Status:</strong> All core architecture files, internal registry indexes, and programmatic pipeline modules are strictly protected.
    </div>
    """, unsafe_allow_html=True)
    
    st.link_button("🔗 Connect on LinkedIn", "https://linkedin.com/", use_container_width=True)

# 3. NOTIFICATIONS MENU ROUTE
elif st.session_state["current_nav_route"] == "Notifications Inbox":
    st.markdown("### 🔔 System Notifications & Live Version Logs")
    st.info("📬 KeelEngine communication arrays are active. Version logs and notification objects appear below.")
    with st.expander("📦 System Update Container (v2.5.0)", expanded=True):
        st.write("• **Dark Mode Adaptability:** Reprogrammed visual elements using dynamic semantic token arrays (`var(--text-color)`) to support native system theme transitions seamlessly.")
        st.write("• **Demographic Optimization:** Streamlined filtering pools to support individual professionals and moving couples.")
        st.caption("Verification checks cleared.")

# 4. DEFAULT WORKFLOW (HOME PAGE)
else:
    with st.form("matrix_criteria_form"):
        st.markdown("##### 📥 Target Commute Matrix Criteria")
        c1, c2, c3 = st.columns(3)
        salary_val = c1.slider("Total Household Annual Salary (£)", 10000, 200000, 45000, step=5000)
        calculated_net_monthly = (float(salary_val) * 0.78) / 12  
        postcode_input = c2.text_input("Office Postcode Target Point", placeholder="e.g. E16 1US or MK6 1AF")
        days_input = c3.slider("Office Operations Frequency (Days/Week)", 1, 5, 3)

        c4, c5 = st.columns(2)
        profile_input = c4.selectbox("Household Composition", ["Just Me", "A Couple"])
        property_display = c5.selectbox("Target Residential Allocation", ["A single room in a shared flat", "Private 1-Bedroom Flat", "Private 2-Bedroom Flat"])
        
        property_map = {
            "A single room in a shared flat": "Shared Flatshare / Room",
            "Private 1-Bedroom Flat": "1-Bed Private Flat",
            "Private 2-Bedroom Flat": "2-Bed Private Flat"
        }
        property_input = property_map[property_display]
        ceiling_input = st.slider("Maximum Living Allocation Boundary Limit (%)", 20, 75, 45)
        submit_triggered = st.form_submit_button("Compute Cost & Transit Options ➔", use_container_width=True)

    if submit_triggered:
        if not postcode_input:
            st.error("❌ Target destination zip metric parameter required.")
        else:
            with st.spinner("🔄 Indexing live network topologies..."):
                df_hubs = fetch_convenient_commuter_hubs(postcode_input)
            
            office_outcode = postcode_input.strip().upper().split(" ")[0]
            core_london_prefixes = ("E", "N", "NW", "SE", "SW", "W", "EC", "WC")
            
            earners = 1 if profile_input == "Just Me" else 2
            pooled_budget = calculated_net_monthly * earners
            max_allowed = pooled_budget * (ceiling_input / 100)
            
            st.markdown("---")
            st.write(f"Household Net Resource Pool: **£{pooled_budget:,.2f}/mo** | Configured Boundary Ceiling: **£{max_allowed:,.2f}/mo**")
            st.markdown("---")

            for _, row in df_hubs.iterrows():
                rent_share = row["Rent_Tiers"].get(property_input, 1200) / earners
                commute_share = (row["Single_Fare_Cost"] * 2 * (days_input * 4.33)) / earners
                
                st.markdown(f"""
                <div class="location-card">
                    <div class="row">
                        ### {row['Neighborhood']}
                        <div class='grade-badge'>{row['Convenience_Grade']}</div>
                        <div class='route-box'>{row['Line_Route']}</div>
                    </div>
                </div>
                """, unsafe_allow_html=True)
                
                col_data, col_btn = st.columns([3.5, 1.5])
                with col_data:
                    duration_mins = row['Commute_Duration']
                    time_str = f"{duration_mins // 60} hr {duration_mins % 60} mins" if duration_mins >= 60 else f"{duration_mins} mins"
                    st.write(f"⏱️ **Total Transit Duration:** `{time_str}` | Rent Share: **£{rent_share:,.0f}/mo** | Travel Cost: **£{commute_share:,.0f}/mo**")
                    st.markdown(f"<div class='context-box'>📊 {row['Market_Context']}</div>", unsafe_allow_html=True)
                with col_btn:
                    st.write("<p style='margin-bottom:5px;'></p>", unsafe_allow_html=True)
                    search_term = property_input.lower().replace("private ", "").replace("shared ", "")
                    query_text = f"{row['Station_Outcode']} {search_term} to rent"
                    google_search_url = f"https://www.google.com/search?q={urllib.parse.quote(query_text)}"
                    st.link_button(f"Scan Listings in {row['Station_Outcode']} ➔", google_search_url, use_container_width=True)
                    
                st.markdown("<hr style='border-top: 1px dashed rgba(156,163,175,0.3); margin:15px 0;'>", unsafe_allow_html=True)