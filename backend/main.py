import hashlib
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import HOST, PORT
from models.db import engine, Base, SessionLocal, User
from api import auth, courses, notes, questions, quiz


def seed_default_user():
    """Create default demo account if not exists"""
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == "demo").first()
        if not existing:
            demo = User(
                username="demo",
                email="demo@example.com",
                password_hash=hashlib.sha256("demo123".encode()).hexdigest(),
                role="teacher",
            )
            db.add(demo)
            db.commit()
            print("[Seed] Created default user: demo / demo123")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables
    Base.metadata.create_all(bind=engine)
    seed_default_user()
    yield
    # Shutdown
    engine.dispose()


app = FastAPI(
    title="AI 课程智能复习平台",
    description="为高校课程构建的 AI 驱动智能复习平台",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(courses.router)
app.include_router(notes.router)
app.include_router(questions.router)
app.include_router(quiz.router)


@app.get("/")
def root():
    return {"message": "AI 课程智能复习平台 API", "version": "1.0.0"}


@app.get("/api/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
