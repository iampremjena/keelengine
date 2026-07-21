from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from supabase import create_client, Client
from data_models import fetch_convenient_commuter_hubs

app = FastAPI(title="KeelEngine Pro", version="10.0")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

SUPABASE_URL = "https://lsokajyrqpodytvtpczt.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxzb2thanlycXBvZHl0dnRwY3p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1Mjk4MzYsImV4cCI6MjA5OTEwNTgzNn0.xgks23X8C2eRExANCMu51PWfxZ7wxfwwHhG44a_66Kw"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

class ComputePayload(BaseModel):
    postcode: str
    days_per_week: int
    property_type: str
    total_budget: float  

class AuthRequest(BaseModel):
    email: str
    password: str

class ProfileUpdate(BaseModel):
    company_name: Optional[str] = None
    favorite_area: Optional[str] = None
    move_type: Optional[str] = None
    gross_salary: Optional[float] = None
    partner_salary: Optional[float] = None
    rent_split_user: Optional[float] = None
    budget_percent: Optional[float] = None
    office_postcode: Optional[str] = None
    full_name: Optional[str] = None
    pronouns: Optional[str] = None
    contact_number: Optional[str] = None
    dob: Optional[str] = None

class SaveProperty(BaseModel):
    neighborhood: str
    outcode: str
    rent_range: str
    suggestion_score: float

@app.post("/api/auth/signup")
def sign_up(request: AuthRequest):
    try:
        res = supabase.auth.sign_up({"email": request.email, "password": request.password})
        if res.user:
            supabase.table("profiles").insert({"id": res.user.id, "email": request.email}).execute()
            return {"message": "Account created successfully!", "user": res.user.email}
    except Exception as e: raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/auth/login")
def log_in(request: AuthRequest):
    try:
        res = supabase.auth.signInWithPassword({"email": request.email, "password": request.password})
        return {"access_token": res.session.access_token, "user": res.user.email}
    except Exception as e: raise HTTPException(status_code=400, detail="Invalid email or password.")

@app.post("/api/profile/update")
def update_profile(profile: ProfileUpdate, authorization: str = Header(...)):
    token = authorization.split(" ")[1]
    user = supabase.auth.get_user(token).user
    supabase.table("profiles").update(profile.dict(exclude_none=True)).eq("id", user.id).execute()
    return {"message": "Profile synced!"}

@app.post("/api/properties/save")
def save_property(prop: SaveProperty, authorization: str = Header(...)):
    token = authorization.split(" ")[1]
    user = supabase.auth.get_user(token).user
    data = prop.dict()
    data["user_id"] = user.id
    supabase.table("saved_properties").insert(data).execute()
    return {"message": "Neighborhood saved!"}

@app.post("/api/compute")
async def compute_matrix(payload: ComputePayload):
    results = fetch_convenient_commuter_hubs(payload.postcode, payload.property_type, payload.total_budget)
    
    if "error" in results: return {"error": results["error"], "hubs": []}
    if results.get("is_outside_london"): return {"is_outside_london": True, "message": results["message"], "hubs": []}
    
    output_cards = []
    for row in results["hubs"]:
        card = dict(row)
        card["Single_Fare_Formatted"] = f"£{float(row['Single_Fare_Cost']):.2f}"
        output_cards.append(card)

    return {"is_outside_london": False, "hubs": output_cards}