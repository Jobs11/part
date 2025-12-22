// ==================== 도면/위치 관련 전역 변수 ====================

// 도면 좌표 마킹 관련
let mapSpotImagesCache = [];
let mapSpotMarkers = [];
let mapSpotBaseImageData = null;
let mapSpotSelectedImage = null;
let mapSpotRegisterEnabled = false;
let mapSpotTargetInputElement = null; // 배치 선택 시 값을 넣을 input 요소

// 도면 위치 선택 (Location Picker) 관련
let locationPickerImagesCache = [];
let locationPickerSelectedImage = null;
let locationPickerBaseImageData = null;
let locationPickerMarkers = [];
let locationPickerTargetInput = null;

// 캐비넷 위치 선택 관련
let cabinetPickerTargetInput = null;

// 부품 위치 정보 관련
let currentPartLocationIncomingId = null;
let currentPartLocationPartNumber = null;
let currentPartLocationPartName = null;
let currentPartLocationMode = null; // 'input', 'save', 'save-incoming'

// 배치도 보기 관련
let partLocationViewImagesCache = [];
let partLocationViewSelectedImage = null;
let partLocationViewBaseImageData = null;
let partLocationViewMarkers = [];
let partLocationViewPartNumber = null;

// 현재 보고 있는 배치도의 부품 정보 저장
let currentViewingPartNumber = null;
let currentViewingPartName = null;
let currentViewingIncomingId = null;


// ==================== Cabinet/Map 위치 정규화 함수들 ====================

function normalizeCabinetLocationValue(value) {
    if (!value) return '';
    const trimmed = value.trim().toUpperCase();
    if (/^[A-Z]{1,2}-\d+$/.test(trimmed)) return trimmed;
    const match = /^([A-Z]{1,2})(\d+)$/.exec(trimmed);
    if (match) return `${match[1]}-${match[2]}`;
    return trimmed;
}

function normalizeMapLocationValue(value) {
    if (!value) return '';
    const trimmed = value.trim().toUpperCase();
    // 이미 숫자-알파벳 형식이면 그대로 반환
    if (/^\d+-[A-Z]{1,2}$/.test(trimmed)) return trimmed;
    // 숫자알파벳 형식이면 숫자-알파벳으로 변환
    const match = /^(\d+)([A-Z]{1,2})$/.exec(trimmed);
    if (match) return `${match[1]}-${match[2]}`;
    return trimmed;
}

function attachCabinetNormalizer(inputEl) {
    if (!inputEl) return;

    // input 이벤트: 정규화 처리
    const inputHandler = () => {
        const normalized = normalizeCabinetLocationValue(inputEl.value);
        if (inputEl.value !== normalized) {
            const pos = inputEl.selectionStart;
            inputEl.value = normalized;
            inputEl.selectionStart = inputEl.selectionEnd = normalized.length;
        }

        // 입력이 비어있거나 형식이 맞지 않으면 경고 제거
        const value = inputEl.value.trim();
        if (!value || !value.match(/^([A-Z]{1,2})-(\d{1,2})$/)) {
            inputEl.style.borderColor = '';
            removeWarningMessage(inputEl);
        }
    };

    // blur 이벤트: 정규화만 수행 (중복 허용)
    const blurHandler = async () => {
        const normalized = normalizeCabinetLocationValue(inputEl.value);
        if (inputEl.value !== normalized) {
            inputEl.value = normalized;
        }
    };

    inputEl.addEventListener('input', inputHandler);
    inputEl.addEventListener('blur', blurHandler);
}

function attachMapNormalizer(inputEl) {
    if (!inputEl) return;

    // input 이벤트: 정규화 처리
    const inputHandler = () => {
        const normalized = normalizeMapLocationValue(inputEl.value);
        if (inputEl.value !== normalized) {
            inputEl.value = normalized;
            inputEl.selectionStart = inputEl.selectionEnd = normalized.length;
        }
    };

    // blur 이벤트: 정규화
    const blurHandler = () => {
        const normalized = normalizeMapLocationValue(inputEl.value);
        if (inputEl.value !== normalized) {
            inputEl.value = normalized;
        }
    };

    inputEl.addEventListener('input', inputHandler);
    inputEl.addEventListener('blur', blurHandler);
}

// 캐비넷 위치 중복 체크 (중복 허용으로 비활성화)
async function checkCabinetDuplicate(inputEl) {
    // 중복 허용 - 체크하지 않음
    inputEl.style.borderColor = '';
    removeWarningMessage(inputEl);
    return;
}

// 경고 메시지 표시
function showWarningMessage(inputEl, message) {
    // 입력 필드에 경고 데이터 속성 저장
    inputEl.setAttribute('data-warning', message);

    // 행 번호 계산
    const row = inputEl.closest('tr');
    const rowIndex = Array.from(row.parentNode.children).indexOf(row) + 1;
    inputEl.setAttribute('data-row-index', rowIndex);

    // 테이블 아래 경고 영역 업데이트
    updateCabinetWarningArea();
}

// 경고 메시지 제거
function removeWarningMessage(inputEl) {
    inputEl.removeAttribute('data-warning');
    inputEl.removeAttribute('data-row-index');

    // 테이블 아래 경고 영역 업데이트
    updateCabinetWarningArea();
}

// 테이블 아래 경고 영역 업데이트
function updateCabinetWarningArea() {
    const warningArea = document.getElementById('cabinetWarningArea');
    const warningList = document.getElementById('cabinetWarningList');

    if (!warningArea || !warningList) return;

    // 모든 경고 메시지 수집
    const warningInputs = document.querySelectorAll('.bulk-cabinet-location[data-warning]');

    if (warningInputs.length === 0) {
        warningArea.style.display = 'none';
        warningList.innerHTML = '';
        return;
    }

    // 경고 메시지 목록 생성
    let html = '';
    warningInputs.forEach((input) => {
        const rowIndex = input.getAttribute('data-row-index');
        const message = input.getAttribute('data-warning');
        const location = input.value;
        html += `<div style="margin-bottom: 3px;">• <strong>${rowIndex}번째 행 (${location}):</strong> ${message}</div>`;
    });

    warningList.innerHTML = html;
    warningArea.style.display = 'block';
}


// ==================== 도면 좌표 마킹 (UI 준비) ====================

function openMapSpotModal() {
    document.getElementById('mapSpotModal').style.display = 'block';
    setupMapSpotCanvasClick();
    mapSpotRegisterEnabled = false;
    updateMapSpotRegisterToggleUI();
    loadMapSpotImages();
}

// 일괄 등록 행에서 배치 버튼 클릭 시 호출
function openMapSpotForBulkRow(buttonElement) {
    // 클릭한 버튼이 속한 행의 도면 location input 요소 찾기
    const row = buttonElement.closest('tr');
    const locationInput = row.querySelector('.bulk-map-location');

    // 전역 변수에 저장
    mapSpotTargetInputElement = locationInput;

    // 배치도 모달 열기
    openMapSpotModal();
}

function closeMapSpotModal() {
    const modal = document.getElementById('mapSpotModal');
    modal.style.display = 'none';

    // 제목 복원
    const titleEl = modal.querySelector('h3');
    if (titleEl) {
        titleEl.textContent = '배치도 - 위치 선택';
    }

    // 배치도 선택 드롭다운 및 설명 다시 표시
    const selectContainer = modal.querySelector('[for="mapSpotSelect"]')?.parentElement;
    if (selectContainer) {
        selectContainer.style.display = '';
    }
    const descriptionDiv = modal.querySelector('div[style*="margin-bottom: 12px"]');
    if (descriptionDiv) {
        descriptionDiv.style.display = '';
    }

    mapSpotMarkers = [];
    mapSpotBaseImageData = null;
    mapSpotSelectedImage = null;
    mapSpotTargetInputElement = null;
    updateMapSpotList();
    mapSpotRegisterEnabled = false;
    updateMapSpotRegisterToggleUI();

    const canvas = document.getElementById('mapSpotCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

async function loadMapSpotImages() {
    const statusEl = document.getElementById('mapSpotStatus');
    const selectEl = document.getElementById('mapSpotSelect');
    statusEl.textContent = '목록을 불러오는 중...';

    try {
        const response = await fetch(LIBRARY_API);
        if (!response.ok) throw new Error('자료실 목록 조회 실패');

        const images = await response.json();
        const filtered = (images || []).filter(img => (img.description || '').includes('도면'));
        mapSpotImagesCache = filtered;
        mapSpotMarkers = [];
        updateMapSpotList();

        if (!filtered.length) {
            selectEl.innerHTML = '<option value="">-- 자료가 없습니다 --</option>';
            statusEl.textContent = '설명에 "도면"이 포함된 자료가 없습니다.';
            renderMapSpotPreview(null);
            return;
        }

        selectEl.innerHTML = filtered.map(img => {
            const typeLabel = (img.fileType || 'img').toString().toUpperCase();
            return `<option value="${img.imageId}">${img.title} (${typeLabel})</option>`;
        }).join('');

        // 8층 배치도 찾아서 자동 선택, 없으면 첫 번째 선택
        if (filtered.length > 0) {
            const floor8Image = filtered.find(img => img.title && img.title.includes('8층'));
            const defaultImage = floor8Image || filtered[0];

            selectEl.value = defaultImage.imageId;
            statusEl.textContent = `${filtered.length}건 로드됨 (설명에 "도면" 포함)`;
            // 선택된 이미지 자동 로드
            await handleMapSpotSelect(defaultImage.imageId);
        }
    } catch (error) {
        console.error(error);
        statusEl.textContent = '목록을 불러오지 못했습니다.';
        showMessage('도면 좌표 마킹용 자료 불러오기 실패: ' + error.message, 'error');
    }
}

async function handleMapSpotSelect(imageId) {
    const img = mapSpotImagesCache.find(i => String(i.imageId) === String(imageId));
    if (!img) {
        renderMapSpotPreview(null);
        return;
    }
    mapSpotMarkers = [];
    updateMapSpotList();
    await renderMapSpotPreview(img);
    await loadExistingMapSpots(img.imageId);
}

async function renderMapSpotPreview(image) {
    const canvas = document.getElementById('mapSpotCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    mapSpotBaseImageData = null;
    mapSpotSelectedImage = image;

    if (!image) {
        ctx.font = '14px Arial';
        ctx.fillStyle = '#666';
        ctx.fillText('불러올 이미지를 선택하세요.', 20, 30);
        return;
    }

    if (image.fileType && image.fileType.toLowerCase() === 'pdf') {
        await renderMapSpotPdf(image.fileName, canvas);
        return;
    }

    await renderMapSpotImage(image.fileName, canvas);
}

async function loadExistingMapSpots(imageId) {
    if (!imageId) return;
    try {
        const response = await fetch(`/livewalk/map-spot/image/${imageId}`);
        if (!response.ok) throw new Error('좌표 조회 실패');
        const spots = await response.json();
        mapSpotMarkers = (spots || []).map(s => ({
            spotId: s.spotId,  // 기존 좌표 ID 추가
            x: s.posX,
            y: s.posY,
            name: s.spotName || '',
            radius: s.radius || 20,
            desc: s.description || ''
        }));
        redrawMapSpotCanvas();
        updateMapSpotList();
    } catch (error) {
        console.error(error);
        showMessage('저장된 좌표 불러오기 실패: ' + error.message, 'error');
    }
}

function renderMapSpotImage(fileName, canvas) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            mapSpotBaseImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            redrawMapSpotCanvas();
            resolve();
        };
        img.onerror = (err) => {
            const ctx = canvas.getContext('2d');
            ctx.font = '14px Arial';
            ctx.fillStyle = 'red';
            ctx.fillText('이미지를 불러오지 못했습니다.', 20, 30);
            reject(err);
        };
        img.src = `/uploads/images/${fileName}`;
    });
}

async function renderMapSpotPdf(fileName, canvas) {
    try {
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        const pdfUrl = `/uploads/images/${fileName}`;
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        const desiredHeight = 700;
        const viewport = page.getViewport({ scale: 1.0 });
        const scale = desiredHeight / viewport.height;
        const scaledViewport = page.getViewport({ scale });

        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;

        const renderContext = {
            canvasContext: canvas.getContext('2d'),
            viewport: scaledViewport
        };
        await page.render(renderContext).promise;
        mapSpotBaseImageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
        redrawMapSpotCanvas();
    } catch (error) {
        console.error('PDF 미리보기 실패', error);
        const ctx = canvas.getContext('2d');
        ctx.font = '14px Arial';
        ctx.fillStyle = 'red';
        ctx.fillText('PDF 미리보기에 실패했습니다.', 20, 30);
    }
}

function setupMapSpotCanvasClick() {
    const canvas = document.getElementById('mapSpotCanvas');
    if (!canvas) return;
    canvas.onclick = handleMapSpotCanvasClick;
    // 배치 선택 모드일 때는 일반 포인터, 등록 모드일 때는 십자 커서
    canvas.style.cursor = mapSpotTargetInputElement ? 'pointer' : 'crosshair';
}

function handleMapSpotCanvasClick(event) {
    const canvas = document.getElementById('mapSpotCanvas');
    if (!canvas || !mapSpotBaseImageData) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.round((event.clientX - rect.left) * scaleX);
    const y = Math.round((event.clientY - rect.top) * scaleY);

    // 일괄 등록에서 배치 선택 모드인 경우
    if (mapSpotTargetInputElement) {
        // 클릭한 위치에 가장 가까운 마커 찾기
        let closestMarker = null;
        let minDistance = Infinity;

        mapSpotMarkers.forEach(marker => {
            const distance = Math.sqrt(Math.pow(marker.x - x, 2) + Math.pow(marker.y - y, 2));
            if (distance < minDistance && distance <= (marker.radius || 20)) {
                minDistance = distance;
                closestMarker = marker;
            }
        });

        if (closestMarker) {
            // 층 정보 추출 (이미지 제목에서)
            let floorInfo = '';
            if (mapSpotSelectedImage && mapSpotSelectedImage.title) {
                // 제목에서 숫자 추출 (예: "8층 도면" -> "8")
                const match = mapSpotSelectedImage.title.match(/(\d+)/);
                if (match) {
                    floorInfo = match[1];
                }
            }

            // 구역명 추출 (name 필드만 사용, desc는 설명용)
            const zoneName = closestMarker.name || '';

            // "층-구역명" 형식으로 조합 (예: "8-A", "9-B")
            let locationText = zoneName;
            if (floorInfo && zoneName) {
                locationText = `${floorInfo}-${zoneName}`;
            }

            mapSpotTargetInputElement.value = locationText;
            showMessage(`위치 선택됨: ${locationText}`, 'success');
            closeMapSpotModal();
        } else {
            showMessage('등록된 위치를 클릭해주세요.', 'info');
        }
        return;
    }

    // 좌표 등록 모드인 경우
    if (!mapSpotRegisterEnabled) return;

    const name = `구역${mapSpotMarkers.length + 1}`;
    mapSpotMarkers.push({ x, y, name, radius: 20, desc: '' });
    redrawMapSpotCanvas();
    updateMapSpotList();
}

function toggleMapSpotRegisterMode() {
    mapSpotRegisterEnabled = !mapSpotRegisterEnabled;
    updateMapSpotRegisterToggleUI();
}

function updateMapSpotRegisterToggleUI() {
    const btn = document.getElementById('mapSpotRegisterToggleBtn');
    if (!btn) return;
    if (mapSpotRegisterEnabled) {
        btn.textContent = '좌표등록 모드: ON';
        btn.classList.remove('btn-gray');
    } else {
        btn.textContent = '좌표등록 모드: OFF';
        if (!btn.classList.contains('btn-gray')) {
            btn.classList.add('btn-gray');
        }
    }
}

function redrawMapSpotCanvas() {
    const canvas = document.getElementById('mapSpotCanvas');
    if (!canvas || !mapSpotBaseImageData) return;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(mapSpotBaseImageData, 0, 0);

    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    mapSpotMarkers.forEach(marker => {
        const radius = marker.radius && marker.radius > 0 ? marker.radius : 20;
        ctx.beginPath();
        ctx.arc(marker.x, marker.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.stroke();

        // 구역명 / 설명 텍스트 표시 (중앙 정렬)
        ctx.fillStyle = '#c2191f';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const nameText = marker.name || '';
        const descText = marker.desc || '';
        if (descText) {
            ctx.font = 'bold 12px Arial';
            ctx.fillText(nameText, marker.x, marker.y - 6);
            ctx.font = '11px Arial';
            ctx.fillText(descText, marker.x, marker.y + 8);
        } else {
            ctx.font = 'bold 12px Arial';
            ctx.fillText(nameText, marker.x, marker.y);
        }
    });
}

/**
 * 특정 구역 마커만 표시
 */
function highlightZoneMarker(zoneName) {
    const canvas = document.getElementById('mapSpotCanvas');
    if (!canvas || !mapSpotBaseImageData) return;
    const ctx = canvas.getContext('2d');

    // 기본 캔버스 다시 그리기
    ctx.putImageData(mapSpotBaseImageData, 0, 0);

    // 해당 구역 마커 찾기
    const targetMarker = mapSpotMarkers.find(m => m.name === zoneName);

    if (!targetMarker) {
        showMessage(`구역 "${zoneName}"을 찾을 수 없습니다.`, 'warning');
        return;
    }

    // 해당 구역 마커만 그리기 (빨간 테두리 + 흰색 배경)
    const radius = targetMarker.radius && targetMarker.radius > 0 ? targetMarker.radius : 20;

    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(targetMarker.x, targetMarker.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.stroke();

    // 구역명 / 설명 텍스트 표시 (중앙 정렬)
    ctx.fillStyle = '#c2191f';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const nameText = targetMarker.name || '';
    const descText = targetMarker.desc || '';

    if (descText) {
        ctx.font = 'bold 12px Arial';
        ctx.fillText(nameText, targetMarker.x, targetMarker.y - 6);
        ctx.font = '11px Arial';
        ctx.fillText(descText, targetMarker.x, targetMarker.y + 8);
    } else {
        ctx.font = 'bold 12px Arial';
        ctx.fillText(nameText, targetMarker.x, targetMarker.y);
    }

    showMessage(`위치: ${zoneName}`, 'info');
}

function updateMapSpotList() {
    const tbody = document.getElementById('mapSpotListBody');
    if (!tbody) return;

    if (!mapSpotMarkers.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #888; padding: 8px;">좌표를 클릭해 추가하고, 구역명/크기/설명을 설정하세요.</td></tr>';
        return;
    }

    tbody.innerHTML = mapSpotMarkers.map((m, idx) => `
        <tr>
            <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${idx + 1}</td>
            <td style="border: 1px solid #ddd; padding: 6px;">
                <input type="text" value="${m.name || ''}" oninput="updateMapSpotMarkerField(${idx}, 'name', this.value)" style="width: 100%; padding: 4px; border: 1px solid #ccc; font-size: 12px;" placeholder="구역명">
            </td>
            <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">
                <input type="number" value="${m.x}" oninput="updateMapSpotMarkerField(${idx}, 'x', this.value)" style="width: 100%; padding: 4px; border: 1px solid #ccc; font-size: 12px;">
            </td>
            <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">
                <input type="number" value="${m.y}" oninput="updateMapSpotMarkerField(${idx}, 'y', this.value)" style="width: 100%; padding: 4px; border: 1px solid #ccc; font-size: 12px;">
            </td>
            <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">
                <input type="number" min="1" value="${m.radius || 20}" oninput="updateMapSpotMarkerField(${idx}, 'radius', this.value)" style="width: 100%; padding: 4px; border: 1px solid #ccc; font-size: 12px;">
            </td>
            <td style="border: 1px solid #ddd; padding: 6px;">
                <input type="text" value="${m.desc || ''}" oninput="updateMapSpotMarkerField(${idx}, 'desc', this.value)" style="width: 100%; padding: 4px; border: 1px solid #ccc; font-size: 12px;" placeholder="설명">
            </td>
            <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">
                <button type="button" class="btn btn-gray" style="padding: 4px 8px; font-size: 12px;" onclick="deleteMapSpotMarker(${idx})">삭제</button>
            </td>
        </tr>
    `).join('');
}

function updateMapSpotMarkerField(index, field, value) {
    if (index < 0 || index >= mapSpotMarkers.length) return;

    if (field === 'radius') {
        const r = parseInt(value, 10);
        mapSpotMarkers[index].radius = Number.isFinite(r) && r > 0 ? r : 20;
    } else if (field === 'name') {
        mapSpotMarkers[index].name = value;
    } else if (field === 'desc') {
        mapSpotMarkers[index].desc = value;
    } else if (field === 'x') {
        const xVal = parseInt(value, 10);
        if (Number.isFinite(xVal)) {
            mapSpotMarkers[index].x = xVal;
        }
    } else if (field === 'y') {
        const yVal = parseInt(value, 10);
        if (Number.isFinite(yVal)) {
            mapSpotMarkers[index].y = yVal;
        }
    }

    redrawMapSpotCanvas();
}

function deleteMapSpotMarker(index) {
    if (index < 0 || index >= mapSpotMarkers.length) return;
    mapSpotMarkers.splice(index, 1);
    redrawMapSpotCanvas();
    updateMapSpotList();
}

function clearMapSpotMarkers() {
    mapSpotMarkers = [];
    redrawMapSpotCanvas();
    updateMapSpotList();
}

async function submitMapSpotMarkers() {
    if (!mapSpotSelectedImage) {
        showMessage('이미지를 먼저 선택하세요.', 'warning');
        return;
    }

    try {
        // 1. 기존 DB에 있던 좌표 목록 가져오기
        const response = await fetch(`/livewalk/map-spot/image/${mapSpotSelectedImage.imageId}`);
        if (!response.ok) throw new Error('기존 좌표 조회 실패');
        const existingSpots = await response.json();

        // 2. 현재 메모리에 있는 좌표의 spotId 수집
        const currentSpotIds = mapSpotMarkers
            .filter(m => m.spotId)
            .map(m => m.spotId);

        // 3. 삭제할 좌표 ID 찾기 (기존에 있었으나 현재 메모리에 없는 것)
        const toDelete = existingSpots
            .filter(s => !currentSpotIds.includes(s.spotId))
            .map(s => s.spotId);

        // 4. 수정/추가할 좌표 분류
        const toUpdate = [];
        const toInsert = [];

        mapSpotMarkers.forEach(marker => {
            const data = {
                spotId: marker.spotId,
                imageId: mapSpotSelectedImage.imageId,
                spotName: marker.name || '',
                posX: marker.x,
                posY: marker.y,
                radius: marker.radius || 20,
                description: marker.desc || ''
            };

            if (marker.spotId) {
                // 기존 좌표 (수정)
                toUpdate.push(data);
            } else {
                // 새로운 좌표 (추가)
                toInsert.push(data);
            }
        });

        // 5. 서버로 전송
        const payload = {
            toDelete: toDelete,
            toUpdate: toUpdate,
            toInsert: toInsert
        };

        const saveResponse = await fetch('/livewalk/map-spot/sync', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!saveResponse.ok) throw new Error('저장 실패');

        showMessage(`좌표 저장 완료 (삭제: ${toDelete.length}, 수정: ${toUpdate.length}, 추가: ${toInsert.length})`, 'success');

        // 6. 저장 후 다시 로드하여 spotId 동기화
        await loadExistingMapSpots(mapSpotSelectedImage.imageId);

    } catch (err) {
        showMessage('좌표 저장 실패: ' + err.message, 'error');
        console.error(err);
    }
}


// ==================== 도면 위치 선택 (Location Picker) ====================

function openLocationPicker(buttonElement) {
    // 버튼의 행에서 도면 위치 입력 필드 찾기
    const row = buttonElement.closest('tr');
    locationPickerTargetInput = row.querySelector('.bulk-map-location');

    // 입력 모드로 설정
    currentPartLocationMode = null;
    currentPartLocationPartNumber = null;
    currentPartLocationPartName = null;

    document.getElementById('locationPickerModal').style.display = 'block';
    loadLocationPickerImages();
}

// 캐비넷 위치 선택 모달 열기
function openCabinetPicker(buttonElement) {
    // 버튼의 행에서 캐비넷 위치 입력 필드 찾기
    const row = buttonElement.closest('tr');
    cabinetPickerTargetInput = row.querySelector('.bulk-cabinet-location');

    // 현재 행의 부품번호 추출
    const partNumberInput = row.querySelector('.bulk-part-number');
    const currentPartNumber = partNumberInput ? partNumberInput.value.trim() : null;

    // 입력 모드로 설정
    currentPartLocationMode = null;
    currentPartLocationPartNumber = currentPartNumber;  // 부품번호 저장
    currentPartLocationPartName = null;

    // 모달 열기
    document.getElementById('cabinetPickerModal').style.display = 'block';

    // 그리드 생성 (선택 모드) - 부품번호 전달
    createCabinetPickerGrid(currentPartNumber);
}

function closeCabinetPicker() {
    document.getElementById('cabinetPickerModal').style.display = 'none';
    cabinetPickerTargetInput = null;
}

// 캐비넷 선택용 그리드 생성 (클릭 가능)
async function createCabinetPickerGrid(highlightPartNumber = null) {
    const container = document.getElementById('cabinetPickerContainer');
    const rows = 32;  // 세로 (숫자)
    const cols = 27;  // 가로 (영어)

    // 등록된 캐비넷 위치 조회 (중복 허용 - 배열로 저장)
    let occupiedMap = new Map();
    try {
        const response = await fetch('/livewalk/part-locations/occupied-cabinets');
        if (response.ok) {
            const occupiedList = await response.json();
            occupiedList.forEach(loc => {
                const key = `${loc.posX}-${loc.posY}`;
                if (!occupiedMap.has(key)) {
                    occupiedMap.set(key, []);
                }
                occupiedMap.get(key).push(loc);
            });
        }
    } catch (error) {
        console.error('등록된 캐비넷 위치 조회 오류:', error);
    }

    let html = '<table style="border-collapse: collapse; margin: 0 auto;">';

    // 가로 레이블 생성 (A-Z, AA) - 27개
    const colLabels = [];
    for (let i = 0; i < cols; i++) {
        if (i < 26) {
            colLabels.push(String.fromCharCode(65 + i)); // A-Z
        } else {
            colLabels.push('A' + String.fromCharCode(65 + (i - 26))); // AA
        }
    }

    // 헤더 (가로 - 영어)
    html += '<tr><th style="border: 2px solid #999; padding: 8px; background: #f5f5f5; min-width: 40px; font-weight: bold;"></th>';
    for (let col = 0; col < cols; col++) {
        html += `<th style="border: 2px solid #999; padding: 8px; background: #f5f5f5; min-width: 40px; font-size: 13px; font-weight: bold;">${colLabels[col]}</th>`;
    }
    html += '</tr>';

    // 행 생성 (세로 - 숫자)
    for (let row = 1; row <= rows; row++) {
        html += `<tr>`;
        // 행 레이블 (세로 - 숫자)
        html += `<th style="border: 2px solid #999; padding: 8px; background: #f5f5f5; font-size: 13px; font-weight: bold;">${row}</th>`;

        // 셀 생성
        for (let col = 0; col < cols; col++) {
            const posX = colLabels[col];
            const posY = row;
            const locationCode = `${posX}-${posY}`;
            const occupiedArray = occupiedMap.get(locationCode);

            if (occupiedArray && occupiedArray.length > 0) {
                // 이미 등록된 위치 - 중복 허용으로 모두 선택 가능
                const hasSamePart = highlightPartNumber && occupiedArray.some(loc => loc.partNumber === highlightPartNumber);

                // 여러 물품이 있는 경우 개수 표시
                const countText = occupiedArray.length > 1 ? `(${occupiedArray.length})` : '';
                const partInfo = occupiedArray[0].partNumber ? `${occupiedArray[0].partNumber}${countText}` : `점유${countText}`;

                // 툴팁에 모든 물품 정보 표시
                const tooltipParts = occupiedArray.map(loc =>
                    `${loc.partNumber || '?'} (${loc.partName || ''})`
                ).join(', ');

                if (hasSamePart) {
                    // 동일한 부품번호 포함 - 노란색/금색 배경으로 강조 표기, 선택 가능
                    html += `<td
                        style="border: 2px solid #ff9800; padding: 6px; text-align: center; cursor: pointer; font-size: 9px; min-width: 40px; background: #fff3cd; color: #856404; font-weight: bold; box-shadow: 0 0 8px rgba(255, 152, 0, 0.5);"
                        onclick="selectCabinetPosition('${posX}', ${posY})"
                        onmouseover="this.style.background='#ffe082'"
                        onmouseout="this.style.background='#fff3cd'"
                        title="🔍 등록된 위치: ${tooltipParts} - 클릭하여 선택 가능"
                    >${partInfo}</td>`;
                } else {
                    // 다른 부품번호 - 연한 파란색 배경, 선택 가능 (중복 허용)
                    html += `<td
                        style="border: 1px solid #2196F3; padding: 6px; text-align: center; cursor: pointer; font-size: 9px; min-width: 40px; background: #e3f2fd; color: #1565c0; font-weight: bold;"
                        onclick="selectCabinetPosition('${posX}', ${posY})"
                        onmouseover="this.style.background='#bbdefb'"
                        onmouseout="this.style.background='#e3f2fd'"
                        title="등록된 위치: ${tooltipParts} - 중복 가능"
                    >${partInfo}</td>`;
                }
            } else {
                // 비어있는 위치 - 클릭 가능
                html += `<td
                    style="border: 1px solid #ddd; padding: 8px; text-align: center; cursor: pointer; font-size: 11px; min-width: 40px; background: white;"
                    onclick="selectCabinetPosition('${posX}', ${posY})"
                    onmouseover="this.style.background='#e3f2fd'"
                    onmouseout="this.style.background='white'"
                    title="${locationCode}"
                ></td>`;
            }
        }

        html += '</tr>';
    }

    html += '</table>';
    container.innerHTML = html;
}

// 캐비넷 위치 선택
async function selectCabinetPosition(posX, posY) {
    const locationCode = `${posX}-${posY}`;

    // 입고 기반 저장 모드 (배치도에서 위치 변경 - incoming_id 포함)
    if (currentPartLocationMode === 'save-incoming') {
        const incomingId = currentPartLocationIncomingId;
        const partNumber = currentPartLocationPartNumber;
        const partName = currentPartLocationPartName;

        if (!incomingId || !partNumber) {
            showMessage('입고 정보가 없습니다.', 'error');
            return;
        }

        try {
            const locationDTO = {
                incomingId: incomingId,  // 입고일련번호 포함
                partNumber: partNumber,
                partName: partName,
                posX: posX,
                posY: posY,
                locationCode: null  // 캐비넷 방식이므로 도면 위치 null
            };

            // incoming_id 기반 INSERT or UPDATE (배치도에서 위치 지정/변경)
            const response = await fetch('/livewalk/part-locations/by-incoming', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(locationDTO)
            });

            if (response.ok) {
                showMessage(`캐비넷 위치 ${posX}-${posY} 저장 완료`, 'success');
                closeCabinetPicker();
                // 초기화
                currentPartLocationMode = null;
                currentPartLocationIncomingId = null;
                currentPartLocationPartNumber = null;
                currentPartLocationPartName = null;
                // 저장 후 바로 배치도 열기
                openCabinetGridView(partNumber, locationDTO);
            } else {
                const errorText = await response.text();
                showMessage('위치 저장 실패: ' + errorText, 'error');
            }
        } catch (error) {
            console.error('위치 저장 오류:', error);
            showMessage('위치 저장 오류: ' + error.message, 'error');
        }
    }
    // 저장 모드인 경우 (배치도에서 위치 등록 - 부품번호로 incoming_id 조회)
    else if (currentPartLocationMode === 'save') {
        const partNumber = currentPartLocationPartNumber;
        const partName = currentPartLocationPartName;

        if (!partNumber) {
            showMessage('부품번호 정보가 없습니다.', 'error');
            return;
        }

        try {
            // partNumber로 incoming_id 조회
            const searchResponse = await fetch(`/livewalk/part-incoming/search?keyword=${encodeURIComponent(partNumber)}&page=1&size=1`);
            if (!searchResponse.ok) {
                showMessage('입고 데이터를 찾을 수 없습니다.', 'error');
                return;
            }

            const searchData = await searchResponse.json();
            if (!searchData.content || searchData.content.length === 0) {
                showMessage('해당 부품번호의 입고 데이터가 없습니다.', 'error');
                return;
            }

            const incomingId = searchData.content[0].incomingId;
            console.log('📌 부품번호로 incoming_id 조회 성공:', incomingId);

            const locationDTO = {
                incomingId: incomingId,
                partNumber: partNumber,
                partName: partName,
                posX: posX,
                posY: posY,
                locationCode: `${posX}-${posY}`
            };

            // incoming_id 기반 INSERT or UPDATE
            const response = await fetch('/livewalk/part-locations/by-incoming', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(locationDTO)
            });

            if (response.ok) {
                showMessage(`캐비넷 위치 ${posX}-${posY} 저장 완료`, 'success');
                closeCabinetPicker();
                // 초기화
                currentPartLocationMode = null;
                currentPartLocationPartNumber = null;
                currentPartLocationPartName = null;
                // 저장 후 바로 배치도 열기
                openCabinetGridView(partNumber, locationDTO);
            } else {
                const errorText = await response.text();
                showMessage('위치 저장 실패: ' + errorText, 'error');
            }
        } catch (error) {
            console.error('위치 저장 오류:', error);
            showMessage('위치 저장 오류: ' + error.message, 'error');
        }
    } else {
        // 입력 모드인 경우 (입고등록에서 선택)
        if (cabinetPickerTargetInput) {
            cabinetPickerTargetInput.value = locationCode;
            // blur 이벤트 트리거해서 중복 체크 실행
            cabinetPickerTargetInput.dispatchEvent(new Event('blur'));
        }

        closeCabinetPicker();
        showMessage(`캐비넷 위치 ${locationCode} 선택됨`, 'success');
    }
}

function closeLocationPicker() {
    document.getElementById('locationPickerModal').style.display = 'none';
    locationPickerSelectedImage = null;
    locationPickerBaseImageData = null;
    locationPickerMarkers = [];
    locationPickerTargetInput = null;
    const canvas = document.getElementById('locationPickerCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

async function loadLocationPickerImages() {
    const statusEl = document.getElementById('locationPickerStatus');
    const selectEl = document.getElementById('locationPickerSelect');
    statusEl.textContent = '도면 목록 로딩 중...';

    try {
        const response = await fetch('/livewalk/library');
        if (!response.ok) throw new Error('도면 목록 조회 실패');

        const images = await response.json();
        const filtered = (images || []).filter(img => (img.description || '').includes('도면'));
        locationPickerImagesCache = filtered;

        if (!filtered.length) {
            selectEl.innerHTML = '<option value="">-- 도면 이미지 없음 --</option>';
            statusEl.textContent = '설명에 "도면"이 포함된 자료가 없습니다.';
            return;
        }

        selectEl.innerHTML = ['<option value="">-- 도면을 선택하세요 --</option>']
            .concat(filtered.map(img => {
                const typeLabel = (img.fileType || 'img').toString().toUpperCase();
                return `<option value="${img.imageId}">${img.title} (${typeLabel})</option>`;
            }))
            .join('');

        // 8층 도면 자동 선택
        const floor8Image = filtered.find(img => img.title.includes('8층'));
        if (floor8Image) {
            selectEl.value = floor8Image.imageId;
            await handleLocationPickerSelect(floor8Image.imageId);
        } else {
            selectEl.value = '';
        }

        statusEl.textContent = `${filtered.length}개 도면 (설명에 "도면" 포함)`;
    } catch (error) {
        console.error(error);
        statusEl.textContent = '도면 목록 로딩 실패.';
        showMessage('도면 목록 조회 중 오류가 발생했습니다: ' + error.message, 'error');
    }
}

async function handleLocationPickerSelect(imageId) {
    const img = locationPickerImagesCache.find(i => String(i.imageId) === String(imageId));
    locationPickerSelectedImage = img;

    if (!img) {
        renderLocationPickerPreview(null);
        return;
    }

    await renderLocationPickerPreview(img);
    await loadLocationPickerSpots(imageId);
}

async function renderLocationPickerPreview(image) {
    const canvas = document.getElementById('locationPickerCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    locationPickerBaseImageData = null;

    if (!image) {
        ctx.font = '14px Arial';
        ctx.fillStyle = '#666';
        ctx.fillText('도면을 선택해 주세요.', 20, 30);
        return;
    }

    if (image.fileType && image.fileType.toLowerCase() === 'pdf') {
        await renderLocationPickerPdf(image.fileName, canvas);
        return;
    }
    await renderLocationPickerImage(image.fileName, canvas);
}

function renderLocationPickerImage(fileName, canvas) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            locationPickerBaseImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            redrawLocationPickerCanvas();
            setupLocationPickerCanvasClick();
            resolve();
        };
        img.onerror = (err) => {
            const ctx = canvas.getContext('2d');
            ctx.font = '14px Arial';
            ctx.fillStyle = 'red';
            ctx.fillText('이미지 로딩 실패.', 20, 30);
            reject(err);
        };
        img.src = `/uploads/images/${fileName}`;
    });
}

async function renderLocationPickerPdf(fileName, canvas) {
    try {
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        const pdfUrl = `/uploads/images/${fileName}`;
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        const viewport = page.getViewport({ scale: 1.5 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const scaledViewport = page.getViewport({ scale: 1.5 });
        const renderContext = {
            canvasContext: canvas.getContext('2d'),
            viewport: scaledViewport
        };
        await page.render(renderContext).promise;
        locationPickerBaseImageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
        redrawLocationPickerCanvas();
        setupLocationPickerCanvasClick();
    } catch (error) {
        console.error('PDF 렌더링 실패', error);
        const ctx = canvas.getContext('2d');
        ctx.font = '14px Arial';
        ctx.fillStyle = 'red';
        ctx.fillText('PDF 렌더링 실패했습니다.', 20, 30);
    }
}

async function loadLocationPickerSpots(imageId) {
    if (!imageId) return;
    try {
        const response = await fetch(`/livewalk/map-spot/image/${imageId}`);
        if (!response.ok) throw new Error('좌표 조회 실패');
        const spots = await response.json();
        locationPickerMarkers = (spots || []).map(s => ({
            x: s.posX,
            y: s.posY,
            name: s.spotName || '',
            radius: s.radius || 20,
            desc: s.description || ''
        }));
        redrawLocationPickerCanvas();
    } catch (error) {
        console.error(error);
        showMessage('기존 좌표 조회 중 오류 발생: ' + error.message, 'error');
    }
}

function redrawLocationPickerCanvas() {
    const canvas = document.getElementById('locationPickerCanvas');
    if (!canvas || !locationPickerBaseImageData) return;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(locationPickerBaseImageData, 0, 0);

    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    locationPickerMarkers.forEach(marker => {
        const radius = marker.radius && marker.radius > 0 ? marker.radius : 20;
        ctx.beginPath();
        ctx.arc(marker.x, marker.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#c2191f';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const nameText = marker.name || '';
        const descText = marker.desc || '';
        if (descText) {
            ctx.font = 'bold 12px Arial';
            ctx.fillText(nameText, marker.x, marker.y - 6);
            ctx.font = '11px Arial';
            ctx.fillText(descText, marker.x, marker.y + 8);
        } else {
            ctx.font = 'bold 12px Arial';
            ctx.fillText(nameText, marker.x, marker.y);
        }
    });
}

function setupLocationPickerCanvasClick() {
    const canvas = document.getElementById('locationPickerCanvas');
    if (!canvas) return;
    canvas.onclick = handleLocationPickerCanvasClick;
}

async function handleLocationPickerCanvasClick(event) {
    const canvas = document.getElementById('locationPickerCanvas');
    if (!canvas || !locationPickerBaseImageData || !locationPickerSelectedImage) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.round((event.clientX - rect.left) * scaleX);
    const y = Math.round((event.clientY - rect.top) * scaleY);

    // 클릭한 위치에 있는 마커 찾기
    const clickedMarker = locationPickerMarkers.find(m => {
        const distance = Math.sqrt(Math.pow(m.x - x, 2) + Math.pow(m.y - y, 2));
        return distance <= (m.radius || 20);
    });

    if (clickedMarker) {
        // 층 추출 (이미지 title에서 숫자 추출)
        const floorMatch = locationPickerSelectedImage.title.match(/\d+/);
        const floor = floorMatch ? floorMatch[0] : '';

        // 층-구역이름 형식으로 입력
        const locationCode = floor ? `${floor}-${clickedMarker.name}` : clickedMarker.name;

        // 입고 기반 저장 모드 (배치도에서 위치 변경 - incoming_id 포함)
        if (currentPartLocationMode === 'save-incoming') {
            const incomingId = currentPartLocationIncomingId;
            const partNumber = currentPartLocationPartNumber;
            const partName = currentPartLocationPartName;

            if (!incomingId || !partNumber) {
                showMessage('입고 정보가 없습니다.', 'error');
                return;
            }

            try {
                const locationDTO = {
                    incomingId: incomingId,  // 입고일련번호 포함
                    partNumber: partNumber,
                    partName: partName,
                    locationCode: locationCode,
                    posX: null,  // 도면 방식이므로 캐비넷 위치 null
                    posY: null
                };

                // incoming_id 기반 INSERT or UPDATE (배치도에서 위치 지정/변경)
                const response = await fetch('/livewalk/part-locations/by-incoming', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(locationDTO)
                });

                if (response.ok) {
                    showMessage(`도면 위치 ${locationCode} 저장 완료`, 'success');
                    closeLocationPicker();
                    // 초기화
                    currentPartLocationMode = null;
                    currentPartLocationIncomingId = null;
                    currentPartLocationPartNumber = null;
                    currentPartLocationPartName = null;
                    // 저장 후 바로 배치도 열기
                    openPartLocationViewByIncomingId(incomingId);
                } else {
                    const errorText = await response.text();
                    showMessage('위치 저장 실패: ' + errorText, 'error');
                }
            } catch (error) {
                console.error('위치 저장 오류:', error);
                showMessage('위치 저장 오류: ' + error.message, 'error');
            }
        }
        // 저장 모드인 경우 (배치도에서 위치 등록)
        else if (currentPartLocationMode === 'save') {
            const partNumber = currentPartLocationPartNumber;
            const partName = currentPartLocationPartName;

            if (!partNumber) {
                showMessage('부품번호 정보가 없습니다.', 'error');
                return;
            }

            try {
                // partNumber로 incoming_id 조회
                const searchResponse = await fetch(`/livewalk/part-incoming/search?keyword=${encodeURIComponent(partNumber)}&page=1&size=1`);
                if (!searchResponse.ok) {
                    showMessage('입고 데이터를 찾을 수 없습니다.', 'error');
                    return;
                }

                const searchData = await searchResponse.json();
                if (!searchData.content || searchData.content.length === 0) {
                    showMessage('해당 부품번호의 입고 데이터가 없습니다.', 'error');
                    return;
                }

                const incomingId = searchData.content[0].incomingId;
                console.log('📌 도면 위치 - incoming_id 조회 성공:', incomingId);

                const locationDTO = {
                    incomingId: incomingId,
                    partNumber: partNumber,
                    partName: partName,
                    locationCode: locationCode
                };

                // incoming_id 기반 INSERT or UPDATE
                const response = await fetch('/livewalk/part-locations/by-incoming', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(locationDTO)
                });

                if (response.ok) {
                    showMessage(`도면 위치 ${locationCode} 저장 완료`, 'success');
                    closeLocationPicker();
                    // 초기화
                    currentPartLocationMode = null;
                    currentPartLocationPartNumber = null;
                    currentPartLocationPartName = null;
                    // 저장 후 바로 배치도 열기
                    openPartLocationView(partNumber);
                } else {
                    const errorText = await response.text();
                    showMessage('위치 저장 실패: ' + errorText, 'error');
                }
            } catch (error) {
                console.error('위치 저장 오류:', error);
                showMessage('위치 저장 오류: ' + error.message, 'error');
            }
        } else {
            // 입력 모드인 경우 (입고등록에서 선택)
            if (locationPickerTargetInput) {
                locationPickerTargetInput.value = locationCode;
                showMessage(`위치 선택됨: ${locationCode}`, 'success');
                closeLocationPicker();
            }
        }
    }
}


// ==================== 배치도 보기 ====================

/**
 * 입고 ID로 배치도 열기 (입고 리스트용)
 */
async function openPartLocationViewByIncomingId(incomingId) {
    try {
        // incoming_id로 위치 정보 조회
        const response = await fetch(`/livewalk/part-locations/incoming/${incomingId}`);

        if (!response.ok) {
            showMessage('위치 정보 조회 오류', 'error');
            return;
        }

        // 응답 텍스트 확인 (빈 응답 처리)
        const text = await response.text();
        let location = null;

        try {
            location = text ? JSON.parse(text) : null;
        } catch (parseError) {
            console.log('JSON 파싱 실패, 빈 응답으로 처리:', parseError);
            location = null;
        }

        // location이 null이거나 비어있는 경우 (위치 정보가 등록되지 않음)
        if (!location) {
            console.log('📍 위치 정보 없음 - 등록 다이얼로그 표시');
            try {
                const incomingResponse = await fetch(`/livewalk/incoming/${incomingId}`);
                if (incomingResponse.ok) {
                    const incoming = await incomingResponse.json();
                    showLocationSelectionDialogForIncoming(incomingId, incoming.partNumber, incoming.partName);
                } else {
                    showMessage('입고 정보를 찾을 수 없습니다.', 'error');
                }
            } catch (e) {
                console.error('입고 정보 조회 실패:', e);
                showMessage('입고 정보 조회 오류', 'error');
            }
            return;
        }

        // 부품명 저장
        currentViewingPartNumber = location.partNumber;
        currentViewingPartName = location.partName;
        currentViewingIncomingId = location.incomingId; // incoming_id 저장

        // pos_x, pos_y가 있으면 캐비넷 그리드 방식
        if (location.posX && location.posY) {
            openCabinetGridView(location.partNumber, location);
            return;
        }

        // locationCode가 있으면 도면 방식
        const locationCode = location.locationCode;

        if (!locationCode) {
            showLocationSelectionDialogForIncoming(incomingId, location.partNumber, location.partName);
            return;
        }

        // locationCode 파싱 (예: "8-A" -> 층: 8, 구역: A)
        if (!locationCode.includes('-')) {
            showMessage('위치 코드 형식이 올바르지 않습니다.', 'error');
            return;
        }

        const parts = locationCode.split('-');
        const floor = parts[0].trim();
        const zone = parts[1].trim();

        // 모달 열기
        document.getElementById('partLocationViewModal').style.display = 'block';

        // 제목 업데이트
        document.getElementById('partLocationViewTitle').innerHTML =
            `부품 배치도: <span style="color: #fff;">${location.partNumber}</span>`;

        // 정보 업데이트
        document.getElementById('partLocationViewInfo').innerHTML =
            `부품번호: <strong>${location.partNumber}</strong> | 위치: <strong style="color: #dc3545;">${locationCode}</strong> (${floor}층 ${zone}구역)`;

        // 도면 선택 드롭다운 숨기기
        const selectContainer = document.querySelector('label[for="partLocationViewSelect"]')?.parentElement;
        if (selectContainer) {
            selectContainer.style.display = 'none';
        }

        // 이미지 목록 로드
        await loadPartLocationViewImages();

        // 해당 층 이미지 찾기 및 선택
        const floorImage = partLocationViewImagesCache.find(img =>
            img.title && img.title.includes(floor + '층')
        );

        if (floorImage) {
            const selectEl = document.getElementById('partLocationViewSelect');
            selectEl.value = floorImage.imageId;
            await handlePartLocationViewSelect(floorImage.imageId, zone);
        } else {
            showMessage(`${floor}층 배치도를 찾을 수 없습니다.`, 'error');
        }

    } catch (error) {
        console.error('배치도 조회 오류:', error);
        showMessage('배치도 조회 오류: ' + error.message, 'error');
    }
}

/**
 * 부품번호로 배치도 열기 (재고현황/출고 리스트용)
 */
async function openPartLocationView(partNumber) {
    try {
        partLocationViewPartNumber = partNumber;
        currentViewingPartNumber = partNumber;

        // 부품 위치 정보 조회
        const response = await fetch(`/livewalk/part-locations/part?partNumber=${encodeURIComponent(partNumber)}`);

        // 위치 정보가 없는 경우 처리
        if (!response.ok) {
            // 부품 정보 조회하여 부품명 가져오기
            let partName = '';
            try {
                const partResponse = await fetch(`/livewalk/incoming/part/${encodeURIComponent(partNumber)}`);
                if (partResponse.ok) {
                    const partList = await partResponse.json();
                    if (partList && partList.length > 0) {
                        partName = partList[0].partName || '';
                        currentViewingPartName = partName;
                    }
                }
            } catch (e) {
                console.log('부품명 조회 실패:', e);
            }

            showLocationSelectionDialog(partNumber, partName);
            return;
        }

        let location = null;
        try {
            location = await response.json();
        } catch (e) {
            console.log('JSON 파싱 오류:', e);
        }

        // location이 null이거나 비어있는 경우
        if (!location) {
            // 부품 정보 조회하여 부품명 가져오기
            let partName = '';
            try {
                const partResponse = await fetch(`/livewalk/incoming/part/${encodeURIComponent(partNumber)}`);
                if (partResponse.ok) {
                    const partList = await partResponse.json();
                    if (partList && partList.length > 0) {
                        partName = partList[0].partName || '';
                    }
                }
            } catch (e) {
                console.log('부품명 조회 실패:', e);
            }

            showLocationSelectionDialog(partNumber, partName);
            return;
        }

        // 부품명 저장
        currentViewingPartName = location.partName;

        // pos_x, pos_y가 있으면 캐비넷 그리드 방식
        if (location.posX && location.posY) {
            openCabinetGridView(partNumber, location);
            return;
        }

        // locationCode가 있으면 도면 방식
        const locationCode = location.locationCode;

        if (!locationCode) {
            // 위치 정보가 없으면 선택 대화상자 표시
            showLocationSelectionDialog(partNumber, location.partName);
            return;
        }

        // locationCode 파싱 (예: "8-A" -> 층: 8, 구역: A)
        if (!locationCode.includes('-')) {
            showMessage('위치 코드 형식이 올바르지 않습니다.', 'error');
            return;
        }

        const parts = locationCode.split('-');
        const floor = parts[0].trim();
        const zone = parts[1].trim();

        // 모달 열기
        document.getElementById('partLocationViewModal').style.display = 'block';

        // 제목 업데이트
        document.getElementById('partLocationViewTitle').innerHTML =
            `부품 배치도: <span style="color: #fff;">${partNumber}</span>`;

        // 정보 업데이트
        document.getElementById('partLocationViewInfo').innerHTML =
            `부품번호: <strong>${partNumber}</strong> | 위치: <strong style="color: #dc3545;">${locationCode}</strong> (${floor}층 ${zone}구역)`;

        // 도면 선택 드롭다운 숨기기
        const selectContainer = document.querySelector('label[for="partLocationViewSelect"]')?.parentElement;
        if (selectContainer) {
            selectContainer.style.display = 'none';
        }

        // 이미지 목록 로드
        await loadPartLocationViewImages();

        // 해당 층 이미지 찾기 및 선택
        const floorImage = partLocationViewImagesCache.find(img =>
            img.title && img.title.includes(floor + '층')
        );

        if (floorImage) {
            const selectEl = document.getElementById('partLocationViewSelect');
            selectEl.value = floorImage.imageId;
            await handlePartLocationViewSelect(floorImage.imageId, zone);
        } else {
            showMessage(`${floor}층 배치도를 찾을 수 없습니다.`, 'error');
        }

    } catch (error) {
        console.error('배치도 조회 오류:', error);
        showMessage('배치도 조회 오류: ' + error.message, 'error');
    }
}

/**
 * 위치 정보가 없을 때 선택 대화상자 표시
 */
function showLocationSelectionDialog(partNumber, partName) {
    const modalHtml = `
        <div id="locationSelectionModal" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
        ">
            <div style="
                background: white;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                max-width: 400px;
                width: 90%;
            ">
                <h3 style="margin-top: 0; color: #333;">위치 정보 선택</h3>
                <p style="color: #666; margin-bottom: 20px;">
                    부품번호 <strong>${partNumber}</strong><br>
                    ${partName ? `부품명: <strong>${partName}</strong><br>` : ''}
                    <br>
                    등록된 위치 정보가 없습니다.<br>
                    위치를 선택하시겠습니까?
                </p>
                <div style="display: flex; gap: 10px; flex-direction: column;">
                    <button onclick="selectLocationTypeForPart('${partNumber}', '${partName || ''}', 'cabinet')"
                            style="padding: 12px; background: #4472C4; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
                        📦 캐비넷 위치 선택
                    </button>
                    <button onclick="selectLocationTypeForPart('${partNumber}', '${partName || ''}', 'map')"
                            style="padding: 12px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
                        🗺️ 도면 위치 선택
                    </button>
                    <button onclick="closeLocationSelectionDialog()"
                            style="padding: 12px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
                        취소
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

/**
 * 입고 ID 기반 위치 선택 대화상자
 */
function showLocationSelectionDialogForIncoming(incomingId, partNumber, partName) {
    // 이미 열려있는 모달이 있으면 제거
    const existingModal = document.getElementById('locationSelectionModal');
    if (existingModal) {
        existingModal.remove();
    }

    const modalHtml = `
        <div id="locationSelectionModal" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
        ">
            <div style="
                background: white;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                max-width: 400px;
                width: 90%;
            ">
                <h3 style="margin-top: 0; color: #333;">배치도 위치 선택</h3>
                <p style="color: #666; margin-bottom: 20px;">
                    입고ID: <strong>${incomingId}</strong><br>
                    부품번호: <strong>${partNumber}</strong><br>
                    ${partName ? `부품명: <strong>${partName}</strong><br>` : ''}
                    <br>
                    배치도 위치를 선택해주세요.
                </p>
                <div style="display: flex; gap: 10px; flex-direction: column;">
                    <button onclick="selectLocationTypeForIncoming(${incomingId}, '${partNumber}', '${partName || ''}', 'cabinet')"
                            style="padding: 12px; background: #4472C4; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
                        📦 캐비넷 위치 선택
                    </button>
                    <button onclick="selectLocationTypeForIncoming(${incomingId}, '${partNumber}', '${partName || ''}', 'map')"
                            style="padding: 12px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
                        🗺️ 도면 위치 선택
                    </button>
                    <button onclick="closeLocationSelectionDialog()"
                            style="padding: 12px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
                        취소
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

/**
 * 위치 선택 대화상자 닫기
 */
function closeLocationSelectionDialog() {
    const modal = document.getElementById('locationSelectionModal');
    if (modal) {
        modal.remove();
    }
}

/**
 * 위치 타입 선택 처리
 */
function selectLocationTypeForPart(partNumber, partName, type) {
    closeLocationSelectionDialog();

    if (type === 'cabinet') {
        openCabinetPickerForPartLocation(partNumber, partName);
    } else if (type === 'map') {
        openMapPickerForPartLocation(partNumber, partName);
    }
}

/**
 * 입고 ID 기반 위치 타입 선택 처리
 */
function selectLocationTypeForIncoming(incomingId, partNumber, partName, type) {
    closeLocationSelectionDialog();

    if (type === 'cabinet') {
        openCabinetPickerForIncoming(incomingId, partNumber, partName);
    } else if (type === 'map') {
        openMapPickerForIncoming(incomingId, partNumber, partName);
    }
}

/**
 * 캐비넷 위치 선택 모달 열기 (부품 위치 등록용 - 기존 캐비넷 피커 재사용)
 */
async function openCabinetPickerForPartLocation(partNumber, partName) {
    currentPartLocationPartNumber = partNumber;
    currentPartLocationPartName = partName;

    // 배치도에서 저장된 incoming_id 사용 (배치도 변경 시)
    if (currentViewingIncomingId) {
        currentPartLocationIncomingId = currentViewingIncomingId;
        currentPartLocationMode = 'save-incoming'; // incoming_id 기반 저장 모드
        console.log('📌 배치도 변경 - incoming_id 사용:', currentPartLocationIncomingId);
    } else {
        // incoming_id가 없으면 일반 저장 모드 (새로운 위치 등록)
        currentPartLocationMode = 'save';
        currentPartLocationIncomingId = null;
        console.log('📌 새로운 위치 등록 - 일반 저장 모드');
    }

    // 기존 캐비넷 피커 모달 재활용
    document.getElementById('cabinetPickerModal').style.display = 'block';
    await createCabinetPickerGrid(partNumber); // 부품번호 전달하여 동일 부품 강조
}

/**
 * 도면 위치 선택 모달 열기 (부품 위치 등록용 - 기존 배치 피커 재사용)
 */
function openMapPickerForPartLocation(partNumber, partName) {
    currentPartLocationPartNumber = partNumber;
    currentPartLocationPartName = partName;
    currentPartLocationMode = 'save'; // 저장 모드 플래그

    // 기존 배치 피커 모달 재활용
    document.getElementById('locationPickerModal').style.display = 'block';
    loadLocationPickerImages();
}

/**
 * 입고 ID 기반 캐비넷 위치 선택
 */
async function openCabinetPickerForIncoming(incomingId, partNumber, partName) {
    currentPartLocationIncomingId = incomingId;
    currentPartLocationPartNumber = partNumber;
    currentPartLocationPartName = partName;
    currentPartLocationMode = 'save-incoming'; // 입고 기반 저장 모드

    document.getElementById('cabinetPickerModal').style.display = 'block';
    await createCabinetPickerGrid(partNumber); // 부품번호 전달하여 동일 부품 강조
}

/**
 * 입고 ID 기반 도면 위치 선택
 */
function openMapPickerForIncoming(incomingId, partNumber, partName) {
    currentPartLocationIncomingId = incomingId;
    currentPartLocationPartNumber = partNumber;
    currentPartLocationPartName = partName;
    currentPartLocationMode = 'save-incoming'; // 입고 기반 저장 모드

    document.getElementById('locationPickerModal').style.display = 'block';
    loadLocationPickerImages();
}

/**
 * 배치도 보기용 이미지 목록 로드
 */
async function loadPartLocationViewImages() {
    const selectEl = document.getElementById('partLocationViewSelect');
    const statusEl = document.getElementById('partLocationViewStatus');

    try {
        statusEl.textContent = '목록을 불러오는 중...';
        selectEl.innerHTML = '<option value="">-- 도면을 선택하세요 --</option>';

        const response = await fetch('/livewalk/library');
        if (!response.ok) {
            throw new Error('자료실 목록 조회 실패');
        }

        const images = await response.json();

        // "도면"을 포함하는 이미지만 필터링
        const filtered = (images || []).filter(img =>
            img.description && img.description.includes('도면')
        );

        partLocationViewImagesCache = filtered;

        if (filtered.length === 0) {
            selectEl.innerHTML = '<option value="">-- 자료가 없습니다 --</option>';
            statusEl.textContent = '설명에 "도면"이 포함된 자료가 없습니다.';
            return;
        }

        filtered.forEach(img => {
            const option = document.createElement('option');
            option.value = img.imageId;
            const typeLabel = (img.fileType || 'img').toString().toUpperCase();
            option.textContent = `${img.title} (${typeLabel})`;
            selectEl.appendChild(option);
        });

        statusEl.textContent = `${filtered.length}건 로드됨`;

    } catch (error) {
        console.error('이미지 목록 로드 오류:', error);
        statusEl.textContent = '목록을 불러오지 못했습니다.';
        showMessage('도면 목록 불러오기 실패: ' + error.message, 'error');
    }
}

/**
 * 배치도 보기용 이미지 선택 처리
 */
async function handlePartLocationViewSelect(imageId, highlightZone = null) {
    if (!imageId) {
        return;
    }

    const statusEl = document.getElementById('partLocationViewStatus');
    const canvas = document.getElementById('partLocationViewCanvas');
    const ctx = canvas.getContext('2d');

    try {
        statusEl.textContent = '이미지를 불러오는 중...';

        // 선택된 이미지 정보 저장
        partLocationViewSelectedImage = partLocationViewImagesCache.find(
            img => img.imageId == imageId
        );

        if (!partLocationViewSelectedImage) {
            throw new Error('선택한 이미지를 찾을 수 없습니다.');
        }

        // Canvas 초기화
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        partLocationViewBaseImageData = null;

        // 이미지 또는 PDF 로드
        if (partLocationViewSelectedImage.fileType && partLocationViewSelectedImage.fileType.toLowerCase() === 'pdf') {
            await renderPartLocationViewPdf(partLocationViewSelectedImage.fileName, canvas);
        } else {
            await renderPartLocationViewImage(partLocationViewSelectedImage.fileName, canvas);
        }

        // 해당 이미지의 좌표 마커 로드
        await loadPartLocationViewMarkers(imageId, highlightZone);

        statusEl.textContent = '로드 완료';

    } catch (error) {
        console.error('이미지 로드 오류:', error);
        statusEl.textContent = '로드 실패';
        showMessage('이미지를 불러올 수 없습니다: ' + error.message, 'error');
    }
}

/**
 * 배치도 보기용 이미지 렌더링
 */
function renderPartLocationViewImage(fileName, canvas) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            partLocationViewBaseImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            resolve();
        };
        img.onerror = (err) => {
            const ctx = canvas.getContext('2d');
            ctx.font = '14px Arial';
            ctx.fillStyle = 'red';
            ctx.fillText('이미지를 불러오지 못했습니다.', 20, 30);
            reject(err);
        };
        img.src = `/uploads/images/${fileName}`;
    });
}

/**
 * 배치도 보기용 PDF 렌더링
 */
async function renderPartLocationViewPdf(fileName, canvas) {
    try {
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        const pdfUrl = `/uploads/images/${fileName}`;
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        const desiredHeight = 700;
        const viewport = page.getViewport({ scale: 1.0 });
        const scale = desiredHeight / viewport.height;
        const scaledViewport = page.getViewport({ scale });

        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;

        const renderContext = {
            canvasContext: canvas.getContext('2d'),
            viewport: scaledViewport
        };
        await page.render(renderContext).promise;
        partLocationViewBaseImageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    } catch (error) {
        console.error('PDF 미리보기 실패', error);
        const ctx = canvas.getContext('2d');
        ctx.font = '14px Arial';
        ctx.fillStyle = 'red';
        ctx.fillText('PDF 미리보기에 실패했습니다.', 20, 30);
        throw error;
    }
}

/**
 * 배치도 보기용 마커 로드 및 표시
 */
async function loadPartLocationViewMarkers(imageId, highlightZone = null) {
    try {
        const response = await fetch(`/livewalk/map-spot/image/${imageId}`);
        if (!response.ok) {
            partLocationViewMarkers = [];
            return;
        }

        const allMarkers = await response.json();

        // highlightZone이 있으면 해당 구역만 필터링
        if (highlightZone) {
            partLocationViewMarkers = allMarkers.filter(marker =>
                marker.spotName === highlightZone
            );
        } else {
            partLocationViewMarkers = allMarkers;
        }

        // 마커 그리기
        drawPartLocationViewMarkers(highlightZone);

    } catch (error) {
        console.error('좌표 마커 로드 오류:', error);
        partLocationViewMarkers = [];
    }
}

/**
 * 배치도 보기용 마커 그리기
 */
function drawPartLocationViewMarkers(highlightZone = null) {
    const canvas = document.getElementById('partLocationViewCanvas');
    const ctx = canvas.getContext('2d');

    if (!partLocationViewBaseImageData) {
        return;
    }

    // 기본 이미지 복원
    ctx.putImageData(partLocationViewBaseImageData, 0, 0);

    // 마커 그리기 (도면 좌표 마킹과 동일한 스타일)
    partLocationViewMarkers.forEach(marker => {
        const radius = marker.radius && marker.radius > 0 ? marker.radius : 20;

        // 원 그리기
        ctx.beginPath();
        ctx.arc(marker.posX, marker.posY, radius, 0, 2 * Math.PI);

        // 배경: 흰색
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // 테두리: 빨간색
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 구역명 / 설명 텍스트 표시 (중앙 정렬)
        ctx.fillStyle = '#c2191f';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const nameText = marker.spotName || '';
        const descText = marker.description || '';

        if (descText) {
            // 설명이 있으면 두 줄로 표시
            ctx.font = 'bold 12px Arial';
            ctx.fillText(nameText, marker.posX, marker.posY - 6);
            ctx.font = '11px Arial';
            ctx.fillText(descText, marker.posX, marker.posY + 8);
        } else {
            // 설명이 없으면 구역명만 표시
            ctx.font = 'bold 12px Arial';
            ctx.fillText(nameText, marker.posX, marker.posY);
        }
    });
}

/**
 * 도면 위치 변경
 */
function editMapLocation() {
    const partNumber = partLocationViewPartNumber || currentViewingPartNumber;
    const partName = currentViewingPartName;
    const incomingId = currentViewingIncomingId;

    if (!partNumber) {
        showMessage('부품번호 정보가 없습니다.', 'error');
        return;
    }

    // 현재 모달 닫기
    closePartLocationView();

    // incoming_id가 있으면 입고 기반 위치 변경, 없으면 일반 위치 변경
    if (incomingId) {
        showLocationSelectionDialogForIncoming(incomingId, partNumber, partName);
    } else {
        showLocationSelectionDialog(partNumber, partName);
    }
}

function closePartLocationView() {
    document.getElementById('partLocationViewModal').style.display = 'none';
    partLocationViewSelectedImage = null;
    partLocationViewBaseImageData = null;
    partLocationViewMarkers = [];
    partLocationViewPartNumber = null;
    // 변수 초기화
    currentViewingPartNumber = null;
    currentViewingPartName = null;
    currentViewingIncomingId = null;
}


// ==================== 캐비넷 그리드 배치도 ====================

/**
 * 캐비넷 그리드 배치도 열기
 */
function openCabinetGridView(partNumber, location) {
    // 현재 부품 정보 저장
    currentViewingPartNumber = partNumber;
    currentViewingPartName = location.partName;
    currentViewingIncomingId = location.incomingId; // incoming_id 저장

    // 모달 열기
    document.getElementById('cabinetGridModal').style.display = 'block';

    // 제목 업데이트
    document.getElementById('cabinetGridTitle').innerHTML =
        `캐비넷 배치도: <span style="color: #fff;">${partNumber}</span>`;

    // 정보 업데이트
    const locationText = `${location.posX}-${location.posY}`;
    document.getElementById('cabinetGridInfo').innerHTML =
        `부품번호: <strong>${partNumber}</strong> | 위치: <strong style="color: #dc3545;">${locationText}</strong>`;

    // 그리드 생성 (32x27)
    createCabinetGrid(location.posX, location.posY);
}

/**
 * 32x27 캐비넷 그리드 생성
 * 가로: A~AA (27개)
 * 세로: 1~32 (32개)
 */
async function createCabinetGrid(highlightX, highlightY) {
    const container = document.getElementById('cabinetGridContainer');
    const rows = 32;  // 세로 (숫자)
    const cols = 27;  // 가로 (영어)

    // 재고 현황에서 캐비넷 위치 정보 가져오기
    let locationMap = {};
    try {
        const response = await fetch('/livewalk/incoming/inventory');
        if (response.ok) {
            const inventory = await response.json();
            // 캐비넷 위치별로 부품 그룹화
            inventory.forEach(item => {
                if (item.cabinet_location) {
                    const match = item.cabinet_location.match(/^([A-Z]{1,2})-(\d+)$/);
                    if (match) {
                        const key = `${match[1]}-${parseInt(match[2])}`;
                        if (!locationMap[key]) {
                            locationMap[key] = [];
                        }
                        locationMap[key].push({
                            partNumber: item.part_number,
                            partName: item.part_name,
                            stock: item.current_stock
                        });
                    }
                }
            });
        }
    } catch (error) {
        console.error('재고 정보 조회 실패:', error);
    }

    let html = '<table style="border-collapse: collapse; margin: 0 auto;">';

    // 가로 레이블 생성 (A-Z, AA) - 27개
    const colLabels = [];
    for (let i = 0; i < cols; i++) {
        if (i < 26) {
            colLabels.push(String.fromCharCode(65 + i)); // A-Z
        } else {
            colLabels.push('A' + String.fromCharCode(65 + (i - 26))); // AA
        }
    }

    // 헤더 (가로 - 영어)
    html += '<tr><th style="border: 1px solid #999; padding: 2px; background: #f5f5f5; width: 24px; font-weight: bold; font-size: 9px; text-align: center;"></th>';
    for (let col = 0; col < cols; col++) {
        html += `<th style="border: 1px solid #999; padding: 2px; background: #f5f5f5; width: 24px; font-size: 9px; font-weight: bold; text-align: center;">${colLabels[col]}</th>`;
    }
    html += '</tr>';

    // 행 생성 (세로 - 숫자 1~32)
    for (let row = 1; row <= rows; row++) {
        html += '<tr>';
        // 행 헤더 (숫자)
        html += `<th style="border: 1px solid #999; padding: 2px; background: #f5f5f5; width: 24px; font-size: 9px; font-weight: bold; text-align: center;">${row}</th>`;

        // 각 셀
        for (let col = 0; col < cols; col++) {
            const colLabel = colLabels[col];
            const locationKey = `${colLabel}-${row}`;
            const isHighlight = (colLabel === highlightX && row === highlightY);
            const partsAtLocation = locationMap[locationKey] || [];
            const partCount = partsAtLocation.length;

            let cellStyle = 'border: 1px solid #999; padding: 3px; text-align: center; width: 24px; height: 20px; cursor: pointer;';
            let cellContent = '';

            if (isHighlight) {
                // 강조 셀 - 빨간색 배경
                cellStyle += ' background: #dc3545; color: white; font-weight: bold; font-size: 10px;';
                if (partCount > 1) {
                    cellContent = `${colLabel}-${row}<br><span style="font-size: 8px;">(x${partCount})</span>`;
                } else {
                    cellContent = `${colLabel}-${row}`;
                }
            } else if (partCount > 0) {
                // 부품이 있는 셀 - 연한 파란색 배경
                cellStyle += ' background: #d4edff; font-size: 9px; font-weight: bold; color: #0056b3;';
                if (partCount > 1) {
                    cellContent = `${colLabel}-${row}<br><span style="font-size: 8px;">(x${partCount})</span>`;
                } else {
                    cellContent = `${colLabel}-${row}`;
                }
            } else {
                cellStyle += ' background: #fff; font-size: 9px;';
            }

            html += `<td style="${cellStyle}" onclick="showCabinetLocationDetails('${colLabel}', ${row})">${cellContent}</td>`;
        }
        html += '</tr>';
    }

    html += '</table>';
    container.innerHTML = html;
}

/**
 * 캐비넷 위치 변경
 */
function editCabinetLocation() {
    const partNumber = currentViewingPartNumber;
    const partName = currentViewingPartName;
    const incomingId = currentViewingIncomingId;

    if (!partNumber) {
        showMessage('부품번호 정보가 없습니다.', 'error');
        return;
    }

    // 현재 모달 닫기
    closeCabinetGrid();

    // incoming_id가 있으면 입고 기반 위치 변경, 없으면 일반 위치 변경
    if (incomingId) {
        showLocationSelectionDialogForIncoming(incomingId, partNumber, partName);
    } else {
        showLocationSelectionDialog(partNumber, partName);
    }
}

/**
 * 캐비넷 위치의 부품 상세 정보 표시
 */
async function showCabinetLocationDetails(posX, posY) {
    const locationKey = `${posX}-${posY}`;

    try {
        const response = await fetch('/livewalk/incoming/inventory');
        if (!response.ok) {
            throw new Error('재고 정보 조회 실패');
        }

        const inventory = await response.json();
        const partsAtLocation = inventory.filter(item => {
            if (!item.cabinet_location) return false;
            const match = item.cabinet_location.match(/^([A-Z]{1,2})-(\d+)$/);
            return match && `${match[1]}-${parseInt(match[2])}` === locationKey;
        });

        if (partsAtLocation.length === 0) {
            showMessage(`위치 ${locationKey}에 부품이 없습니다.`, 'info');
            return;
        }

        // 모달에 부품 목록 표시
        showCabinetLocationModal(locationKey, partsAtLocation);
    } catch (error) {
        console.error('부품 정보 조회 실패:', error);
        showMessage('부품 정보를 불러오는데 실패했습니다.', 'error');
    }
}

/**
 * 캐비넷 위치 부품 목록 모달 표시
 */
function showCabinetLocationModal(location, parts) {
    const modal = document.getElementById('cabinetLocationPartsModal');
    const title = document.getElementById('cabinetLocationPartsTitle');
    const tbody = document.getElementById('cabinetLocationPartsBody');

    title.textContent = `위치: ${location}`;

    tbody.innerHTML = parts.map(part => `
        <tr>
            <td>${part.part_number}</td>
            <td>${part.part_name}</td>
            <td>${part.category_name || '-'}</td>
            <td style="font-weight: bold; color: ${part.current_stock > 0 ? '#28a745' : '#dc3545'};">
                ${part.current_stock || 0}
            </td>
        </tr>
    `).join('');

    modal.style.display = 'block';
}

/**
 * 캐비넷 위치 부품 목록 모달 닫기
 */
function closeCabinetLocationPartsModal() {
    document.getElementById('cabinetLocationPartsModal').style.display = 'none';
    document.getElementById('cabinetLocationPartsBody').innerHTML = '';
}

/**
 * 캐비넷 그리드 모달 닫기
 */
function closeCabinetGrid() {
    document.getElementById('cabinetGridModal').style.display = 'none';
    document.getElementById('cabinetGridContainer').innerHTML = '';
    // 변수 초기화
    currentViewingPartNumber = null;
    currentViewingPartName = null;
    currentViewingIncomingId = null;
}
