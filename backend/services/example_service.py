import json
from services.ai_service import generate_with_system_prompt
from services.pdf_service import extract_text_from_pdf
from prompts.example_prompts import EXAMPLE_EXTRACTION_SYSTEM, COURSE_WIDE_EXAMPLE_SYSTEM


async def extract_examples_from_pdf(file_path: str) -> list[dict]:
    """Extract example problems from a single PDF file with detailed solutions"""
    raw_text = extract_text_from_pdf(file_path)

    if len(raw_text) > 12000:
        return await _extract_examples_chunked(raw_text)
    else:
        user_prompt = f"请从以下PPT内容中提取所有例题：\n\n{raw_text}"
        result = await generate_with_system_prompt(EXAMPLE_EXTRACTION_SYSTEM, user_prompt, temperature=0.2)
        return _parse_example_json(result)


async def _extract_examples_chunked(raw_text: str) -> list[dict]:
    """Process large PDF by splitting into chunks for example extraction"""
    pages = raw_text.split("\n\n--- 第")
    chunk_size = 15
    all_examples = []

    for i in range(0, len(pages), chunk_size):
        chunk = "\n\n".join(pages[i:i + chunk_size])
        if not chunk.strip():
            continue

        user_prompt = f"请从以下PPT内容中提取所有例题（第{i // chunk_size + 1}部分）：\n\n{chunk}"
        result = await generate_with_system_prompt(EXAMPLE_EXTRACTION_SYSTEM, user_prompt, temperature=0.2)
        examples = _parse_example_json(result)
        for ex in examples:
            ex["order_index"] = len(all_examples)
            all_examples.append(ex)

    return all_examples


async def extract_examples_course_wide(all_texts: list[tuple[str, str]]) -> list[dict]:
    """Extract representative examples from all PPTs in a course.

    Args:
        all_texts: List of (lecture_name, pdf_text) tuples
    """
    # Build a combined prompt with lecture markers
    combined = ""
    for lecture_name, text in all_texts:
        # Take first 3000 chars from each lecture to keep within context
        combined += f"\n\n=== {lecture_name} ===\n{text[:3000]}"

    user_prompt = f"以下是整个课程所有PPT的内容摘要，请从中挑选最具代表性的例题（每章/每讲选1-3道最典型的）：\n\n{combined[:15000]}"
    result = await generate_with_system_prompt(COURSE_WIDE_EXAMPLE_SYSTEM, user_prompt, temperature=0.2)
    return _parse_example_json(result)


def _parse_example_json(result: str) -> list[dict]:
    """Parse JSON from AI response"""
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
