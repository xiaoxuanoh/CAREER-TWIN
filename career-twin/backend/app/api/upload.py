from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.cv_parser import extract_text_from_bytes, UnsupportedFileTypeError
from app.services.cv_structurer import structure_cv
from app.models.profile import UploadResponse

router = APIRouter()

# 限制只允许上传 .pdf 和 .docx
ALLOWED_EXTENSIONS = {".pdf", ".docx"}
MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB
MIN_TEXT_LENGTH = 100  # chars — below this we warn about parse quality


@router.post("/upload-cv", response_model=UploadResponse)
async def upload_cv(file: UploadFile = File(...)):
    filename = file.filename or ""
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    data = await file.read()

    if len(data) > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=422,
            detail="File too large. Maximum allowed size is 10 MB.",
        )

    try:
        raw_text = extract_text_from_bytes(data, filename)
    except UnsupportedFileTypeError as e:
        raise HTTPException(status_code=422, detail=str(e))

    parse_warning: str | None = None
    if len(raw_text.strip()) < MIN_TEXT_LENGTH:
        parse_warning = (
            "We had trouble extracting text from your CV. "
            "The content below may be incomplete — please review and edit carefully."
        )

    try:
        structured = await structure_cv(raw_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CV structuring failed: {str(e)}")

    return UploadResponse(raw_text=raw_text, structured=structured, parse_warning=parse_warning)