# Face Vision Lab

Mini proyecto académico de detección facial en tiempo real con Python, FastAPI, OpenCV y MediaPipe.

## Requisitos

- Python 3.10 o 3.11 recomendado.
- Navegador moderno con permiso para usar la cámara.

## Instalación en Windows

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Si PowerShell bloquea la activación, ejecuta una vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

## Ejecución

```powershell
python -m uvicorn backend.main:app --reload
```

Abre `http://127.0.0.1:8000` en el navegador, permite la cámara y pulsa **Iniciar cámara**.

## API

- `GET /api/health`: comprueba que el servicio está activo.
- `POST /api/detect`: recibe un frame como campo multipart `file` y devuelve rostros, confianza, puntos faciales y latencia.

El procesamiento se realiza localmente. Los frames no se guardan en disco.
