from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from data_models import fetch_convenient_commuter_hubs

app = FastAPI(title="KeelEngine Pro", version="6.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://keelengine.co.uk", "https://www.keelengine.co.uk"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ComputePayload(BaseModel):
    postcode: str
    days_per_week: int
    property_type: str
    total_budget: float  

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

@app.get("/health")
async def system_health_ping():
    return {"status": "online"}