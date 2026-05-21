import os
import asyncio
from typing import List, Dict
import json
from openai import AsyncOpenAI

def get_client():
    provider = os.getenv("LLM_PROVIDER", "groq").lower() # groq or openrouter
    
    if provider == "groq":
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY is not set.")
        return AsyncOpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1"), "llama-3.1-8b-instant"
    elif provider == "openrouter":
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY is not set.")
        return AsyncOpenAI(api_key=api_key, base_url="https://openrouter.ai/api/v1"), "openai/gpt-oss-120b:free"
    else:
        raise ValueError("Unsupported LLM_PROVIDER. Use 'groq' or 'openrouter'.")

async def batch_infer_actions(prompts: List[Dict[str, str]]) -> List[str]:
    """
    Given a list of prompts (one for each agent), ask the LLM for an action.
    Returns a list of raw string responses.
    """
    try:
        client, model_name = get_client()
    except Exception as e:
        print(f"LLM Client error: {e}")
        return [json.dumps({"action": {"type": "IDLE"}, "thoughts": f"Client error: {str(e)}"}) for _ in prompts]
        
    async def fetch_response(prompt_text: str):
        try:
            kwargs = {
                "model": model_name,
                "messages": [
                    {"role": "system", "content": "You output JSON format only."},
                    {"role": "user", "content": prompt_text}
                ],
                "temperature": 0.7,
                "max_tokens": 1024,
            }
            if os.getenv("LLM_PROVIDER", "groq").lower() == "openrouter":
                kwargs["extra_body"] = {"reasoning": {"enabled": True}}
            elif os.getenv("LLM_PROVIDER", "groq").lower() == "groq":
                kwargs["response_format"] = {"type": "json_object"}

            response = await client.chat.completions.create(**kwargs)
            return response.choices[0].message.content.strip()
        except Exception as e:
            error_msg = str(e)
            print(f"LLM API Error: {error_msg}")
            if "429" in error_msg or "Rate limit" in error_msg:
                raise e
            return json.dumps({"action": {"type": "IDLE"}, "thoughts": f"API Error: {error_msg}"})

    tasks = [fetch_response(p["text"]) for p in prompts]
    results = await asyncio.gather(*tasks)
    return results
