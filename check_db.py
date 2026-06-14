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
    
    docs = await collection.find().sort("tick", -1).limit(5).to_list(length=5)
    for d in docs:
        print(f"Tick: {d.get('tick')}, Pop: {len(d.get('agents', []))}, CPR: {d.get('cpr')}")
        print(f"Sample Agent: {d.get('agents')[0] if d.get('agents') else 'None'}")
        print("---")

asyncio.run(check_data())
