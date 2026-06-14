import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

async def check_data():
    uri = os.getenv("MONGO_URI")
    client = AsyncIOMotorClient(uri)
    db = client.get_database("doxa_analytics")
    collection = db.get_collection("tick_logs")
    
    latest_doc = await collection.find_one(sort=[("tick", -1)])
    if not latest_doc:
        print("No data")
        return
        
    latest_run_id = latest_doc.get("run_id")
    print(f"Latest Run ID: {latest_run_id}")
    
    docs = await collection.find({"run_id": latest_run_id}).sort("tick", -1).limit(10).to_list(length=10)
    for d in docs:
        agents = d.get('agents', [])
        print(f"Tick: {d.get('tick')}, Pop: {len(agents)}, Asabiyyah: {d.get('asabiyyah_index')}")
        roles = {}
        for a in agents:
            r = a.get("social_status", "Wanderer")
            roles[r] = roles.get(r, 0) + 1
        print(f"Roles: {roles}")
        print("---")

asyncio.run(check_data())
