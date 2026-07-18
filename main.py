from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
from data_models import fetch_convenient_commuter_hubs

app = FastAPI(title="KeelEngine Pro", version="6.0")

# Allow all origins to prevent connection blocks from Vercel
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELS ---
class ComputePayload(BaseModel):
    postcode: str
    days_per_week: int
    property_type: str
    total_budget: float  

class EmailAuthRequest(BaseModel):
    email: str

class VerifyOtpRequest(BaseModel):
    email: str
    otp: str

# --- MOCK DATABASES ---
OTP_DATABASE = {}  
USER_DATABASE = {} 

# --- ROUTES ---
@app.post("/api/compute")
async def compute_matrix(payload: ComputePayload):
    results = fetch_convenient_commuter_hubs(
        target_postcode=payload.postcode, 
        property_type=payload.property_type,
        total_budget=payload.total_budget
    )
    
    if "error" in results:
        return {"error": results["error"], "hubs": []}
        
    if results.get("is_outside_london"):
        return {"is_outside_london": True, "message": results["message"], "hubs": []}
        
    output_cards = []
    for row in results["hubs"]:
        monthly_commute = float(row["Single_Fare_Cost"]) * 2 * payload.days_per_week * 4.33
        output_cards.append({
            "neighborhood": row["Neighborhood"],
            "borough": row["Borough"],
            "outcode": row["Station_Outcode"],
            "route": row["Line_Route"],
            "duration": int(row["Commute_Duration"]),
            "rent_range": row["Rent_Range"],  
            "commute_share": round(monthly_commute),
            "fare_log": row["Fare_Log"],
            "single_fare": f"£{float(row['Single_Fare_Cost']):.2f}",
            "latitude": float(row["Latitude"]),
            "longitude": float(row["Longitude"]),
            "suggestion_score": float(row["Suggestion_Score"]),
            "tax_base": int(row["Council_Tax_Band_D_Base"]),
            "grocery": str(row["Nearest_Grocery"])
        })
    return {"is_outside_london": False, "hubs": output_cards}

@app.post("/api/auth/send-otp")
def send_otp(request: EmailAuthRequest):
    generated_otp = f"{random.randint(100000, 999999)}"
    OTP_DATABASE[request.email] = generated_otp
    
    # Print to Render logs so you can see the code!
    print(f"\n======================================")
    print(f"[SECURITY] OTP for {request.email} is: {generated_otp}")
    print(f"======================================\n")
    
    return {"message": "OTP code generated! Check your Render terminal logs to copy it."}

@app.post("/api/auth/verify-otp")
def verify_otp(request: VerifyOtpRequest):
    stored_otp = OTP_DATABASE.get(request.email)
    
    if not stored_otp or stored_otp != request.otp:
        raise HTTPException(status_code=400, detail="Invalid verification code or code expired.")
    
    if request.email not in USER_DATABASE:
        USER_DATABASE[request.email] = {"saved_neighborhoods": []}
        
    del OTP_DATABASE[request.email]
    return {"status": "success", "user": USER_DATABASE[request.email]}

@app.get("/health")
async def system_health_ping():
    return {"status": "online"}