import json
from services.ai_service import generate_with_system_prompt
from services.pdf_service import extract_text_from_pdf
from prompts.note_prompts import NOTE_GENERATION_SYSTEM, NOTE_CONDENSE_SYSTEM


async def generate_notes_from_pdf(file_path: str, course_name: str) -> str:
    """Generate structured Markdown notes from a PDF file"""
    # Extract text from PDF
    raw_text = extract_text_from_pdf(file_path)

    # If text is too long, process in chunks
    if len(raw_text) > 8000:
        return await _generate_notes_chunked(raw_text, course_name)
    else:
        user_prompt = f"课程名称：{course_name}\n\nPPT内容如下：\n\n{raw_text}"
        return await generate_with_system_prompt(NOTE_GENERATION_SYSTEM, user_prompt, temperature=0.3)


async def _generate_notes_chunked(raw_text: str, course_name: str) -> str:
    """Process large PDF by splitting into chunks"""
    pages = raw_text.split("\n\n--- 第")
    chunk_size = 10
    all_notes = []

    for i in range(0, len(pages), chunk_size):
        chunk = "\n\n".join(pages[i:i + chunk_size])
        if not chunk.strip():
            continue

        lecture_name = f"{course_name} (第{i // chunk_size + 1}部分)"
        user_prompt = f"课程名称：{lecture_name}\n\nPPT内容如下：\n\n{chunk}"
        note = await generate_with_system_prompt(NOTE_GENERATION_SYSTEM, user_prompt, temperature=0.3)
        all_notes.append(note)

    return "\n\n---\n\n".join(all_notes)


async def condense_knowledge_points(pdf_text: str) -> list[dict]:
    """Extract knowledge points from PDF text as structured JSON"""
    user_prompt = f"请从以下PPT内容中提取知识点：\n\n{pdf_text[:12000]}"
    result = await generate_with_system_prompt(NOTE_CONDENSE_SYSTEM, user_prompt, temperature=0.2)
    # Extract JSON from response
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


async def generate_lecture_notes(pdf_text: str, lecture_name: str) -> str:
    """Generate notes for a single lecture"""
    user_prompt = f"讲座名称：{lecture_name}\n\nPPT内容如下：\n\n{pdf_text[:8000]}"
    return await generate_with_system_prompt(NOTE_GENERATION_SYSTEM, user_prompt, temperature=0.3)
