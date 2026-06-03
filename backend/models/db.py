import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean,
    DateTime, ForeignKey, JSON, create_engine, Enum as SAEnum
)
from sqlalchemy.orm import DeclarativeBase, relationship, sessionmaker
import enum

from config import DB_PATH

engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class UserRole(str, enum.Enum):
    teacher = "teacher"
    student = "student"


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(64), unique=True, nullable=False)
    email = Column(String(128), unique=True, nullable=False)
    password_hash = Column(String(256), nullable=False)
    role = Column(String(16), default="student")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    courses = relationship("Course", back_populates="teacher")


class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(256), nullable=False)
    teacher_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    teacher = relationship("User", back_populates="courses")
    files = relationship("CourseFile", back_populates="course")
    knowledge_points = relationship("KnowledgePoint", back_populates="course")
    notes = relationship("Note", back_populates="course")
    questions = relationship("Question", back_populates="course")
    example_problems = relationship("ExampleProblem", back_populates="course")


class CourseFile(Base):
    __tablename__ = "course_files"
    id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    filename = Column(String(256), nullable=False)
    file_path = Column(String(512), nullable=False)
    page_count = Column(Integer, default=0)
    upload_date = Column(DateTime, default=datetime.datetime.utcnow)

    course = relationship("Course", back_populates="files")


class KnowledgePoint(Base):
    __tablename__ = "knowledge_points"
    id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    lecture_id = Column(String(128))
    title = Column(String(256), nullable=False)
    raw_content = Column(Text)
    clean_content = Column(Text)
    star_rating = Column(Integer, default=3)
    is_error_prone = Column(Boolean, default=False)
    difficulty_level = Column(Integer, default=3)
    parent_id = Column(Integer, ForeignKey("knowledge_points.id"), nullable=True)
    order_index = Column(Integer, default=0)

    course = relationship("Course", back_populates="knowledge_points")
    cases = relationship("Case", back_populates="knowledge_point")
    questions = relationship("Question", back_populates="knowledge_point")


class Note(Base):
    __tablename__ = "notes"
    id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    lecture_id = Column(String(128))
    markdown_content = Column(Text)
    generated_at = Column(DateTime, default=datetime.datetime.utcnow)

    course = relationship("Course", back_populates="notes")
    sections = relationship("NoteSection", back_populates="note")


class NoteSection(Base):
    __tablename__ = "note_sections"
    id = Column(Integer, primary_key=True, autoincrement=True)
    note_id = Column(Integer, ForeignKey("notes.id"))
    kp_id = Column(Integer, ForeignKey("knowledge_points.id"), nullable=True)
    section_type = Column(String(32))
    content = Column(Text)

    note = relationship("Note", back_populates="sections")


class Case(Base):
    __tablename__ = "cases"
    id = Column(Integer, primary_key=True, autoincrement=True)
    kp_id = Column(Integer, ForeignKey("knowledge_points.id"))
    plain_explanation = Column(Text)
    real_life_example = Column(Text)
    engineering_example = Column(Text)
    usage_scenario = Column(Text)
    exam_tips = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    knowledge_point = relationship("KnowledgePoint", back_populates="cases")


class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    kp_id = Column(Integer, ForeignKey("knowledge_points.id"), nullable=True)
    question_type = Column(String(32), nullable=False)
    stem = Column(Text, nullable=False)
    options = Column(JSON)
    answer = Column(Text, nullable=False)
    score_points = Column(Text)
    difficulty = Column(Integer, default=3)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    course = relationship("Course", back_populates="questions")
    knowledge_point = relationship("KnowledgePoint", back_populates="questions")


class ExampleProblem(Base):
    __tablename__ = "example_problems"
    id = Column(Integer, primary_key=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    lecture_id = Column(String(128), nullable=True)  # NULL for course-wide
    stem = Column(Text, nullable=False)
    solution = Column(Text, nullable=False)
    problem_type = Column(String(32), default="example")
    difficulty = Column(Integer, default=3)
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    course = relationship("Course", back_populates="example_problems")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    question_id = Column(Integer, ForeignKey("questions.id"))
    user_answer = Column(Text)
    is_correct = Column(Boolean, default=False)
    attempted_at = Column(DateTime, default=datetime.datetime.utcnow)


class ErrorBook(Base):
    __tablename__ = "error_book"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    question_id = Column(Integer, ForeignKey("questions.id"))
    wrong_count = Column(Integer, default=1)
    last_wrong_at = Column(DateTime, default=datetime.datetime.utcnow)
