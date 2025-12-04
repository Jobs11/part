// ==================== 유틸리티 함수 ====================

// Enter 키 검색 활성화
function enableEnterKeySearch(inputId, callback) {
    const inputEl = document.getElementById(inputId);
    if (!inputEl || typeof callback !== 'function') return;

    inputEl.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            callback();
        }
    });
}

// 위치 코드 정규화
function normalizeLocationCode(value = '') {
    // 먼저 대문자 변환 및 허용된 문자만 남기기
    let normalized = value
        .toUpperCase()
        .replace(/[^A-Z0-9-]/g, '');

    // 하이픈이 없는 경우 자동으로 삽입 시도 (예: AA13 -> AA-13, A1 -> A-1)
    if (normalized && !normalized.includes('-')) {
        // A~AA 다음에 숫자가 오는 패턴 찾기
        const match = normalized.match(/^(AA|[A-Z])(\d+)$/);
        if (match) {
            normalized = `${match[1]}-${match[2]}`;
        }
    }

    // 중복 하이픈 제거
    normalized = normalized.replace(/--+/g, '-');

    return normalized;
}

// 위치 코드 유효성 검사
function isValidLocationCode(value = '') {
    return LOCATION_CODE_REGEX.test(value);
}

// 위치 입력 핸들러 부착
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
        tooltip.innerHTML = '형식 오류: A~AA 구역과 1~32 행을 하이픈(-)으로 구분해주세요. 예: A-1, AA-32';

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

// 날짜 포맷
function formatDate(dateString) {
    if (!dateString) return '-';
    return dateString;
}

// 날짜시간 포맷
function formatDateTime(dateString) {
    if (!dateString) return '-';
    return dateString;
}

// 숫자 포맷
function formatNumber(number) {
    if (!number) return '0';
    return Number(number).toLocaleString('ko-KR');
}

// 파일 크기 포맷
function formatFileSize(bytes) {
    if (bytes === null || bytes === undefined || isNaN(bytes)) return '-';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = Number(bytes);
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    const formatted = unitIndex === 0 ? size.toFixed(0) : size.toFixed(1);
    return `${formatted} ${units[unitIndex]}`;
}

// HTML 이스케이프
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/'/g, '&#39;');
}

// 메시지 표시
function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';

    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 3000);
}

// 검색 패널 토글
function toggleSearchPanel(panelId, buttonElement) {
    const panel = document.getElementById(panelId);

    if (panel.style.display === 'none' || panel.style.display === '') {
        panel.style.display = 'block';
        buttonElement.textContent = '검색 ▲';
    } else {
        panel.style.display = 'none';
        buttonElement.textContent = '검색 ▼';
    }
}

// 로그아웃
function logout() {
    window.location.href = '/livewalk/logout';
}

// 파일 다운로드 함수
function downloadFile(url, fileName, fallbackName = 'file') {
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('파일 다운로드 실패');
            }
            return response.blob();
        })
        .then(blob => {
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = fileName || fallbackName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
        })
        .catch(error => {
            console.error('다운로드 오류:', error);
            alert('파일 다운로드에 실패했습니다.');
        });
}

// 이미지 다운로드 함수
function downloadImage(url, fileName) {
    downloadFile(url, fileName, 'image.jpg');
}
