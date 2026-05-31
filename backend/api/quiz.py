from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import datetime

from models.db import get_db, Question, QuizAttempt, ErrorBook, KnowledgePoint
from services.question_service import generate_weakness_questions

router = APIRouter(prefix="/api/quiz", tags=["quiz"])


class QuizSubmit(BaseModel):
    user_id: int
    question_id: int
    user_answer: str


@router.post("/submit")
def submit_answer(req: QuizSubmit, db: Session = Depends(get_db)):
    question = db.query(Question).filter(Question.id == req.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    # Simple correctness check
    is_correct = req.user_answer.strip().lower() == question.answer.strip().lower()

    attempt = QuizAttempt(
        user_id=req.user_id,
        question_id=req.question_id,
        user_answer=req.user_answer,
        is_correct=is_correct,
    )
    db.add(attempt)

    # Update error book
    if not is_correct:
        eb = db.query(ErrorBook).filter(
            ErrorBook.user_id == req.user_id,
            ErrorBook.question_id == req.question_id,
        ).first()
        if eb:
            eb.wrong_count += 1
            eb.last_wrong_at = datetime.datetime.utcnow()
        else:
            eb = ErrorBook(
                user_id=req.user_id,
                question_id=req.question_id,
                wrong_count=1,
            )
            db.add(eb)

    db.commit()

    return {
        "is_correct": is_correct,
        "correct_answer": question.answer,
        "explanation": question.score_points or "",
    }


@router.get("/error-book")
def get_error_book(user_id: int = 1, db: Session = Depends(get_db)):
    errors = db.query(ErrorBook).filter(ErrorBook.user_id == user_id).order_by(
        ErrorBook.wrong_count.desc()
    ).all()

    result = []
    for e in errors:
        question = db.query(Question).filter(Question.id == e.question_id).first()
        if question:
            result.append({
                "error_book_id": e.id,
                "question_id": question.id,
                "question_type": question.question_type,
                "stem": question.stem,
                "options": question.options,
                "answer": question.answer,
                "wrong_count": e.wrong_count,
                "last_wrong_at": str(e.last_wrong_at),
            })

    return result


@router.post("/generate-weakness")
async def generate_weakness_questions_endpoint(user_id: int = 1, db: Session = Depends(get_db)):
    errors = db.query(ErrorBook).filter(ErrorBook.user_id == user_id).all()
    if not errors:
        raise HTTPException(status_code=400, detail="No error records found")

    error_kps = []
    wrong_data = []
    for e in errors:
        question = db.query(Question).filter(Question.id == e.question_id).first()
        if question and question.kp_id:
            kp = db.query(KnowledgePoint).filter(KnowledgePoint.id == question.kp_id).first()
            if kp:
                error_kps.append({"title": kp.title, "content": kp.clean_content or ""})
        if question:
            wrong_data.append({
                "stem": question.stem,
                "answer": question.answer,
                "wrong_count": e.wrong_count,
            })

    questions = await generate_weakness_questions(error_kps[:5], wrong_data[:5])
    return {"weakness_questions": questions}


@router.get("/stats")
def get_quiz_stats(user_id: int = 1, db: Session = Depends(get_db)):
    total = db.query(QuizAttempt).filter(QuizAttempt.user_id == user_id).count()
    correct = db.query(QuizAttempt).filter(
        QuizAttempt.user_id == user_id,
        QuizAttempt.is_correct == True,
    ).count()
    error_count = db.query(ErrorBook).filter(ErrorBook.user_id == user_id).count()

    return {
        "total_attempts": total,
        "correct_count": correct,
        "accuracy": round(correct / total * 100, 1) if total > 0 else 0,
        "error_book_count": error_count,
    }
