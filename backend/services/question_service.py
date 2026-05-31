import json
from services.ai_service import generate_with_system_prompt
from prompts.question_prompts import QUESTION_GENERATION_SYSTEM, WEAKNESS_QUESTION_SYSTEM


async def generate_questions(knowledge_points: list[dict]) -> list[dict]:
    """Generate a question bank from knowledge points"""
    kp_text = json.dumps(knowledge_points, ensure_ascii=False, indent=2)
    user_prompt = f"请根据以下知识点生成题库：\n\n{kp_text}"
    result = await generate_with_system_prompt(QUESTION_GENERATION_SYSTEM, user_prompt, temperature=0.8)

    try:
        if "```json" in result:
            start = result.index("```json") + 7
            end = result.index("```", start)
            result = result[start:end].strip()
        elif "```" in result:
            start = result.index("```") + 3
            end = result.index("```", start)
            result = result[start:end].strip()
        return json.loads(result)
    except (json.JSONDecodeError, ValueError):
        return []


async def generate_weakness_questions(error_kps: list[dict], wrong_attempts: list[dict]) -> list[dict]:
    """Generate targeted questions for weak areas"""
    context = {
        "错误知识点": error_kps,
        "错题记录": wrong_attempts,
    }
    user_prompt = json.dumps(context, ensure_ascii=False, indent=2)
    result = await generate_with_system_prompt(WEAKNESS_QUESTION_SYSTEM, user_prompt, temperature=0.8)

    try:
        if "```json" in result:
            start = result.index("```json") + 7
            end = result.index("```", start)
            result = result[start:end].strip()
        return json.loads(result)
    except (json.JSONDecodeError, ValueError):
        return []
