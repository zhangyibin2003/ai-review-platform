import os
import uuid
import traceback
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from models.db import get_db, SessionLocal, Course, CourseFile, KnowledgePoint, Note, Question, ExampleProblem
from services.pdf_service import save_upload, get_page_count, extract_text_from_pdf
from services.note_service import generate_notes_from_pdf, condense_knowledge_points
from services.example_service import extract_examples_from_pdf, extract_examples_course_wide
from prompts.note_prompts import NOTE_GENERATION_SYSTEM, NOTE_CONDENSE_SYSTEM, EXAM_REVIEW_SYSTEM

router = APIRouter(prefix="/api/courses", tags=["courses"])


class CourseCreate(BaseModel):
    name: str
    teacher_id: int


def _generate_notes_bg(course_id: int, course_name: str, file_path: str, filename: str, include_examples: bool = False):
    """Background task: generate notes and knowledge points for a single PDF file"""
    db = SessionLocal()
    try:
        print(f"[BG] Starting notes generation for course {course_id}, file {filename}")

        # Dedup: delete existing notes for this course+filename before creating new ones
        existing_notes = db.query(Note).filter(
            Note.course_id == course_id,
            Note.lecture_id == filename,
        ).all()
        for en in existing_notes:
            db.delete(en)
        # Also delete existing knowledge points for this lecture
        existing_kps = db.query(KnowledgePoint).filter(
            KnowledgePoint.course_id == course_id,
            KnowledgePoint.lecture_id == filename,
        ).all()
        for ekp in existing_kps:
            db.delete(ekp)
        db.commit()
        print(f"[BG] Cleaned up {len(existing_notes)} existing notes and {len(existing_kps)} KPs")

        # Step 1: Generate notes
        notes_md = ""  # placeholder, will be replaced by actual generation
        import asyncio
        loop = asyncio.new_event_loop()
        try:
            notes_md = loop.run_until_complete(generate_notes_from_pdf(file_path, course_name))
        except Exception as e:
            print(f"[BG] Error generating notes: {e}")
            traceback.print_exc()
            notes_md = f"# 笔记生成失败\n\n错误: {str(e)}"
        finally:
            loop.close()

        note = Note(
            course_id=course_id,
            lecture_id=filename,
            markdown_content=notes_md,
        )
        db.add(note)
        db.commit()
        db.refresh(note)
        print(f"[BG] Note saved: id={note.id}")

        # Step 2: Extract knowledge points from PDF
        try:
            raw_text = extract_text_from_pdf(file_path)
            loop2 = asyncio.new_event_loop()
            try:
                kps = loop2.run_until_complete(condense_knowledge_points(raw_text))
            finally:
                loop2.close()

            print(f"[BG] Got {len(kps)} knowledge points")
            for i, kp in enumerate(kps):
                db_kp = KnowledgePoint(
                    course_id=course_id,
                    lecture_id=filename,
                    title=kp.get("title", f"知识点{i+1}"),
                    raw_content=kp.get("raw_content", ""),
                    clean_content=kp.get("clean_content", ""),
                    star_rating=kp.get("star_rating", 3),
                    is_error_prone=kp.get("is_error_prone", False),
                    difficulty_level=kp.get("difficulty_level", 3),
                    order_index=i,
                )
                db.add(db_kp)
            db.commit()
            print(f"[BG] Knowledge points saved: {len(kps)}")
        except Exception as e:
            print(f"[BG] Error extracting knowledge points: {e}")
            traceback.print_exc()

        # Step 3: Optionally extract example problems
        if include_examples:
            try:
                # Clean up existing examples for this lecture
                existing_examples = db.query(ExampleProblem).filter(
                    ExampleProblem.course_id == course_id,
                    ExampleProblem.lecture_id == filename,
                ).all()
                for ex in existing_examples:
                    db.delete(ex)
                db.commit()

                loop3 = asyncio.new_event_loop()
                try:
                    examples = loop3.run_until_complete(extract_examples_from_pdf(file_path))
                finally:
                    loop3.close()

                print(f"[BG] Got {len(examples)} example problems")
                for i, ex in enumerate(examples):
                    db_ex = ExampleProblem(
                        course_id=course_id,
                        lecture_id=filename,
                        stem=ex.get("stem", ""),
                        solution=ex.get("solution", ""),
                        problem_type=ex.get("problem_type", "example"),
                        difficulty=ex.get("difficulty", 3),
                        order_index=i,
                    )
                    db.add(db_ex)
                db.commit()
                print(f"[BG] Example problems saved: {len(examples)}")
            except Exception as e:
                print(f"[BG] Error extracting examples: {e}")
                traceback.print_exc()

        print(f"[BG] Finished notes generation for course {course_id}")
    except Exception as e:
        print(f"[BG] Fatal error in background notes generation: {e}")
        traceback.print_exc()
    finally:
        db.close()


def _generate_questions_bg(course_id: int):
    """Background task: generate questions for a course"""
    from services.question_service import generate_questions as gen_q
    db = SessionLocal()
    try:
        print(f"[BG] Starting question generation for course {course_id}")

        kps = db.query(KnowledgePoint).filter(KnowledgePoint.course_id == course_id).all()
        if not kps:
            print(f"[BG] No knowledge points found for course {course_id}")
            return

        kp_data = [
            {
                "title": kp.title,
                "content": kp.clean_content or kp.raw_content,
                "star_rating": kp.star_rating,
                "difficulty": kp.difficulty_level,
            }
            for kp in kps
        ]

        import asyncio
        loop = asyncio.new_event_loop()
        try:
            questions = loop.run_until_complete(gen_q(kp_data))
        finally:
            loop.close()

        print(f"[BG] Generated {len(questions)} questions")

        from models.db import Question
        for q in questions:
            options_json = q.get("options") if q.get("options") else None
            question = Question(
                course_id=course_id,
                question_type=q.get("question_type", "single_choice"),
                stem=q.get("stem", ""),
                options=options_json,
                answer=q.get("answer", ""),
                score_points=q.get("score_points", ""),
                difficulty=q.get("difficulty", 3),
            )
            db.add(question)

        db.commit()
        print(f"[BG] Questions saved for course {course_id}")
    except Exception as e:
        print(f"[BG] Error generating questions: {e}")
        traceback.print_exc()
    finally:
        db.close()


def _generate_exam_review_bg(course_id: int, course_name: str, include_examples: bool = False):
    """Background task: generate course-wide exam review from all PPTs"""
    db = SessionLocal()
    try:
        print(f"[BG] Starting course-wide exam review for course {course_id}")

        # Clean up existing exam review notes
        existing_review = db.query(Note).filter(
            Note.course_id == course_id,
            Note.lecture_id == "课程总复习",
        ).all()
        for r in existing_review:
            db.delete(r)
        db.commit()

        # Collect all PDF files
        files = db.query(CourseFile).filter(CourseFile.course_id == course_id).all()
        if not files:
            print(f"[BG] No files found for course {course_id}")
            return

        # Combine text from all PDFs
        all_text_parts = []
        for cf in files:
            try:
                text = extract_text_from_pdf(cf.file_path)
                all_text_parts.append(f"## {cf.filename}\n\n{text[:5000]}")
            except Exception as e:
                print(f"[BG] Error reading {cf.filename}: {e}")

        combined_text = "\n\n---\n\n".join(all_text_parts)

        import asyncio
        from services.ai_service import generate_with_system_prompt

        # Generate exam review
        loop = asyncio.new_event_loop()
        try:
            user_prompt = f"课程名称：{course_name}\n\n以下是该课程所有PPT的内容：\n\n{combined_text[:20000]}"
            review_md = loop.run_until_complete(
                generate_with_system_prompt(EXAM_REVIEW_SYSTEM, user_prompt, temperature=0.3)
            )
        except Exception as e:
            print(f"[BG] Error generating exam review: {e}")
            traceback.print_exc()
            review_md = f"# 考试重点生成失败\n\n错误: {str(e)}"
        finally:
            loop.close()

        # Save as note with special lecture_id
        review_note = Note(
            course_id=course_id,
            lecture_id="课程总复习",
            markdown_content=review_md,
        )
        db.add(review_note)
        db.commit()
        db.refresh(review_note)
        print(f"[BG] Exam review note saved: id={review_note.id}")

        # Optionally extract course-wide examples
        if include_examples:
            try:
                # Clean up existing course-wide examples
                existing_cw = db.query(ExampleProblem).filter(
                    ExampleProblem.course_id == course_id,
                    ExampleProblem.lecture_id == None,
                ).all()
                for ex in existing_cw:
                    db.delete(ex)

                existing_cw2 = db.query(ExampleProblem).filter(
                    ExampleProblem.course_id == course_id,
                    ExampleProblem.lecture_id == "课程总复习",
                ).all()
                for ex in existing_cw2:
                    db.delete(ex)
                db.commit()

                # Build (lecture_name, pdf_text) tuples
                all_texts = []
                for cf in files:
                    try:
                        text = extract_text_from_pdf(cf.file_path)
                        all_texts.append((cf.filename, text))
                    except Exception as e:
                        print(f"[BG] Error reading {cf.filename} for examples: {e}")

                loop2 = asyncio.new_event_loop()
                try:
                    examples = loop2.run_until_complete(extract_examples_course_wide(all_texts))
                finally:
                    loop2.close()

                print(f"[BG] Got {len(examples)} course-wide example problems")
                for i, ex in enumerate(examples):
                    db_ex = ExampleProblem(
                        course_id=course_id,
                        lecture_id=ex.get("lecture_id") or "课程总复习",
                        stem=ex.get("stem", ""),
                        solution=ex.get("solution", ""),
                        problem_type=ex.get("problem_type", "example"),
                        difficulty=ex.get("difficulty", 3),
                        order_index=i,
                    )
                    db.add(db_ex)
                db.commit()
                print(f"[BG] Course-wide example problems saved: {len(examples)}")
            except Exception as e:
                print(f"[BG] Error extracting course-wide examples: {e}")
                traceback.print_exc()

        print(f"[BG] Finished exam review for course {course_id}")
    except Exception as e:
        print(f"[BG] Fatal error in exam review generation: {e}")
        traceback.print_exc()
    finally:
        db.close()


@router.post("")
def create_course(req: CourseCreate, db: Session = Depends(get_db)):
    course = Course(name=req.name, teacher_id=req.teacher_id)
    db.add(course)
    db.commit()
    db.refresh(course)
    return {"id": course.id, "name": course.name, "teacher_id": course.teacher_id, "created_at": str(course.created_at)}


@router.get("")
def list_courses(db: Session = Depends(get_db)):
    courses = db.query(Course).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "teacher_id": c.teacher_id,
            "file_count": len(c.files),
            "kp_count": len(c.knowledge_points),
            "created_at": str(c.created_at),
        }
        for c in courses
    ]


@router.get("/{course_id}")
def get_course(course_id: int, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return {
        "id": course.id,
        "name": course.name,
        "teacher_id": course.teacher_id,
        "files": [{"id": f.id, "filename": f.filename, "page_count": f.page_count} for f in course.files],
        "kp_count": len(course.knowledge_points),
        "note_count": len(course.notes),
        "question_count": len(course.questions),
        "example_count": len(course.example_problems),
        "created_at": str(course.created_at),
    }


@router.post("/{course_id}/upload")
async def upload_pdf(
    course_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    ext = os.path.splitext(file.filename)[1] or ".pdf"
    stored_name = f"{uuid.uuid4().hex}{ext}"
    from config import UPLOAD_DIR
    file_path = save_upload(await file.read(), stored_name, str(UPLOAD_DIR))

    page_count = get_page_count(file_path)

    course_file = CourseFile(
        course_id=course_id,
        filename=file.filename,
        file_path=file_path,
        page_count=page_count,
    )
    db.add(course_file)
    db.commit()
    db.refresh(course_file)

    return {
        "id": course_file.id,
        "filename": course_file.filename,
        "page_count": page_count,
        "message": f"Upload successful, {page_count} pages detected",
    }


@router.delete("/{course_id}/files/{file_id}")
def delete_file(course_id: int, file_id: int, db: Session = Depends(get_db)):
    """Delete a single uploaded PDF file and associated data"""
    course_file = db.query(CourseFile).filter(
        CourseFile.id == file_id,
        CourseFile.course_id == course_id,
    ).first()
    if not course_file:
        raise HTTPException(status_code=404, detail="File not found")

    filename = course_file.filename
    file_path = course_file.file_path

    # Delete associated notes, knowledge points, and examples for this lecture
    db.query(Note).filter(Note.course_id == course_id, Note.lecture_id == filename).delete()
    db.query(KnowledgePoint).filter(KnowledgePoint.course_id == course_id, KnowledgePoint.lecture_id == filename).delete()
    db.query(ExampleProblem).filter(ExampleProblem.course_id == course_id, ExampleProblem.lecture_id == filename).delete()

    # Delete the physical file
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception as e:
        print(f"Warning: could not delete file {file_path}: {e}")

    # Delete the database record
    db.delete(course_file)
    db.commit()

    return {"message": f"File '{filename}' and associated data deleted"}


@router.post("/{course_id}/generate-notes")
async def generate_notes(
    course_id: int,
    background_tasks: BackgroundTasks,
    include_examples: bool = Query(False),
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if not course.files:
        raise HTTPException(status_code=400, detail="No PDF files uploaded for this course")

    # Schedule all files for background processing
    file_count = len(course.files)
    for cf in course.files:
        background_tasks.add_task(_generate_notes_bg, course_id, course.name, cf.file_path, cf.filename, include_examples)

    return {
        "message": f"Notes generation started for {file_count} file(s). This may take 2-5 minutes.",
        "status": "processing",
        "file_count": file_count,
        "include_examples": include_examples,
    }


@router.post("/{course_id}/generate-questions")
async def generate_course_questions(course_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    kps = db.query(KnowledgePoint).filter(KnowledgePoint.course_id == course_id).all()
    if not kps:
        raise HTTPException(status_code=400, detail="No knowledge points found. Generate notes first.")

    background_tasks.add_task(_generate_questions_bg, course_id)

    return {
        "message": "Question generation started. This may take 1-2 minutes.",
        "status": "processing",
        "kp_count": len(kps),
    }


@router.get("/{course_id}/notes")
def get_notes(course_id: int, db: Session = Depends(get_db)):
    notes = db.query(Note).filter(Note.course_id == course_id).order_by(Note.generated_at.desc()).all()
    return [
        {
            "id": n.id,
            "lecture_id": n.lecture_id,
            "markdown_content": n.markdown_content,
            "generated_at": str(n.generated_at),
            "section_count": len(n.sections),
        }
        for n in notes
    ]


@router.get("/{course_id}/notes/{note_id}")
def get_note_detail(course_id: int, note_id: int, db: Session = Depends(get_db)):
    note = db.query(Note).filter(Note.id == note_id, Note.course_id == course_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return {
        "id": note.id,
        "lecture_id": note.lecture_id,
        "markdown_content": note.markdown_content,
        "sections": [
            {"id": s.id, "section_type": s.section_type, "content": s.content}
            for s in note.sections
        ],
        "generated_at": str(note.generated_at),
    }


@router.get("/{course_id}/notes/{note_id}/pdf")
def export_note_pdf(course_id: int, note_id: int, db: Session = Depends(get_db)):
    """Convert note markdown to printable HTML"""
    note = db.query(Note).filter(Note.id == note_id, Note.course_id == course_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    import markdown
    md_content = note.markdown_content or ""

    # Convert markdown to HTML
    html_body = markdown.markdown(
        md_content,
        extensions=['tables', 'fenced_code', 'codehilite', 'nl2br', 'toc']
    )

    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>{note.lecture_id} - 复习笔记</title>
<style>
  @page {{ size: A4; margin: 2cm; }}
  body {{
    font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
    line-height: 1.8;
    color: #1a1a1a;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    font-size: 14px;
  }}
  h1 {{ font-size: 1.8em; border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-top: 24px; }}
  h2 {{ font-size: 1.4em; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-top: 20px; }}
  h3 {{ font-size: 1.2em; margin-top: 16px; }}
  table {{ border-collapse: collapse; width: 100%; margin: 12px 0; }}
  th, td {{ border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; }}
  th {{ background: #f3f4f6; font-weight: 600; }}
  code {{ background: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }}
  pre {{ background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 8px; overflow-x: auto; }}
  pre code {{ background: none; padding: 0; color: inherit; }}
  blockquote {{ border-left: 4px solid #2563eb; margin: 12px 0; padding: 8px 16px; background: #f8fafc; }}
  strong {{ color: #0f172a; }}
  .katex {{ font-size: 1.05em; }}
  @media print {{
    body {{ padding: 0; }}
    h1 {{ page-break-before: avoid; }}
  }}
</style>
</head>
<body>
{html_body}
<script>window.onload = function() {{ window.print(); }};</script>
</body>
</html>"""

    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=html)


@router.delete("/{course_id}/notes")
def delete_all_notes(course_id: int, db: Session = Depends(get_db)):
    """Delete all notes and knowledge points for a course (to regenerate cleanly)"""
    db.query(KnowledgePoint).filter(KnowledgePoint.course_id == course_id).delete()
    db.query(Note).filter(Note.course_id == course_id).delete()
    db.commit()
    return {"message": "All notes and knowledge points deleted"}


@router.get("/{course_id}/knowledge-points")
def list_knowledge_points(course_id: int, db: Session = Depends(get_db)):
    kps = db.query(KnowledgePoint).filter(
        KnowledgePoint.course_id == course_id
    ).order_by(KnowledgePoint.order_index).all()
    return [
        {
            "id": kp.id,
            "title": kp.title,
            "clean_content": kp.clean_content,
            "star_rating": kp.star_rating,
            "is_error_prone": kp.is_error_prone,
            "difficulty_level": kp.difficulty_level,
            "order_index": kp.order_index,
            "case_count": len(kp.cases),
        }
        for kp in kps
    ]


# --- Course-wide exam review ---

@router.post("/{course_id}/generate-exam-review")
async def generate_exam_review(
    course_id: int,
    background_tasks: BackgroundTasks,
    include_examples: bool = Query(False),
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if not course.files:
        raise HTTPException(status_code=400, detail="No PDF files uploaded for this course")

    background_tasks.add_task(_generate_exam_review_bg, course_id, course.name, include_examples)

    return {
        "message": "Course-wide exam review generation started. This may take 3-6 minutes.",
        "status": "processing",
        "include_examples": include_examples,
    }


# --- Example problems ---

@router.get("/{course_id}/examples")
def get_examples(
    course_id: int,
    lecture_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Get example problems with solutions"""
    query = db.query(ExampleProblem).filter(ExampleProblem.course_id == course_id)
    if lecture_id:
        query = query.filter(ExampleProblem.lecture_id == lecture_id)
    examples = query.order_by(ExampleProblem.order_index).all()
    return [
        {
            "id": e.id,
            "lecture_id": e.lecture_id,
            "stem": e.stem,
            "solution": e.solution,
            "problem_type": e.problem_type,
            "difficulty": e.difficulty,
            "order_index": e.order_index,
            "created_at": str(e.created_at),
        }
        for e in examples
    ]


@router.get("/{course_id}/examples/practice")
def get_practice_problems(course_id: int, db: Session = Depends(get_db)):
    """Get example problems WITHOUT solutions (for practice workbook 习题集)"""
    examples = db.query(ExampleProblem).filter(
        ExampleProblem.course_id == course_id
    ).order_by(ExampleProblem.order_index).all()
    return [
        {
            "id": e.id,
            "lecture_id": e.lecture_id,
            "stem": e.stem,
            "problem_type": e.problem_type,
            "difficulty": e.difficulty,
            "order_index": e.order_index,
        }
        for e in examples
    ]


@router.delete("/{course_id}/examples")
def delete_all_examples(course_id: int, db: Session = Depends(get_db)):
    """Delete all example problems for a course"""
    db.query(ExampleProblem).filter(ExampleProblem.course_id == course_id).delete()
    db.commit()
    return {"message": "All example problems deleted"}
