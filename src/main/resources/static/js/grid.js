// ==========================================
// 🧩 부품 배치도 + 재고 연동 기능 (출고와 독립)
// ==========================================
// LOCATION_CODE_REGEX는 constants.js에서 선언됨

// ==========================================
// 전역 변수
// ==========================================
let gridInitialized = false;

// ==========================================
// 위치 코드 정규화 및 검증 함수
// ==========================================

/**
 * 위치 코드 정규화 (대문자 변환, 특수문자 제거, 하이픈 자동 삽입)
 */
function normalizeLocationCode(value = '') {
    // 먼저 대문자 변환 및 허용된 문자만 남기기
    let normalized = value
        .toUpperCase()
        .replace(/[^A-Z0-9-]/g, '');

    // 하이픈이 없는 경우 자동으로 삽입 시도 (예: AA13 -> AA-13, A1 -> A-1)
    if (normalized && !normalized.includes('-')) {
        // A~AD 다음에 숫자가 오는 패턴 찾기
        const match = normalized.match(/^(A[A-D]|[A-Z])(\d+)$/);
        if (match) {
            normalized = `${match[1]}-${match[2]}`;
        }
    }

    // 중복 하이픈 제거
    normalized = normalized.replace(/--+/g, '-');

    return normalized;
}

/**
 * 위치 코드 유효성 검증
 */
function isValidLocationCode(value = '') {
    return LOCATION_CODE_REGEX.test(value);
}

/**
 * 위치 코드 입력 필드에 이벤트 핸들러 연결
 */
function attachLocationInputHandlers(inputEl) {
    if (!inputEl) return;

    // 툴팁 엘리먼트 생성
    let tooltip = inputEl.parentElement.querySelector('.location-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'location-tooltip';
        tooltip.style.cssText = `
            position: absolute;
            background: #333;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 11px;
            white-space: nowrap;
            z-index: 10000;
            display: none;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            pointer-events: none;
        `;
        tooltip.innerHTML = '형식 오류: A~AD 구역과 1~32 행을 하이픈(-)으로 구분해주세요. 예: A-1, AD-32';

        // 화살표 추가
        const arrow = document.createElement('div');
        arrow.style.cssText = `
            position: absolute;
            bottom: -4px;
            left: 20px;
            width: 0;
            height: 0;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-top: 5px solid #333;
        `;
        tooltip.appendChild(arrow);

        document.body.appendChild(tooltip);
    }

    function showTooltip() {
        const rect = inputEl.getBoundingClientRect();
        tooltip.style.left = rect.left + 'px';
        tooltip.style.top = (rect.top - tooltip.offsetHeight - 8) + 'px';
        tooltip.style.display = 'block';
    }

    function hideTooltip() {
        tooltip.style.display = 'none';
    }

    inputEl.addEventListener('input', function () {
        this.value = normalizeLocationCode(this.value);
        hideTooltip();
    });

    inputEl.addEventListener('blur', function () {
        this.value = normalizeLocationCode(this.value);
        if (this.value && !isValidLocationCode(this.value)) {
            showTooltip();
            this.style.borderColor = '#d32f2f';

            // 2초 후 자동으로 값 초기화 및 툴팁 숨김
            setTimeout(() => {
                this.value = '';
                this.style.borderColor = '';
                hideTooltip();
            }, 2000);
        } else {
            this.style.borderColor = '';
            hideTooltip();
        }
    });

    inputEl.addEventListener('focus', function () {
        this.style.borderColor = '';
        hideTooltip();
    });
}

// ==========================================
// 배치도 열기/닫기 및 초기화
// ==========================================

/**
 * 배치도 열기 / 닫기 이벤트 리스너
 */
document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggleGridBtn');
    const refreshBtn = document.getElementById('refreshGridBtn');

    if (toggleBtn) toggleBtn.addEventListener('click', toggleGrid);
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            const grid = document.getElementById('grid');
            if (!grid || !grid.children.length) {
                // 🟦 grid가 아직 없으면 생성 먼저
                console.warn('⚠️ 배치도가 아직 생성되지 않아 자동 생성 후 불러옵니다.');
                generateGrid();
                gridInitialized = true;
                setTimeout(loadPartLocations, 300);
            } else {
                loadPartLocations();
            }
        });
    }

});

/**
 * 배치도 토글
 */
async function toggleGrid() {
    const container = document.getElementById('gridContainer');
    const btn = document.getElementById('toggleGridBtn');
    if (!container || !btn) return;

    if (container.style.display === 'none') {
        container.style.display = 'block';
        btn.textContent = '배치도 닫기';

        // 🟦 배치도 처음 열 때 셀 생성 후 불러오기
        if (!gridInitialized) {
            generateGrid();
            gridInitialized = true;
        }

        // 🟦 grid가 생성된 다음에 약간의 딜레이 후 불러오기
        setTimeout(loadPartLocations, 300);
    } else {
        container.style.display = 'none';
        btn.textContent = '배치도 열기';
    }
}

// ==========================================
// 그리드 생성 함수
// ==========================================

/**
 * A~AD 라벨 생성
 */
function generateColumnLabels() {
    const labels = [];
    for (let i = 0; i < 30; i++) {
        labels.push(i < 26 ? String.fromCharCode(65 + i) : 'A' + String.fromCharCode(65 + i - 26));
    }
    return labels;
}

/**
 * 배치도 그리드 생성
 */
function generateGrid() {
    const columns = generateColumnLabels();
    const rows = 32;
    const grid = document.getElementById('grid');
    if (!grid) return;

    grid.innerHTML = '';

    // 상단 헤더 (맨 왼쪽 빈칸 + A~AD)
    grid.appendChild(document.createElement('div'));
    columns.forEach(c => {
        const div = document.createElement('div');
        div.className = 'header-cell';
        div.textContent = c;
        grid.appendChild(div);
    });

    // 행 + 셀 생성
    for (let y = 1; y <= rows; y++) {
        const side = document.createElement('div');
        side.className = 'side-cell';
        side.textContent = y;
        grid.appendChild(side);

        columns.forEach(x => {
            const cell = document.createElement('div');
            const code = `${x}-${y}`;
            cell.className = 'cell';
            cell.dataset.code = code;
            cell.textContent = code;
            cell.addEventListener('click', () => onCellClick(cell));
            grid.appendChild(cell);
        });
    }
}

// ==========================================
// 셀 클릭 및 부품 등록
// ==========================================

/**
 * 셀 클릭 시 부품 등록 확인
 */
function onCellClick(cell) {
    if (!selectedPart) {
        showMessage('먼저 재고현황에서 부품을 선택하세요.', 'error');
        return;
    }

    const code = cell.dataset.code;

    const confirmBox = document.createElement('div');
    confirmBox.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: #fff; padding: 20px; border: 1px solid #ccc;
        border-radius: 5px; box-shadow: 0 2px 6px rgba(0,0,0,0.2); z-index: 9999;
    `;
    confirmBox.innerHTML = `
        <p><strong>${code}</strong> 위치에<br><strong>${selectedPart.partName}</strong> 부품을 등록하시겠습니까?</p>
        <div style="margin-top:10px; text-align:right;">
            <button id="confirmYes" class="btn">등록</button>
            <button id="confirmNo" class="btn btn-gray">취소</button>
        </div>
    `;
    document.body.appendChild(confirmBox);

    document.getElementById('confirmYes').addEventListener('click', async () => {
        await registerPartToLocation(code, selectedPart);
        document.body.removeChild(confirmBox);
    });

    document.getElementById('confirmNo').addEventListener('click', () => {
        document.body.removeChild(confirmBox);
    });
}

/**
 * DB에 위치 등록 + 셀 즉시 반영
 */
async function registerPartToLocation(locationCode, part) {
    try {
        const [posX, posYRaw] = locationCode.split('-');
        const posY = parseInt(posYRaw);

        const response = await fetch('/livewalk/part-location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                locationCode,
                partName: part.partName,
                partNumber: part.partNumber,
                posX,
                posY
            })
        });

        const message = await response.text();
        if (response.ok) {
            showMessage(`✅ ${message}`, 'success');

            // 현재 화면 셀 즉시 업데이트
            const cell = document.querySelector(`.cell[data-code="${locationCode}"]`);
            if (cell) {
                cell.innerHTML = `${locationCode}<br><strong>${part.partName}</strong>`;
                cell.style.backgroundColor = '#d7eaff';
                cell.style.color = '#004578';
            }
        } else {
            showMessage(`❌ 등록 실패: ${message}`, 'error');
        }
    } catch (err) {
        showMessage(`서버 오류: ${err.message}`, 'error');
    }
}

// ==========================================
// 배치도 불러오기 및 표시
// ==========================================

/**
 * 저장된 배치도 불러오기
 */
async function loadPartLocations() {
    try {
        const res = await fetch('/livewalk/part-location');
        if (!res.ok) throw new Error('데이터 조회 실패');
        const locations = await res.json();

        console.log("📦 받은 데이터:", locations);

        // 셀 초기화
        document.querySelectorAll('.cell').forEach(c => {
            c.innerHTML = c.dataset.code;
            c.style.backgroundColor = 'white';
            c.style.color = 'black';
        });

        // 등록된 위치 표시
        locations.forEach(loc => {
            const code = (loc.locationCode || '').trim();
            const name = (loc.partName || '').trim();
            const number = (loc.partNumber || '').trim();

            const cell = Array.from(document.querySelectorAll('.cell'))
                .find(c => (c.dataset.code || '').trim() === code);

            if (cell) {
                const shortName = name.length > 10 ? name.substring(0, 10) + '…' : name;
                const shortNumber = number.length > 8 ? number.substring(0, 8) + '…' : number;
                cell.innerHTML = `<strong>${shortName}</strong><span style="font-size:10px;">${shortNumber}</span>`;
                cell.style.backgroundColor = '#d7eaff';
                cell.style.color = '#004578';
            } else {
                console.warn('⚠️ 셀을 찾을 수 없습니다:', code);
            }
        });

        showMessage(`📦 등록된 위치 ${locations.length}건 불러옴`, 'info');
    } catch (err) {
        showMessage('배치도 불러오기 오류: ' + err.message, 'error');
    }
}

// ==========================================
// 배치도 검색
// ==========================================

/**
 * 배치도 검색
 */
function searchGrid() {
    const keyword = document.getElementById('gridSearchInput').value.trim();

    if (!keyword) {
        showMessage('검색어를 입력하세요', 'info');
        return;
    }

    // 모든 셀 초기화
    document.querySelectorAll('.cell').forEach(cell => {
        cell.style.border = '1px solid #ccc';
    });

    let foundCount = 0;

    // 검색어와 일치하는 셀 강조
    document.querySelectorAll('.cell').forEach(cell => {
        const innerHTML = cell.innerHTML.toLowerCase();
        if (innerHTML.includes(keyword.toLowerCase())) {
            cell.style.border = '3px solid #ff6600';
            cell.style.boxShadow = '0 0 10px rgba(255, 102, 0, 0.5)';
            foundCount++;
        }
    });

    if (foundCount > 0) {
        showMessage(`${foundCount}개 위치 발견`, 'success');
    } else {
        showMessage('검색 결과가 없습니다', 'info');
    }
}

/**
 * 배치도 검색 초기화
 */
function clearGridSearch() {
    document.getElementById('gridSearchInput').value = '';
    document.querySelectorAll('.cell').forEach(cell => {
        cell.style.border = '1px solid #ccc';
        cell.style.boxShadow = 'none';
    });
    showMessage('검색 초기화', 'info');
}

// ==========================================
// 부품 위치 모달 관련 함수
// ==========================================

/**
 * 부품 위치 모달 열기
 */
async function openLocationModal(partNumber) {
    try {
        // 부품 위치 정보 조회
        const response = await fetch(`/livewalk/part-locations/part?partNumber=${encodeURIComponent(partNumber)}`);
        if (!response.ok) {
            showMessage('부품 위치 정보를 찾을 수 없습니다.', 'error');
            return;
        }

        const location = await response.json();
        const locationCode = location.locationCode;

        if (!locationCode) {
            showMessage('등록된 위치 정보가 없습니다.', 'info');
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

        // 배치도 모달 열기 (mapSpotModal 재사용)
        const modal = document.getElementById('mapSpotModal');
        modal.style.display = 'block';
        setupMapSpotCanvasClick();

        // 모달 제목 변경 (배치 위치와 부품명을 다른 색상으로 구분)
        const titleEl = modal.querySelector('h3');
        if (titleEl) {
            titleEl.innerHTML = `부품 위치: <span style="color: #007bff; font-weight: bold;">${locationCode}</span> <span style="color: #666;">(${location.partName || partNumber})</span>`;
        }

        // 배치도 선택 드롭다운 및 설명 숨기기
        const selectContainer = modal.querySelector('[for="mapSpotSelect"]')?.parentElement;
        if (selectContainer) {
            selectContainer.style.display = 'none';
        }
        const descriptionDiv = modal.querySelector('div[style*="margin-bottom: 12px"]');
        if (descriptionDiv && descriptionDiv.textContent.includes('배치도를 선택')) {
            descriptionDiv.style.display = 'none';
        }

        // 배치도 목록 로드 후 해당 층 선택
        await loadMapSpotImages();

        // 층 번호가 포함된 이미지 찾기
        const floorImage = mapSpotImagesCache.find(img =>
            img.title && img.title.includes(floor + '층')
        );

        if (floorImage) {
            // 해당 층 이미지 선택 (UI 업데이트 없이)
            await handleMapSpotSelect(floorImage.imageId);

            // 구역에 해당하는 마커 강조 표시
            highlightZoneMarker(zone);
        } else {
            showMessage(`${floor}층 배치도를 찾을 수 없습니다.`, 'error');
        }

    } catch (error) {
        showMessage('배치도 조회 오류: ' + error.message, 'error');
    }
}

/**
 * 32x30 배치도 그리드 생성
 * 세로: 숫자 (1-32)
 * 가로: 영어 (A-Z, AA-AD) - 30개
 */
function createLocationGrid(highlightLocation) {
    const container = document.getElementById('locationGridContainer');
    const rows = 32;  // 세로 (숫자)
    const cols = 30;  // 가로 (영어)

    let html = '<table style="border-collapse: collapse; margin: 0 auto;">';

    // 가로 레이블 (A-Z, AA-AD) - 30개
    const colLabels = [];
    for (let i = 0; i < cols; i++) {
        if (i < 26) {
            colLabels.push(String.fromCharCode(65 + i)); // A-Z
        } else {
            colLabels.push('A' + String.fromCharCode(65 + (i - 26))); // AA
        }
    }

    // 헤더 (가로 - 영어)
    html += '<tr><th style="border: 1px solid #ddd; padding: 5px; background: #f5f5f5; min-width: 30px;"></th>';
    for (let col = 0; col < cols; col++) {
        html += `<th style="border: 1px solid #ddd; padding: 5px; background: #f5f5f5; min-width: 30px; font-size: 12px;">${colLabels[col]}</th>`;
    }
    html += '</tr>';

    // 행 생성 (세로 - 숫자 1-32)
    for (let row = 1; row <= rows; row++) {
        html += '<tr>';
        html += `<th style="border: 1px solid #ddd; padding: 5px; background: #f5f5f5; font-size: 12px;">${row}</th>`;

        for (let col = 0; col < cols; col++) {
            const cellLocation = `${colLabels[col]}-${row}`;
            const isHighlight = cellLocation === highlightLocation;

            const bgColor = isHighlight ? '#ff6600' : '#fff';
            const textColor = isHighlight ? '#fff' : '#333';
            const fontWeight = isHighlight ? 'bold' : 'normal';
            const fontSize = isHighlight ? '14px' : '11px';

            html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center; background: ${bgColor}; color: ${textColor}; font-weight: ${fontWeight}; font-size: ${fontSize}; min-width: 40px; min-height: 30px;">`;
            if (isHighlight) {
                html += cellLocation;
            }
            html += '</td>';
        }

        html += '</tr>';
    }

    html += '</table>';

    container.innerHTML = html;
}

/**
 * 배치도 모달 닫기
 */
function closeLocationGridModal() {
    document.getElementById('locationGridModal').style.display = 'none';
}

// ==========================================
// 배치도 모달 ESC 키로 닫기
// ==========================================
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' || event.key === 'Esc') {
        const modal = document.getElementById('locationGridModal');
        if (modal && modal.style.display === 'block') {
            closeLocationGridModal();
        }
    }
});
