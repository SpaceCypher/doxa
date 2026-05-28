import os
import asyncio
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GROQ_API_KEY")
client = AsyncOpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")

async def fetch(i):
    print(f"Sending request {i}...")
    try:
        response = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": f"Hello {i}"}],
            max_tokens=10
        )
        print(f"Response {i}:", response.choices[0].message.content)
    except Exception as e:
        print(f"Error {i}:", repr(e))

async def main():
    await asyncio.gather(*(fetch(i) for i in range(18)))

asyncio.run(main())
