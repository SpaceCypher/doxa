import os
from motor.motor_asyncio import AsyncIOMotorClient
import logging

logger = logging.getLogger(__name__)

class AnalyticsService:
    def __init__(self):
        self.client = None
        self.db = None
        self.collection = None
        self.enabled = False

    def connect(self):
        mongo_uri = os.getenv("MONGO_URI")
        if not mongo_uri:
            logger.warning("MONGO_URI not found in environment. Online analytics logging is disabled.")
            return

        try:
            self.client = AsyncIOMotorClient(mongo_uri, serverSelectionTimeoutMS=5000)
            # Accessing database to trigger connection setup
            self.db = self.client.get_database("doxa_analytics")
            self.collection = self.db.get_collection("tick_logs")
            self.enabled = True
            logger.info("Connected to MongoDB for online analytics.")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            self.enabled = False

    def close(self):
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed.")

    async def log_tick(self, run_id: str, payload: dict):
        if not self.enabled or self.collection is None:
            return
        
        try:
            # Add run_id for grouping
            document = {
                "run_id": run_id,
                **payload
            }
            await self.collection.insert_one(document)
        except Exception as e:
            logger.error(f"Failed to insert tick log into MongoDB: {e}")

# Global instance
analytics = AnalyticsService()
