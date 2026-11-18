from pathlib import Path

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .face_landmarker import FaceLandmarkerService, mesh_connections

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "frontend"

app = FastAPI(title="Face Vision Lab", version="2.0.0")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
landmarker_service = FaceLandmarkerService()


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "face-landmarker"}


@app.get("/api/mesh")
def mesh() -> dict[str, list[list[int]]]:
    return mesh_connections()


@app.post("/api/detect")
async def detect(file: UploadFile = File(...)) -> dict:
    if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=415, detail="El frame debe ser una imagen JPEG, PNG o WebP")
    payload = await file.read()
    if len(payload) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="El frame supera el límite de 8 MB")
    image = cv2.imdecode(np.frombuffer(payload, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="No se pudo leer el frame")
    height, width = image.shape[:2]
    rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    try:
        result, processing_ms = landmarker_service.process(rgb_image)
    except Exception as error:
        raise HTTPException(status_code=503, detail=f"Face Landmarker no disponible: {error}") from error
    faces = []
    for face_landmarks in result.face_landmarks:
        landmarks = [{"x": round(float(point.x), 6), "y": round(float(point.y), 6), "z": round(float(point.z), 6)} for point in face_landmarks]
        x_values = [point["x"] for point in landmarks]
        y_values = [point["y"] for point in landmarks]
        faces.append({"box": {"x": round(min(x_values), 6), "y": round(min(y_values), 6), "width": round(max(x_values) - min(x_values), 6), "height": round(max(y_values) - min(y_values), 6)}, "landmarks": landmarks})
    return {"width": width, "height": height, "faces": faces, "face_count": len(faces), "processing_ms": processing_ms}
