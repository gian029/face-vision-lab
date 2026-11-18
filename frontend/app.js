const video = document.querySelector('#video');
const overlay = document.querySelector('#overlay');
const context = overlay.getContext('2d');
const startButton = document.querySelector('#startButton');
const stopButton = document.querySelector('#stopButton');
const landmarksToggle = document.querySelector('#landmarksToggle');
const stageMessage = document.querySelector('#stageMessage');
const statusText = document.querySelector('#statusText');
const frameCanvas = document.createElement('canvas');
const frameContext = frameCanvas.getContext('2d');
let stream;
let running = false;
let requestInFlight = false;
let lastRequestAt = 0;
let lastResponseAt = 0;
let animationFrame;
let connections = null;
function setStatus(text, ready = false) { statusText.textContent = text; document.querySelector('.connection').classList.toggle('ready', ready); }
function addLog(text) { const log = document.querySelector('#activityLog'); const item = document.createElement('li'); item.innerHTML = `<i></i><span>${text}</span>`; log.prepend(item); while (log.children.length > 3) log.lastElementChild.remove(); document.querySelector('#logTime').textContent = new Date().toLocaleTimeString(); }
function resizeOverlay() { if (!video.videoWidth || !video.videoHeight) return; overlay.width = video.videoWidth; overlay.height = video.videoHeight; frameCanvas.width = video.videoWidth; frameCanvas.height = video.videoHeight; }
function drawConnections(landmarks, connectionList, color, lineWidth) { if (!connectionList) return; context.strokeStyle = color; context.lineWidth = lineWidth; context.beginPath(); connectionList.forEach(([start, end]) => { const first = landmarks[start]; const second = landmarks[end]; if (!first || !second) return; context.moveTo(first.x * overlay.width, first.y * overlay.height); context.lineTo(second.x * overlay.width, second.y * overlay.height); }); context.stroke(); }
function drawResult(result) { context.clearRect(0, 0, overlay.width, overlay.height); result.faces.forEach((face) => { if (landmarksToggle.checked) { drawConnections(face.landmarks, connections?.tesselation, 'rgba(199, 232, 107, .28)', 1); drawConnections(face.landmarks, connections?.contours, '#c7e86b', 2); drawConnections(face.landmarks, connections?.eyes, '#ff9f43', 2); drawConnections(face.landmarks, connections?.iris, '#ff6b35', 2); drawConnections(face.landmarks, connections?.lips, '#ff6b35', 2); } context.fillStyle = '#ff6b35'; face.landmarks.forEach((point) => { context.beginPath(); context.arc(point.x * overlay.width, point.y * overlay.height, 1.5, 0, Math.PI * 2); context.fill(); }); }); document.querySelector('#faceCount').textContent = result.face_count; document.querySelector('#latency').textContent = `${result.processing_ms} ms`; document.querySelector('#resolution').textContent = `${result.width}x${result.height}`; if (lastResponseAt) { const fps = 1000 / (performance.now() - lastResponseAt); const measuredFps = Math.min(60, fps).toFixed(1); document.querySelector('#fpsBadge').textContent = `${measuredFps} FPS`; document.querySelector('#fpsValue').textContent = measuredFps; } lastResponseAt = performance.now(); }
async function analyzeFrame() { if (!running || requestInFlight || video.readyState < 2) return; requestInFlight = true; frameContext.drawImage(video, 0, 0, frameCanvas.width, frameCanvas.height); try { const blob = await new Promise((resolve) => frameCanvas.toBlob(resolve, 'image/jpeg', 0.72)); if (!blob || !running) return; const form = new FormData(); form.append('file', blob, 'frame.jpg'); const response = await fetch('/api/detect', { method: 'POST', body: form }); if (!response.ok) throw new Error(`API ${response.status}`); drawResult(await response.json()); setStatus('Análisis activo', true); } catch (error) { setStatus('Error de procesamiento'); addLog(`No responde /api/detect (${error.message})`); } finally { requestInFlight = false; } }
function loop(timestamp) { if (!running) return; if (timestamp - lastRequestAt >= 100) { lastRequestAt = timestamp; analyzeFrame(); } animationFrame = requestAnimationFrame(loop); }
async function loadMesh() { const response = await fetch('/api/mesh'); if (!response.ok) throw new Error('No se pudo cargar la malla'); connections = await response.json(); }
startButton.addEventListener('click', async () => { try { await loadMesh(); stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 960 }, height: { ideal: 540 }, facingMode: 'user' }, audio: false }); video.srcObject = stream; await video.play(); resizeOverlay(); running = true; stageMessage.style.display = 'none'; startButton.disabled = true; stopButton.disabled = false; setStatus('Análisis activo', true); addLog('Cámara y Face Landmarker iniciados'); animationFrame = requestAnimationFrame(loop); } catch (error) { setStatus('No se pudo iniciar'); addLog(`Error: ${error.message}`); } });
stopButton.addEventListener('click', () => { running = false; cancelAnimationFrame(animationFrame); if (stream) stream.getTracks().forEach((track) => track.stop()); video.srcObject = null; context.clearRect(0, 0, overlay.width, overlay.height); stageMessage.style.display = 'flex'; startButton.disabled = false; stopButton.disabled = true; setStatus('Cámara detenida'); addLog('Análisis detenido por el usuario'); });
video.addEventListener('loadedmetadata', resizeOverlay);
window.addEventListener('resize', resizeOverlay);
