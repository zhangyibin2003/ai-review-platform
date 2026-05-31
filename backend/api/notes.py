from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from models.db import get_db, KnowledgePoint, Note, NoteSection, Case
from services.note_service import generate_lecture_notes
from services.case_service import generate_case_for_kp

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


@router.get("/search")
def search_knowledge(q: str, db: Session = Depends(get_db)):
    """Simple keyword search on knowledge points"""
    kps = db.query(KnowledgePoint).filter(
        (KnowledgePoint.title.contains(q)) |
        (KnowledgePoint.clean_content.contains(q))
    ).limit(20).all()
    return [
        {
            "id": kp.id,
            "title": kp.title,
            "content_preview": (kp.clean_content or "")[:200],
            "star_rating": kp.star_rating,
            "course_id": kp.course_id,
        }
        for kp in kps
    ]


@router.post("/{kp_id}/generate-case")
async def generate_case(kp_id: int, db: Session = Depends(get_db)):
    kp = db.query(KnowledgePoint).filter(KnowledgePoint.id == kp_id).first()
    if not kp:
        raise HTTPException(status_code=404, detail="Knowledge point not found")

    case_data = await generate_case_for_kp(kp.title, kp.clean_content or kp.raw_content or "")

    case = Case(
        kp_id=kp_id,
        plain_explanation=case_data.get("plain_explanation", ""),
        real_life_example=case_data.get("real_life_example", ""),
        engineering_example=case_data.get("engineering_example", ""),
        usage_scenario=case_data.get("usage_scenario", ""),
        exam_tips=case_data.get("exam_tips", ""),
    )
    db.add(case)
    db.commit()
    db.refresh(case)

    return {
        "id": case.id,
        "kp_title": kp.title,
        "plain_explanation": case.plain_explanation,
        "real_life_example": case.real_life_example,
        "engineering_example": case.engineering_example,
        "usage_scenario": case.usage_scenario,
        "exam_tips": case.exam_tips,
    }


@router.get("/{kp_id}/cases")
def get_cases(kp_id: int, db: Session = Depends(get_db)):
    cases = db.query(Case).filter(Case.kp_id == kp_id).all()
    return [
        {
            "id": c.id,
            "plain_explanation": c.plain_explanation,
            "real_life_example": c.real_life_example,
            "engineering_example": c.engineering_example,
            "usage_scenario": c.usage_scenario,
            "exam_tips": c.exam_tips,
            "created_at": str(c.created_at),
        }
        for c in cases
    ]
