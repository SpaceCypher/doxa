import os
import asyncio
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GROQ_API_KEY")
client = AsyncOpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")

async def main():
    print("Sending request...")
    try:
        response = await asyncio.wait_for(client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": "Hello"}],
            max_tokens=10
        ), timeout=5.0)
        print("Response:", response.choices[0].message.content)
    except Exception as e:
        print("Error:", repr(e))

asyncio.run(main())
