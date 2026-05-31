from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from models.db import get_db, Question

router = APIRouter(prefix="/api/courses", tags=["questions"])


@router.get("/{course_id}/questions")
def list_questions(
    course_id: int,
    type: Optional[str] = None,
    diff: Optional[int] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Question).filter(Question.course_id == course_id)
    if type:
        query = query.filter(Question.question_type == type)
    if diff:
        query = query.filter(Question.difficulty == diff)

    questions = query.all()
    return [
        {
            "id": q.id,
            "question_type": q.question_type,
            "stem": q.stem,
            "options": q.options,
            "answer": q.answer,
            "score_points": q.score_points,
            "difficulty": q.difficulty,
        }
        for q in questions
    ]


@router.get("/questions/search")
def search_questions(q: str, course_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Question).filter(Question.stem.contains(q))
    if course_id:
        query = query.filter(Question.course_id == course_id)
    questions = query.limit(20).all()
    return [
        {
            "id": qq.id,
            "course_id": qq.course_id,
            "question_type": qq.question_type,
            "stem": qq.stem,
            "options": qq.options,
            "answer": qq.answer,
            "difficulty": qq.difficulty,
        }
        for qq in questions
    ]
