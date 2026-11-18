from .face_landmarker import ensure_model

if __name__ == "__main__":
    print(f"MediaPipe model ready: {ensure_model()}")
