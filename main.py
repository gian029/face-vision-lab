from pathlib import Path
import time

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "frontend"

app = FastAPI(title="Face Vision Lab", version="1.0.0")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

face_detector = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "face-detection"}


@app.post("/api/detect")
async def detect(file: UploadFile = File(...)) -> dict:
    if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=415, detail="El frame debe ser una imagen JPEG, PNG o WebP")

    payload = await file.read()
    image = cv2.imdecode(np.frombuffer(payload, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="No se pudo leer el frame")

    start = time.perf_counter()
    height, width = image.shape[:2]
    gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    detections = face_detector.detectMultiScale(
        gray_image, scaleFactor=1.05, minNeighbors=3, minSize=(45, 45)
    )

    faces = []
    for x, y, box_width, box_height in detections:
        confidence = 0.9
        landmarks = [
            {"x": x + round(box_width * 0.32), "y": y + round(box_height * 0.38)},
            {"x": x + round(box_width * 0.68), "y": y + round(box_height * 0.38)},
            {"x": x + round(box_width * 0.50), "y": y + round(box_height * 0.55)},
            {"x": x + round(box_width * 0.38), "y": y + round(box_height * 0.72)},
            {"x": x + round(box_width * 0.62), "y": y + round(box_height * 0.72)},
        ]
        faces.append({
            "box": {"x": x, "y": y, "width": box_width, "height": box_height},
            "confidence": confidence,
            "landmarks": landmarks,
        })

    elapsed_ms = round((time.perf_counter() - start) * 1000, 1)
    return {
        "width": width,
        "height": height,
        "faces": faces,
        "face_count": len(faces),
        "processing_ms": elapsed_ms,
    }
