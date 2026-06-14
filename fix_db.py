import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

async def create_index():
    uri = os.getenv("MONGO_URI")
    print(f"Connecting to {uri}")
    client = AsyncIOMotorClient(uri)
    db = client.get_database("doxa_analytics")
    collection = db.get_collection("tick_logs")
    
    # Create descending index on 'tick'
    print("Creating index on 'tick'...")
    await collection.create_index([("tick", -1)])
    print("Index created successfully!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_index())
