from __future__ import annotations

import threading
import time
import urllib.request
from pathlib import Path
from typing import Any

import mediapipe as mp
from mediapipe.tasks.python import BaseOptions
from mediapipe.tasks.python.vision import FaceLandmarker, FaceLandmarkerOptions, RunningMode
from mediapipe.tasks.python.vision.face_landmarker import FaceLandmarksConnections

MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task"
MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "face_landmarker.task"


def ensure_model() -> Path:
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not MODEL_PATH.exists() or MODEL_PATH.stat().st_size < 1_000_000:
        temporary_path = MODEL_PATH.with_suffix(".download")
        urllib.request.urlretrieve(MODEL_URL, temporary_path)
        temporary_path.replace(MODEL_PATH)
    return MODEL_PATH


def _connections(connection_set: list[Any]) -> list[list[int]]:
    return [[int(connection.start), int(connection.end)] for connection in connection_set]


def mesh_connections() -> dict[str, list[list[int]]]:
    return {
        "tesselation": _connections(FaceLandmarksConnections.FACE_LANDMARKS_TESSELATION),
        "contours": _connections(FaceLandmarksConnections.FACE_LANDMARKS_CONTOURS),
        "eyes": _connections(FaceLandmarksConnections.FACE_LANDMARKS_LEFT_EYE + FaceLandmarksConnections.FACE_LANDMARKS_RIGHT_EYE),
        "iris": _connections(FaceLandmarksConnections.FACE_LANDMARKS_LEFT_IRIS + FaceLandmarksConnections.FACE_LANDMARKS_RIGHT_IRIS),
        "lips": _connections(FaceLandmarksConnections.FACE_LANDMARKS_LIPS),
    }


class FaceLandmarkerService:
    def __init__(self) -> None:
        self._landmarker: FaceLandmarker | None = None
        self._lock = threading.Lock()
        self._timestamp = 0

    def start(self) -> None:
        if self._landmarker is not None:
            return
        options = FaceLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=str(ensure_model())),
            running_mode=RunningMode.VIDEO,
            num_faces=2,
            min_face_detection_confidence=0.5,
            min_face_presence_confidence=0.5,
            min_tracking_confidence=0.5,
            output_face_blendshapes=False,
            output_facial_transformation_matrixes=False,
        )
        self._landmarker = FaceLandmarker.create_from_options(options)

    def close(self) -> None:
        if self._landmarker is not None:
            self._landmarker.close()
            self._landmarker = None

    def process(self, image_rgb: Any) -> tuple[Any, float]:
        with self._lock:
            self.start()
            self._timestamp = max(self._timestamp + 1, int(time.monotonic() * 1000))
            image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
            started = time.perf_counter()
            result = self._landmarker.detect_for_video(image, self._timestamp)
            elapsed_ms = (time.perf_counter() - started) * 1000
            return result, round(elapsed_ms, 1)
