const video = document.querySelector('#video');
const overlay = document.querySelector('#overlay');
const context = overlay.getContext('2d');
const startButton = document.querySelector('#startButton');
const stopButton = document.querySelector('#stopButton');
const landmarksToggle = document.querySelector('#landmarksToggle');
const stageMessage = document.querySelector('#stageMessage');
const statusText = document.querySelector('#statusText');
const statusDot = document.querySelector('#statusDot');
let stream;
let running = false;
let lastSent = 0;
let frameCanvas = document.createElement('canvas');

function setStatus(text, ready = false) { statusText.textContent = text; document.querySelector('.connection').classList.toggle('ready', ready); }
function addLog(text) { const log = document.querySelector('#activityLog'); const item = document.createElement('li'); item.innerHTML = `<i></i><span>${text}</span>`; log.prepend(item); while (log.children.length > 3) log.lastElementChild.remove(); document.querySelector('#logTime').textContent = new Date().toLocaleTimeString(); }
function drawResult(result) {
  overlay.width = video.videoWidth || overlay.width;
  overlay.height = video.videoHeight || overlay.height;
  const scaleX = overlay.width / result.width; const scaleY = overlay.height / result.height;
  context.clearRect(0, 0, overlay.width, overlay.height);
  result.faces.forEach((face) => {
    const box = face.box; const x = box.x * scaleX; const y = box.y * scaleY; const w = box.width * scaleX; const h = box.height * scaleY;
    context.strokeStyle = '#c7e86b'; context.lineWidth = 2; context.strokeRect(x, y, w, h);
    context.fillStyle = '#c7e86b'; context.font = '12px DM Mono, monospace'; context.fillText(`${Math.round(face.confidence * 100)}%`, x + 7, y - 7);
    if (landmarksToggle.checked) { context.fillStyle = '#ff6b35'; face.landmarks.forEach((point) => { context.beginPath(); context.arc(point.x * scaleX, point.y * scaleY, 4, 0, Math.PI * 2); context.fill(); }); }
  });
  document.querySelector('#faceCount').textContent = result.face_count;
  document.querySelector('#confidence').textContent = result.faces.length ? `${Math.round(result.faces.reduce((sum, face) => sum + face.confidence, 0) / result.faces.length * 100)}%` : '--';
  document.querySelector('#latency').textContent = `${result.processing_ms} ms`; document.querySelector('#resolution').textContent = `${result.width}x${result.height}`;
  document.querySelector('#fpsBadge').textContent = `${Math.round(1000 / Math.max(result.processing_ms, 16))} FPS`;
}
async function analyzeFrame() {
  if (!running || video.readyState < 2) return;
  frameCanvas.width = video.videoWidth; frameCanvas.height = video.videoHeight; frameCanvas.getContext('2d').drawImage(video, 0, 0);
  frameCanvas.toBlob(async (blob) => { if (!blob || !running) return; const form = new FormData(); form.append('file', blob, 'frame.jpg'); try { const response = await fetch('/api/detect', { method: 'POST', body: form }); if (!response.ok) throw new Error(`API ${response.status}`); drawResult(await response.json()); } catch (error) { setStatus('Backend no disponible'); addLog(`No responde /api/detect (${error.message})`); } }, 'image/jpeg', .72);
}
function loop(timestamp) { if (!running) return; if (timestamp - lastSent > 180) { lastSent = timestamp; analyzeFrame(); } requestAnimationFrame(loop); }
startButton.addEventListener('click', async () => { try { stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 960 }, height: { ideal: 540 } }, audio: false }); video.srcObject = stream; running = true; stageMessage.style.display = 'none'; startButton.disabled = true; stopButton.disabled = false; setStatus('Análisis activo', true); addLog('Cámara iniciada correctamente'); requestAnimationFrame(loop); } catch { setStatus('Permiso de cámara requerido'); addLog('No se pudo acceder a la cámara'); } });
stopButton.addEventListener('click', () => { running = false; if (stream) stream.getTracks().forEach((track) => track.stop()); video.srcObject = null; context.clearRect(0, 0, overlay.width, overlay.height); stageMessage.style.display = 'flex'; startButton.disabled = false; stopButton.disabled = true; setStatus('Cámara detenida'); addLog('Análisis detenido por el usuario'); });
video.addEventListener('loadedmetadata', () => { overlay.width = video.videoWidth; overlay.height = video.videoHeight; });
