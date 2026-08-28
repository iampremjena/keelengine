import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from openai import OpenAI
import httpx

app = FastAPI(title="KeelEngine Agentic Backend")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
TAVILY_KEY = os.getenv("TAVILY_API_KEY")

class ComputePayload(BaseModel):
    postcode: str
    days_per_week: int
    property_type: str
    total_budget: float

# 🧠 1. STRICT PYDANTIC SCHEMA: Forces OpenAI to return perfect JSON arrays
class Hub(BaseModel):
    Neighborhood: str = Field(description="Name of the London neighborhood")
    Station_Outcode: str = Field(description="Outward postcode, e.g. E16")
    Borough: str = Field(description="London Borough")
    Rent_Range: str = Field(description="Current estimated rent range, e.g. '£1,400 - £1,600'")
    Commute_Duration: int = Field(description="Estimated commute duration in minutes")
    Line_Route: str = Field(description="Primary tube/train route used")
    Single_Fare_Cost: float = Field(description="TfL peak single fare in GBP")
    Council_Tax_Band_D_Base: int = Field(description="Estimated Council Tax Band D annual cost")
    Nearest_Grocery: str = Field(description="A prominent grocery store brand nearby")
    Nearest_Pub: str = Field(description="A popular local pub")
    Safety_Score: int = Field(description="Safety rating from 1-100 based on London crime stats")
    Suggestion_Score: int = Field(description="Overall match score from 1-100")
    AI_Verdict: str = Field(description="2 sentence narrative on why this matches the user's constraints")

class AgenticSearchResponse(BaseModel):
    hubs: list[Hub]

@app.post("/api/compute")
async def compute_matrix(payload: ComputePayload):
    prompt = f"""
    The user works near {payload.postcode} and commutes {payload.days_per_week} days a week.
    They want a {payload.property_type} with a strict total monthly budget (rent + TfL fare) of £{payload.total_budget}.
    Identify 4 realistic London neighborhoods that fit this criteria. 
    Calculate realistic TfL peak fares and realistic rent data for these areas. Rank them logically.
    """
    
    try:
        # Using OpenAI Structured Outputs to guarantee response format
        response = client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are KeelEngine, an expert London real estate AI engine."},
                {"role": "user", "content": prompt}
            ],
            response_format=AgenticSearchResponse
        )
        return {"hubs": response.choices[0].message.parsed.model_dump()["hubs"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 🕸️ 2. LIVE WEB FETCHING AGENT (Rightmove / Zoopla)
@app.post("/api/fetch_live_listings")
async def fetch_live_listings(req: dict):
    # Uses Tavily API to bypass scraper blocks and search property portals
    query = f"site:rightmove.co.uk OR site:zoopla.co.uk {req['property_type']} to rent in {req['neighborhood']} under {req['max_rent']}"
    try:
        tavily_url = "https://api.tavily.com/search"
        payload = {
            "api_key": TAVILY_KEY,
            "query": query,
            "search_depth": "advanced",
            "include_domains": ["rightmove.co.uk", "zoopla.co.uk", "openrent.co.uk"],
            "max_results": 5
        }
        res = httpx.post(tavily_url, json=payload).json()
        return {"results": res.get("results", [])}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch live internet listings.")

# 📊 3. SENSITIVITY SIMULATOR AGENT
@app.post("/api/simulate_risk")
async def simulate_risk(req: dict):
    prompt = f"Current Rent: £{req['rent']}/mo. Current Transit: £{req['transit']}/mo. Generate a brief 3-year financial projection assuming 4% annual rent hikes and 4.9% TfL fare hikes. Summarize financial sensitivity in 3 bullet points."
    
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "system", "content": "You are a financial risk AI."}, {"role": "user", "content": prompt}]
    )
    return {"simulation_report": response.choices[0].message.content}