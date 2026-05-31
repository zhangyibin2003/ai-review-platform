import os
import fitz  # PyMuPDF
from pathlib import Path
from typing import Optional


def extract_text_from_pdf(file_path: str, start_page: int = 0, end_page: Optional[int] = None) -> str:
    """Extract text from PDF using PyMuPDF"""
    doc = fitz.open(file_path)
    texts = []
    total_pages = doc.page_count
    end_page = min(end_page or total_pages, total_pages)

    for i in range(start_page, end_page):
        page = doc[i]
        text = page.get_text("text")
        if text.strip():
            texts.append(f"--- 第 {i + 1} 页 ---\n{text.strip()}")

    doc.close()
    return "\n\n".join(texts)


def extract_by_pages(file_path: str) -> list[dict]:
    """Extract text page by page with metadata"""
    doc = fitz.open(file_path)
    pages = []
    for i in range(doc.page_count):
        page = doc[i]
        text = page.get_text("text").strip()
        pages.append({
            "page_num": i + 1,
            "text": text,
            "char_count": len(text),
            "has_images": len(page.get_images()) > 0,
        })
    doc.close()
    return pages


def get_page_count(file_path: str) -> int:
    """Get total page count of PDF"""
    doc = fitz.open(file_path)
    count = doc.page_count
    doc.close()
    return count


def save_upload(file_content: bytes, filename: str, upload_dir: str) -> str:
    """Save uploaded file and return the file path"""
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, filename)
    with open(file_path, "wb") as f:
        f.write(file_content)
    return file_path
