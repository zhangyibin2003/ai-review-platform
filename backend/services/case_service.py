import json
from services.ai_service import generate_with_system_prompt
from prompts.case_prompts import CASE_GENERATION_SYSTEM


async def generate_case_for_kp(title: str, content: str) -> dict:
    """Generate case analysis for a knowledge point"""
    user_prompt = f"知识点名称：{title}\n知识点内容：{content}"
    result = await generate_with_system_prompt(CASE_GENERATION_SYSTEM, user_prompt, temperature=0.7)

    try:
        if "```json" in result:
            start = result.index("```json") + 7
            end = result.index("```", start)
            result = result[start:end].strip()
        return json.loads(result)
    except (json.JSONDecodeError, ValueError):
        return {
            "kp_title": title,
            "plain_explanation": result[:500],
            "real_life_example": "",
            "engineering_example": "",
            "usage_scenario": "",
            "exam_tips": "",
        }
