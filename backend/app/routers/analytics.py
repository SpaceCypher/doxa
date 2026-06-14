import os
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from app.services.analytics import analytics
import google.generativeai as genai
import pandas as pd
import scipy.stats as stats
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["Analytics"])

# Configure Gemini
# Only configure if key exists
gemini_key = os.getenv("GEMINI_API_KEY")
if gemini_key:
    genai.configure(api_key=gemini_key)

@router.get("/timeseries")
async def get_timeseries(limit: int = 500):
    """
    Returns time-series data for the frontend graphs.
    Downsamples or limits to the last N ticks.
    """
    try:
        if not analytics.enabled or analytics.collection is None:
            raise HTTPException(status_code=503, detail="Analytics database not connected")
        
        # Get the latest run_id
        latest_doc = await analytics.collection.find_one(sort=[("tick", -1)])
        if not latest_doc:
            return []
        latest_run_id = latest_doc.get("run_id")
        
        # Fetch the latest N ticks sorted by tick for the current run only
        cursor = analytics.collection.find({"run_id": latest_run_id}).sort("tick", -1).limit(limit)
        docs = await cursor.to_list(length=limit)
        
        if not docs:
            return []
        
        # Sort chronological
        docs.reverse()
        
        series = []
        for d in docs:
            tick = d.get("tick")
            raw_asab = d.get("asabiyyah_index", 0.0)
            if isinstance(raw_asab, dict) and raw_asab:
                asabiyyah = sum(float(v) for v in raw_asab.values()) / len(raw_asab)
            else:
                try:
                    asabiyyah = float(raw_asab)
                except:
                    asabiyyah = 0.0
                    
            cpr = d.get("cpr", {})
            
            agents = d.get("agents", [])
            population = len(agents)
            
            # Calculate role distribution
            roles = {"farmer": 0, "priest": 0, "soldier": 0, "apprentice": 0, "elder": 0, "wanderer": 0}
            for a in agents:
                role_val = a.get("social_status")
                if not role_val:
                    role_val = "wanderer"
                role = str(role_val).lower()
                if role in roles:
                    roles[role] += 1
                else:
                    roles[role] = 1
                    
            series.append({
                "tick": tick,
                "asabiyyah": asabiyyah,
                "population": population,
                "cpr_wood": cpr.get("wood", 0),
                "cpr_water": cpr.get("water", 0),
                "roles": roles
            })
            
        return series
    except Exception as e:
        logger.error(f"Error in timeseries processing: {e}")
        error_msg = str(e)
        if "ServerSelectionTimeoutError" in error_msg or "timeout" in error_msg.lower():
            error_msg = "MongoDB Connection Failed: Please check your MongoDB Atlas IP Whitelist. Ensure your current IP is allowed."
        raise HTTPException(status_code=500, detail=error_msg)

@router.get("/insights")
async def get_insights():
    """
    Runs complex statistical analysis (ANOVA, Time Series) on the recent data
    and generates an AI explanation using Gemini.
    """
    if not analytics.enabled or analytics.collection is None:
        raise HTTPException(status_code=503, detail="Analytics database not connected")
        
    if not gemini_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")

    # Fetch last 100 ticks for deep analysis
    limit = 100
    try:
        # Get the latest run_id
        latest_doc = await analytics.collection.find_one(sort=[("tick", -1)])
        if not latest_doc:
            return {"status": "no_data"}
        latest_run_id = latest_doc.get("run_id")
        
        cursor = analytics.collection.find({"run_id": latest_run_id}).sort("tick", -1).limit(limit)
        docs = await cursor.to_list(length=limit)
    except Exception as e:
        logger.error(f"Error fetching insights from DB: {e}")
        error_msg = str(e)
        if "ServerSelectionTimeoutError" in error_msg or "timeout" in error_msg.lower():
            error_msg = "MongoDB Connection Failed: Please check your MongoDB Atlas IP Whitelist. Ensure your current IP is allowed."
        raise HTTPException(status_code=500, detail=error_msg)
        
    if len(docs) < 10:
        return {"status": "insufficient_data", "message": "Need at least 10 ticks for ANOVA and Time Series analysis."}
        
    docs.reverse()
    
    # --- Data Science: Time Series ---
    def parse_asab(val):
        if isinstance(val, dict) and val: return sum(float(v) for v in val.values()) / len(val)
        try: return float(val)
        except: return 0.0

    asabiyyah_series = [parse_asab(d.get("asabiyyah_index", 0.0)) for d in docs]
    pop_series = [len(d.get("agents", [])) for d in docs]
    
    # Calculate volatility (standard dev) and trend
    df = pd.DataFrame({"asabiyyah": asabiyyah_series, "population": pop_series})
    asabiyyah_volatility = df["asabiyyah"].std()
    pop_trend = df["population"].iloc[-1] - df["population"].iloc[0]
    
    # --- Data Science: ANOVA on Latest State ---
    latest_agents = docs[-1].get("agents", [])
    
    # Group HP by role to see if there's a statistically significant difference in survival/health
    role_hp_groups = {}
    for a in latest_agents:
        role = a.get("social_status", "wanderer")
        hp = a.get("vitals", {}).get("health", 0)
        if role not in role_hp_groups:
            role_hp_groups[role] = []
        role_hp_groups[role].append(hp)
        
    # Filter groups that have at least 2 agents
    valid_groups = [hp_list for role, hp_list in role_hp_groups.items() if len(hp_list) >= 2]
    
    f_stat, p_value = None, None
    anova_result_str = "Not enough role diversity for ANOVA."
    
    if len(valid_groups) >= 2:
        try:
            f_stat, p_value = stats.f_oneway(*valid_groups)
            if p_value < 0.05:
                anova_result_str = f"Significant! (p={p_value:.4f}). Social roles deeply dictate an agent's physical health."
            else:
                anova_result_str = f"Not significant (p={p_value:.4f}). All roles share equal health burdens."
        except Exception as e:
            anova_result_str = f"ANOVA Error: {e}"
            
    # --- AI Insights Generation via Gemini ---
    prompt = f"""
    You are an expert Sociologist and Data Scientist analyzing an autonomous AI civilization.
    
    Here is the statistical report for the last {limit} ticks:
    - Current Population: {pop_series[-1]} (Trend over {limit} ticks: {pop_trend})
    - Current Asabiyyah (Social Cohesion): {asabiyyah_series[-1]:.2f} (Volatility: {asabiyyah_volatility:.2f})
    
    Analysis of Variance (ANOVA) on Health (HP) across different Social Roles (Priests, Farmers, Soldiers):
    - F-Statistic: {f_stat}
    - P-Value: {p_value}
    - Conclusion: {anova_result_str}
    
    Based on these metrics, write a 2-paragraph narrative analyzing the current state of this society. 
    Explain what the ANOVA result implies about their class structure and inequality, and what the time-series trends say about their stability.
    Write it in a dramatic, scientific, yet philosophical tone.
    """
    
    try:
        model = genai.GenerativeModel("gemini-flash-latest")
        response = model.generate_content(prompt)
        ai_narrative = response.text
    except Exception as e:
        logger.error(f"Gemini API Error: {e}")
        ai_narrative = f"Failed to generate AI insights due to an error: {e}"
        
    return {
        "status": "success",
        "statistics": {
            "time_series": {
                "ticks_analyzed": int(limit),
                "population_trend": int(pop_trend),
                "asabiyyah_volatility": float(round(float(asabiyyah_volatility), 3))
            },
            "anova": {
                "f_statistic": float(round(float(f_stat), 3)) if f_stat is not None else None,
                "p_value": float(round(float(p_value), 4)) if p_value is not None else None,
                "conclusion": anova_result_str
            }
        },
        "narrative": ai_narrative
    }
