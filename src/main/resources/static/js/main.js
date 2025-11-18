const INCOMING_API = '/livewalk/incoming';
const USAGE_API = '/livewalk/part-usage';
const CATEGORY_API = '/livewalk/categories';
const LOCATION_CODE_REGEX = /^(?:[A-Z]|AA)-(?:[1-9]|[12]\d|3[0-2])$/;

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

function isValidLocationCode(value = '') {
    return LOCATION_CODE_REGEX.test(value);
}

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

let categoriesData = [];
let inventoryData = [];
let currentInventorySearchKeyword = '';
let currentInventorySearchColumn = '';
let currentIncomingSortColumn = null;
let currentIncomingSortOrder = 'asc';
let currentUsageSortColumn = null;
let currentUsageSortOrder = 'asc';
let currentInventorySortColumn = null;
let currentInventorySortOrder = 'asc';

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function () {
    const incomingForm = document.getElementById('incomingForm');
    const usageForm = document.getElementById('usageForm');
    const purchaseDateEl = document.getElementById('purchaseDate');
    const usedDateEl = document.getElementById('usedDate');
    const categoryIdEl = document.getElementById('categoryId');

    if (incomingForm) incomingForm.addEventListener('submit', registerIncoming);
    if (usageForm) usageForm.addEventListener('submit', registerUsage);

    if (purchaseDateEl) purchaseDateEl.value = new Date().toISOString().split('T')[0];
    if (usedDateEl) usedDateEl.value = new Date().toISOString().split('T')[0];

    if (categoryIdEl) categoryIdEl.addEventListener('change', onCategoryChange);

    // 환율 자동 계산 이벤트 리스너
    const originalPriceEl = document.getElementById('originalPrice');
    const exchangeRateEl = document.getElementById('exchangeRate');
    if (originalPriceEl) originalPriceEl.addEventListener('input', calculateKRW);
    if (exchangeRateEl) exchangeRateEl.addEventListener('input', calculateKRW);

    // 통화 변경 시 환율 자동 조회
    const currencyEl = document.getElementById('currency');
    if (currencyEl) {
        currencyEl.addEventListener('change', async function () {
            const currency = this.value;
            const exchangeRateGroup = document.getElementById('exchangeRateGroup');
            const originalPriceGroup = document.getElementById('originalPriceGroup');
            const exchangeRateInput = document.getElementById('exchangeRate');

            if (currency === 'KRW') {
                if (exchangeRateGroup) exchangeRateGroup.style.display = 'none';
                if (originalPriceGroup) originalPriceGroup.style.display = 'none';
            } else {
                if (exchangeRateGroup) exchangeRateGroup.style.display = 'flex';
                if (originalPriceGroup) originalPriceGroup.style.display = 'flex';

                // 환율 자동 조회
                try {
                    const response = await fetch(`/livewalk/exchange-rate/${currency}`);
                    if (response.ok) {
                        const rate = await response.json();
                        if (exchangeRateInput) exchangeRateInput.value = rate;
                        showMessage(`${currency} 환율: ${rate}`, 'info');
                        calculateKRW(); // 환율 조회 후 자동 계산
                    }
                } catch (error) {
                    showMessage('환율 조회 실패', 'error');
                }
            }
        });
    }

    // 데이터 로드
    loadCategories().then(() => {
        // 카테고리 로드 후 입고 등록 테이블 초기 행 생성
        addBulkRow();
    });
    loadAllIncoming();
    loadInventory();
    loadLowStock();
    loadAllUsage();

    enableEnterKeySearch('incomingSearchInput', searchIncoming);
    enableEnterKeySearch('usageSearchInput', searchUsage);
    enableEnterKeySearch('inventorySearchInput', searchInventory);
    enableEnterKeySearch('gridSearchInput', searchGrid);
});

// ==================== 카테고리 관련 ====================
async function loadCategories() {
    try {
        const response = await fetch(CATEGORY_API);
        if (!response.ok) throw new Error('카테고리 조회 실패');

        categoriesData = await response.json();

        const select = document.getElementById('categoryId');
        if (select) {
            select.innerHTML = '<option value="">선택하세요</option>';

            categoriesData.forEach(category => {
                const option = document.createElement('option');
                option.value = category.categoryId;
                option.textContent = `${category.categoryName} (${category.categoryCode})`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        showMessage('카테고리 조회 오류: ' + error.message, 'error');
    }
}

async function onCategoryChange() {
    const categoryIdEl = document.getElementById('categoryId');
    const partNumberEl = document.getElementById('partNumber');

    if (!categoryIdEl) return;

    const categoryId = categoryIdEl.value;
    if (!categoryId) {
        if (partNumberEl) partNumberEl.value = '';
        return;
    }

    try {
        const response = await fetch(`${CATEGORY_API}/${categoryId}`);
        if (!response.ok) throw new Error('카테고리 조회 실패');

        const category = await response.json();
        const nextNumber = category.lastNumber + 1;
        const previewPartNumber = `${category.categoryCode}-${String(nextNumber).padStart(4, '0')}`;

        if (partNumberEl) partNumberEl.value = previewPartNumber + ' (미리보기)';
    } catch (error) {
        showMessage('부품번호 미리보기 오류: ' + error.message, 'error');
    }
}

// ==================== 입고 등록 ====================
async function registerIncoming(e) {
    e.preventDefault();

    const categoryId = parseInt(document.getElementById('categoryId').value);
    const currency = document.getElementById('currency').value;

    const incomingData = {
        categoryId: categoryId,
        partName: document.getElementById('partName').value,
        description: document.getElementById('description').value,
        unit: document.getElementById('unit').value,
        incomingQuantity: parseInt(document.getElementById('incomingQuantity').value),
        purchasePrice: parseFloat(document.getElementById('purchasePrice').value),
        currency: currency,
        purchaseDate: document.getElementById('purchaseDate').value,
        note: document.getElementById('note').value,
        createdBy: 'system'
    };

    if (currency !== 'KRW') {
        incomingData.exchangeRate = parseFloat(document.getElementById('exchangeRate').value);
        incomingData.originalPrice = parseFloat(document.getElementById('originalPrice').value);
    }

    try {
        const response = await fetch(INCOMING_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(incomingData)
        });

        const message = await response.text();

        if (response.ok) {
            showMessage(message, 'success');
            clearIncomingForm();
            loadAllIncoming();
            loadInventory();
            loadLowStock();
        } else {
            showMessage(message, 'error');
        }
    } catch (error) {
        showMessage('서버 연결 오류: ' + error.message, 'error');
    }
}

function clearIncomingForm() {
    document.getElementById('incomingForm').reset();
    document.getElementById('partNumber').value = '';
    document.getElementById('unit').value = 'EA';
    document.getElementById('currency').value = 'KRW';
    document.getElementById('purchaseDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('exchangeRateGroup').style.display = 'none';
    document.getElementById('originalPriceGroup').style.display = 'none';
}

// ==================== 입고 리스트 조회 ====================
async function loadAllIncoming() {
    // 검색어만 초기화 (선택한 컬럼은 유지)
    document.getElementById('incomingSearchInput').value = '';
    currentIncomingSearchKeyword = '';

    try {
        const response = await fetch(INCOMING_API);
        if (!response.ok) throw new Error('데이터 조회 실패');

        const incomingList = await response.json();
        await displayIncomingList(incomingList);
    } catch (error) {
        showMessage('입고 리스트 조회 오류: ' + error.message, 'error');
    }
}
let currentIncomingSearchKeyword = ''; // 전역 변수 추가
let currentIncomingSearchColumn = ''; // 선택된 컬럼

// 입고 리스트 컬럼 선택
function selectIncomingSearchColumn(column, element) {
    currentIncomingSearchColumn = column;

    // 모든 헤더의 선택 표시 제거
    document.querySelectorAll('#incomingTable th').forEach(th => {
        th.style.backgroundColor = '';
        th.style.fontWeight = '';
    });

    // 선택된 컬럼 표시
    if (element) {
        element.style.backgroundColor = '#e3f2fd';
        element.style.fontWeight = 'bold';
    }

    // 사용자에게 피드백
    const columnNames = {
        'category_name': '카테고리',
        'part_number': '부품번호',
        'part_name': '부품명',
        'description': '설명',
        'note': '비고',
        'incoming_quantity': '입고수량',
        'purchase_price': '구매금액',
        'purchase_date': '구매일자',
        'created_at': '등록일'
    };
    showMessage(`검색 컬럼: ${columnNames[column]} - 검색어를 입력하고 검색 버튼을 누르세요.`, 'info');
}

// 특정 컬럼으로 검색 (이전 방식 - 즉시 검색)
async function searchIncomingByColumn(column) {
    const searchTerm = document.getElementById('incomingSearchInput').value.trim();

    currentIncomingSortColumn = column;
    currentIncomingSortOrder = 'asc';

    // 모든 헤더의 선택 표시 제거
    document.querySelectorAll('#incomingTable th').forEach(th => {
        th.style.backgroundColor = '';
        th.style.fontWeight = '';
    });

    // 클릭된 컬럼 강조
    const headers = document.querySelectorAll('#incomingTable th');
    const columnIndex = {
        'description': 3,
        'note': 9
    };
    if (columnIndex[column] !== undefined && headers[columnIndex[column]]) {
        headers[columnIndex[column]].style.backgroundColor = '#e3f2fd';
        headers[columnIndex[column]].style.fontWeight = 'bold';
    }

    if (!searchTerm) {
        showMessage('검색어를 입력하세요.', 'warning');
        return;
    }

    try {
        const response = await fetch(`${INCOMING_API}/search-advanced?keyword=${encodeURIComponent(searchTerm)}&column=${column}`);
        if (!response.ok) throw new Error('검색 실패');

        const incomingList = await response.json();
        await displayIncomingList(incomingList);
        showMessage(`${column} 컬럼에서 ${incomingList.length}개 검색됨`, 'info');
    } catch (error) {
        showMessage('검색 오류: ' + error.message, 'error');
    }
}

async function searchIncoming() {
    const searchTerm = document.getElementById('incomingSearchInput').value.trim();
    currentIncomingSearchKeyword = searchTerm; // 검색어 저장

    if (!searchTerm) {
        loadAllIncoming();
        return;
    }

    try {
        // 백엔드가 keyword에서 + - 를 자동으로 파싱하므로 원본 그대로 전달
        const column = currentIncomingSearchColumn || '';
        const url = `${INCOMING_API}/search-advanced?keyword=${encodeURIComponent(searchTerm)}&column=${column}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('검색 실패');

        const incomingList = await response.json();
        await displayIncomingList(incomingList);
        showMessage(`${incomingList.length}개 검색됨`, 'info');
    } catch (error) {
        showMessage('검색 오류: ' + error.message, 'error');
    }
}

async function sortIncomingTable(column) {
    const searchTerm = document.getElementById('incomingSearchInput').value.trim();

    if (currentIncomingSortColumn === column) {
        currentIncomingSortOrder = currentIncomingSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        currentIncomingSortColumn = column;
        currentIncomingSortOrder = 'asc';
    }

    // 모든 정렬 가능한 컬럼은 검색 컬럼으로도 등록
    currentIncomingSearchColumn = column;

    // 모든 헤더의 선택 표시 제거
    document.querySelectorAll('#incomingTable th').forEach(th => {
        th.style.backgroundColor = '';
        th.style.fontWeight = '';
    });

    // 클릭된 컬럼 강조
    const headers = document.querySelectorAll('#incomingTable th');
    const columnIndex = {
        'category_name': 0,
        'part_number': 1,
        'part_name': 2,
        'description': 3,
        'incoming_quantity': 4,
        'purchase_price': 6,
        'purchase_date': 7,
        'created_at': 8,
        'note': 9
    };
    if (columnIndex[column] !== undefined && headers[columnIndex[column]]) {
        headers[columnIndex[column]].style.backgroundColor = '#e3f2fd';
        headers[columnIndex[column]].style.fontWeight = 'bold';
    }

    let endpoint;

    if (searchTerm) {
        // 검색어 있으면 전체 검색 + 정렬 (column 파라미터는 정렬용이므로 빈 문자열로)
        // currentIncomingSearchColumn이 설정되어 있으면 그 컬럼으로 검색, 아니면 전체 검색
        const searchColumn = currentIncomingSearchColumn || '';
        endpoint = `${INCOMING_API}/search-advanced?keyword=${encodeURIComponent(searchTerm)}&column=${searchColumn}&sortColumn=${column}&order=${currentIncomingSortOrder}`
    } else {
        // 검색어 없으면 전체 정렬
        endpoint = `${INCOMING_API}/sort?column=${column}&order=${currentIncomingSortOrder}`;
    }

    try {
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('정렬 실패');

        const incomingList = await response.json();
        await displayIncomingList(incomingList);
        showMessage(`${column} 기준 ${currentIncomingSortOrder === 'asc' ? '오름차순' : '내림차순'} 정렬`, 'info');
    } catch (error) {
        showMessage('정렬 오류: ' + error.message, 'error');
    }
}

async function displayIncomingList(incomingList) {
    const tbody = document.getElementById('incomingTableBody');

    if (incomingList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" style="text-align: center;">입고 내역이 없습니다.</td></tr>';
        return;
    }

    // 각 항목의 사진 개수 조회
    const rowsPromises = incomingList.map(async (incoming) => {
        let imageCount = 0;
        try {
            const response = await fetch(`/livewalk/part-images/incoming/${incoming.incomingId}`);
            if (response.ok) {
                const images = await response.json();
                imageCount = images.length;
            }
        } catch (error) {
            console.error('사진 개수 조회 오류:', error);
        }

        return `
            <tr data-incoming-id="${incoming.incomingId}">
                <td class="editable" ondblclick="makeIncomingEditable(event, ${incoming.incomingId}, 'categoryId', ${incoming.categoryId}, null, '${escapeHtml(incoming.categoryName || '')}')">${incoming.categoryName || '-'}</td>
                <td class="editable" ondblclick="makeIncomingEditable(event, ${incoming.incomingId}, 'partNumber', '${escapeHtml(incoming.partNumber || '')}')">${incoming.partNumber || '-'}</td>
                <td class="editable" ondblclick="makeIncomingEditable(event, ${incoming.incomingId}, 'partName', '${escapeHtml(incoming.partName)}')">${incoming.partName || '-'}</td>
                <td class="editable" ondblclick="makeIncomingEditable(event, ${incoming.incomingId}, 'description', '${escapeHtml(incoming.description || '')}')">${incoming.description || '-'}</td>
                <td class="editable" ondblclick="makeIncomingEditable(event, ${incoming.incomingId}, 'incomingQuantity', ${incoming.incomingQuantity})">${incoming.incomingQuantity}</td>
                <td>${incoming.unit || '-'}</td>
                <td class="editable" ondblclick="makeIncomingEditable(event, ${incoming.incomingId}, 'purchasePrice', ${incoming.purchasePrice})">${formatNumber(incoming.purchasePrice)} 원</td>
                <td class="editable" ondblclick="makeIncomingEditable(event, ${incoming.incomingId}, 'purchaseDate', '${incoming.purchaseDate}')">${formatDate(incoming.purchaseDate)}</td>
                <td>${formatDateTime(incoming.createdAt)}</td>
                <td class="editable" ondblclick="makeIncomingEditable(event, ${incoming.incomingId}, 'note', '${escapeHtml(incoming.note || '')}')">${incoming.note || '-'}</td>
                <td><button class="btn-small" onclick="openImageModal(${incoming.incomingId})">📷 ${imageCount > 0 ? imageCount + '장' : '사진'}</button></td>
                <td><button class="btn-small" data-part-number="${escapeHtml(incoming.partNumber)}" onclick="openLocationModal(this.dataset.partNumber)">📍 배치도</button></td>
            </tr>
        `;
    });

    const rows = await Promise.all(rowsPromises);
    tbody.innerHTML = rows.join('');
}

// 입고 셀 편집
function makeIncomingEditable(event, incomingId, field, currentValue, exchangeRate, displayValue) {
    event.stopPropagation();
    const cell = event.target;
    const originalValue = currentValue;
    const originalDisplayValue = displayValue || currentValue;
    const storedExchangeRate = exchangeRate; // originalPrice 수정 시 필요한 환율

    if (cell.querySelector('input') || cell.querySelector('select')) return;

    let inputElement;

    if (field === 'categoryId') {
        // 카테고리는 select
        inputElement = document.createElement('select');
        let options = '<option value="">선택하세요</option>';
        categoriesData.forEach(category => {
            const selected = category.categoryId === currentValue ? 'selected' : '';
            options += `<option value="${category.categoryId}" ${selected}>${category.categoryName} (${category.categoryCode})</option>`;
        });
        inputElement.innerHTML = options;
    } else if (field === 'currency') {
        // 통화는 select
        inputElement = document.createElement('select');
        inputElement.innerHTML = `
            <option value="KRW" ${currentValue === 'KRW' ? 'selected' : ''}>KRW</option>
            <option value="USD" ${currentValue === 'USD' ? 'selected' : ''}>USD</option>
            <option value="JPY" ${currentValue === 'JPY' ? 'selected' : ''}>JPY</option>
            <option value="EUR" ${currentValue === 'EUR' ? 'selected' : ''}>EUR</option>
            <option value="CNY" ${currentValue === 'CNY' ? 'selected' : ''}>CNY</option>
        `;
    } else {
        inputElement = document.createElement('input');
        inputElement.type =
            field === 'incomingQuantity' || field === 'purchasePrice' || field === 'originalPrice' ? 'number' :
                field === 'purchaseDate' ? 'date' : 'text';

        if (field === 'purchaseDate' && currentValue) {
            inputElement.value = currentValue;
        } else {
            inputElement.value = (currentValue === '-' || !currentValue) ? '' : currentValue;
        }

        if (field === 'purchasePrice' || field === 'originalPrice') {
            inputElement.step = '0.01';
        }
    }

    inputElement.style.width = '100%';
    inputElement.style.border = '2px solid #0078d4';
    inputElement.style.padding = '4px';

    cell.textContent = '';
    cell.appendChild(inputElement);
    inputElement.focus();
    if (inputElement.select) inputElement.select();

    const saveEdit = async () => {
        const newValue = field === 'categoryId' ? inputElement.value : inputElement.value.trim();

        if (newValue === String(originalValue) || (!newValue && !originalValue)) {
            if (field === 'categoryId') {
                cell.textContent = displayValue || '-';
            } else if (field === 'originalPrice') {
                cell.textContent = originalValue ? formatNumber(originalValue) : '-';
            } else {
                cell.textContent = originalValue || '-';
            }
            return;
        }

        try {
            // 전체 입고 데이터를 가져와서 수정
            const getResponse = await fetch(`${INCOMING_API}/${incomingId}`);
            if (!getResponse.ok) throw new Error('데이터 조회 실패');

            const currentData = await getResponse.json();

            // 수정할 필드만 업데이트
            const updatedData = { ...currentData };

            if (field === 'categoryId') {
                updatedData[field] = parseInt(newValue);
            } else if (field === 'incomingQuantity' || field === 'purchasePrice' || field === 'originalPrice') {
                updatedData[field] = parseFloat(newValue);

                // originalPrice 수정 시 purchasePrice도 자동 재계산
                if (field === 'originalPrice' && currentData.currency !== 'KRW') {
                    const newOriginalPrice = parseFloat(newValue);

                    // 최신 환율 조회
                    try {
                        const rateResponse = await fetch(`/livewalk/exchange-rate/${currentData.currency}`);
                        if (rateResponse.ok) {
                            const latestRate = await rateResponse.json();
                            updatedData.exchangeRate = latestRate;
                            updatedData.purchasePrice = newOriginalPrice * latestRate;
                            showMessage(`최신 환율(${currentData.currency}: ${latestRate}) 적용`, 'info');
                        } else {
                            // 환율 조회 실패 시 기존 환율 사용
                            updatedData.purchasePrice = newOriginalPrice * storedExchangeRate;
                            showMessage('기존 환율 사용 (최신 환율 조회 실패)', 'info');
                        }
                    } catch (error) {
                        // 환율 조회 실패 시 기존 환율 사용
                        updatedData.purchasePrice = newOriginalPrice * storedExchangeRate;
                        showMessage('기존 환율 사용 (환율 조회 오류)', 'info');
                    }
                }
            } else {
                updatedData[field] = newValue;
            }

            const response = await fetch(`${INCOMING_API}/${incomingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });

            if (response.ok) {
                // 모든 수정 후 리스트 전체 새로고침 (ondblclick 속성 값 갱신 위해)
                await loadAllIncoming();
                showMessage('수정 완료', 'success');
                loadInventory();
                loadLowStock();
            } else {
                const message = await response.text();
                if (field === 'originalPrice') {
                    cell.textContent = originalValue ? formatNumber(originalValue) : '-';
                } else {
                    cell.textContent = originalValue || '-';
                }
                showMessage('수정 실패: ' + message, 'error');
            }
        } catch (error) {
            if (field === 'originalPrice') {
                cell.textContent = originalValue ? formatNumber(originalValue) : '-';
            } else {
                cell.textContent = originalValue || '-';
            }
            showMessage('수정 오류: ' + error.message, 'error');
        }
    };

    inputElement.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveEdit();
    });
    inputElement.addEventListener('blur', saveEdit);
    inputElement.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (field === 'categoryId') {
                cell.textContent = displayValue || '-';
            } else if (field === 'purchaseDate') {
                cell.textContent = formatDate(originalValue);
            } else if (field === 'purchasePrice') {
                cell.textContent = formatNumber(originalValue) + ' 원';
            } else if (field === 'originalPrice') {
                cell.textContent = originalValue ? formatNumber(originalValue) : '-';
            } else {
                cell.textContent = originalValue || '-';
            }
        }
    });
}

// ==================== 재고 현황 조회 ====================
async function loadInventory() {
    // 검색어만 초기화 (선택한 컬럼은 유지)
    document.getElementById('inventorySearchInput').value = '';
    currentInventorySearchKeyword = '';

    try {
        const response = await fetch(`${INCOMING_API}/inventory`);
        if (!response.ok) throw new Error('재고 조회 실패');

        inventoryData = await response.json();
        displayInventory(inventoryData);
    } catch (error) {
        showMessage('재고 조회 오류: ' + error.message, 'error');
    }
}

// 재고 검색 (백엔드 고급 검색 연동)
async function searchInventory() {
    const searchTerm = document.getElementById('inventorySearchInput').value.trim();

    if (!searchTerm) {
        await loadInventory();
        return;
    }

    // currentInventorySearchColumn이 설정되어 있으면 그 컬럼으로 검색, 아니면 전체 검색
    await requestInventorySearch(searchTerm, currentInventorySearchColumn);
}

// 특정 컬럼 선택 (검색 버튼을 누를 때까지 대기)
function selectInventorySearchColumn(column, element) {
    currentInventorySearchColumn = column;

    // 모든 헤더의 선택 표시 제거
    document.querySelectorAll('#inventoryTable th').forEach(th => {
        th.style.backgroundColor = '';
        th.style.fontWeight = '';
    });

    // 선택된 컬럼 표시
    if (element) {
        element.style.backgroundColor = '#e3f2fd';
        element.style.fontWeight = 'bold';
    }

    // 사용자에게 피드백
    const columnNames = {
        'part_number': '부품번호',
        'part_name': '부품명',
        'category_name': '카테고리',
        'current_stock': '현재재고',
        'total_incoming': '총입고',
        'total_used': '총출고',
        'incoming_count': '입고횟수'
    };
    showMessage(`검색 컬럼: ${columnNames[column]} - 검색어를 입력하고 검색 버튼을 누르세요.`, 'info');
}

async function requestInventorySearch(searchTerm, column) {
    try {
        currentInventorySearchKeyword = searchTerm;
        currentInventorySearchColumn = column || '';

        const params = new URLSearchParams();
        params.append('keyword', searchTerm);
        if (column) {
            params.append('column', column);
        }

        const response = await fetch(`${INCOMING_API}/inventory/search-advanced?${params.toString()}`);
        if (!response.ok) throw new Error('검색 실패');

        inventoryData = await response.json();
        displayInventory(inventoryData);
        showMessage(`${inventoryData.length}개 검색됨`, 'info');
    } catch (error) {
        showMessage('검색 오류: ' + error.message, 'error');
    }
}

function sortInventoryTable(column) {
    if (currentInventorySortColumn === column) {
        currentInventorySortOrder = currentInventorySortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        currentInventorySortColumn = column;
        currentInventorySortOrder = 'asc';
    }

    // 모든 정렬 가능한 컬럼은 검색 컬럼으로도 등록
    currentInventorySearchColumn = column;

    // 모든 헤더의 선택 표시 제거
    document.querySelectorAll('#inventoryTable th').forEach(th => {
        th.style.backgroundColor = '';
        th.style.fontWeight = '';
    });

    // 클릭된 컬럼 강조
    const headers = document.querySelectorAll('#inventoryTable th');
    const columnIndex = {
        'part_number': 0,
        'part_name': 1,
        'category_name': 2,
        'current_stock': 3,
        'total_incoming': 5,
        'total_used': 6,
        'incoming_count': 7
    };
    if (columnIndex[column] !== undefined && headers[columnIndex[column]]) {
        headers[columnIndex[column]].style.backgroundColor = '#e3f2fd';
        headers[columnIndex[column]].style.fontWeight = 'bold';
    }

    const sortedData = [...inventoryData].sort((a, b) => {
        let valA = a[column];
        let valB = b[column];

        if (typeof valA === 'number' && typeof valB === 'number') {
            return currentInventorySortOrder === 'asc' ? valA - valB : valB - valA;
        }

        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();

        if (currentInventorySortOrder === 'asc') {
            return valA.localeCompare(valB);
        } else {
            return valB.localeCompare(valA);
        }
    });

    displayInventory(sortedData);
    showMessage(`${column} 기준 ${currentInventorySortOrder === 'asc' ? '오름차순' : '내림차순'} 정렬`, 'info');
}

function displayInventory(inventory) {
    const tbody = document.getElementById('inventoryTableBody');

    if (inventory.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">재고 데이터가 없습니다.</td></tr>';
        return;
    }

    tbody.innerHTML = inventory.map(item => `
        <tr class="clickable-row" onclick="selectPartForUsage('${item.part_number}', '${escapeHtml(item.part_name)}')">
            <td>${item.part_number}</td>
            <td>${item.part_name}</td>
            <td>${item.category_name || '-'}</td>
            <td><strong>${item.current_stock}</strong></td>
            <td>${item.unit || '-'}</td>
            <td>${item.total_incoming}</td>
            <td>${item.total_used}</td>
            <td>${item.incoming_count}</td>
        </tr>
    `).join('');
}

// ==================== 재고 부족 조회 ====================
async function loadLowStock() {
    try {
        const threshold = document.getElementById('lowStockThreshold').value || 10;

        const response = await fetch(`${INCOMING_API}/low-stock?threshold=${threshold}`);
        if (!response.ok) throw new Error('재고 부족 조회 실패');

        const lowStock = await response.json();
        displayLowStock(lowStock);
        showMessage(`${threshold}개 이하 부품: ${lowStock.length}건`, 'info');
    } catch (error) {
        showMessage('재고 부족 조회 오류: ' + error.message, 'error');
    }
}

function displayLowStock(lowStock) {
    const tbody = document.getElementById('lowStockTableBody');

    if (lowStock.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">재고 부족 부품이 없습니다.</td></tr>';
        return;
    }

    tbody.innerHTML = lowStock.map(item => `
        <tr class="low-stock">
            <td>${item.category_name || '-'}</td>
            <td>${item.part_number}</td>
            <td>${item.part_name}</td>
            <td><strong>${item.current_stock}</strong></td>
            <td>${item.unit || '-'}</td>
        </tr>
    `).join('');
}

// ==================== 출고 등록 ====================
let selectedPart = null; // 부품 배치도에서 쓸 선택된 부품 정보

function selectPartForUsage(partNumber, partName) {
    // 1) 출고 등록 폼 채우기
    document.getElementById('usagePartNumber').value = partNumber;
    document.getElementById('usagePartName').value = partName;

    // 2) 배치도용 선택 부품도 같이 저장
    selectedPart = { partNumber, partName };

    // 3) 선택된 부품 문구 갱신
    const display = document.getElementById('selectedPartDisplay');
    if (display) {
        display.textContent = `선택된 부품: ${partNumber} (${partName})`;
    }

    // 4) 원래 하던 입고 내역 조회 (출고용 incomingId 채우기)
    fetch(`${INCOMING_API}/part/${partNumber}`)
        .then(response => response.json())
        .then(incomingList => {
            if (incomingList.length > 0) {
                document.getElementById('usageIncomingId').value = incomingList[0].incomingId;
                showMessage(`부품 "${partNumber}"이(가) 선택되었습니다.`, 'info');
            } else {
                showMessage('입고 내역을 찾을 수 없습니다.', 'error');
            }
        })
        .catch(error => {
            showMessage('부품 선택 오류: ' + error.message, 'error');
        });
}

async function registerUsage(e) {
    e.preventDefault();

    const incomingId = document.getElementById('usageIncomingId').value;

    if (!incomingId) {
        showMessage('부품을 먼저 선택하세요. (재고 현황에서 행 클릭)', 'error');
        return;
    }

    const usageData = {
        incomingId: parseInt(incomingId),
        partNumber: document.getElementById('usagePartNumber').value,
        quantityUsed: parseInt(document.getElementById('quantityUsed').value),
        usageLocation: document.getElementById('usageLocation').value,
        usedDate: document.getElementById('usedDate').value,
        note: document.getElementById('usageNote').value,
        createdBy: 'system'
    };

    try {
        const response = await fetch(USAGE_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(usageData)
        });

        const message = await response.text();

        if (response.ok) {
            showMessage(message, 'success');
            clearUsageForm();
            loadInventory();
            loadLowStock();
            loadAllUsage();
        } else {
            showMessage(message, 'error');
        }
    } catch (error) {
        showMessage('서버 연결 오류: ' + error.message, 'error');
    }
}

function clearUsageForm() {
    document.getElementById('usageForm').reset();
    document.getElementById('usageIncomingId').value = '';
    document.getElementById('usagePartNumber').value = '';
    document.getElementById('usagePartName').value = '';
    document.getElementById('usedDate').value = new Date().toISOString().split('T')[0];
}

// ==================== 출고 내역 조회 ====================
async function loadAllUsage() {
    // 검색어만 초기화 (선택한 컬럼은 유지)
    document.getElementById('usageSearchInput').value = '';
    currentUsageSearchKeyword = '';

    try {
        const response = await fetch(USAGE_API);
        if (!response.ok) throw new Error('출고 내역 조회 실패');

        const usageList = await response.json();
        displayUsageList(usageList);
    } catch (error) {
        showMessage('출고 내역 조회 오류: ' + error.message, 'error');
    }
}

let currentUsageSearchKeyword = ''; // 전역 변수 추가
let currentUsageSearchColumn = ''; // 선택된 컬럼

// 출고 내역 컬럼 선택
function selectUsageSearchColumn(column, element) {
    currentUsageSearchColumn = column;

    // 모든 헤더의 선택 표시 제거
    document.querySelectorAll('#usageTable th').forEach(th => {
        th.style.backgroundColor = '';
        th.style.fontWeight = '';
    });

    // 선택된 컬럼 표시
    if (element) {
        element.style.backgroundColor = '#e3f2fd';
        element.style.fontWeight = 'bold';
    }

    // 사용자에게 피드백
    const columnNames = {
        'note': '비고'
    };
    showMessage(`검색 컬럼: ${columnNames[column]} - 검색어를 입력하고 검색 버튼을 누르세요.`, 'info');
}

// 출고 내역 컬럼으로 즉시 검색
async function searchUsageByColumn(column) {
    const searchTerm = document.getElementById('usageSearchInput').value.trim();

    // 모든 헤더의 선택 표시 제거
    document.querySelectorAll('#usageTable th').forEach(th => {
        th.style.backgroundColor = '';
        th.style.fontWeight = '';
    });

    // 클릭된 컬럼 강조
    const headers = document.querySelectorAll('#usageTable th');
    const columnIndex = {
        'note': 6
    };
    if (columnIndex[column] !== undefined && headers[columnIndex[column]]) {
        headers[columnIndex[column]].style.backgroundColor = '#e3f2fd';
        headers[columnIndex[column]].style.fontWeight = 'bold';
    }

    if (!searchTerm) {
        showMessage('검색어를 입력하세요.', 'warning');
        return;
    }

    try {
        const response = await fetch(`${USAGE_API}/search-advanced?keyword=${encodeURIComponent(searchTerm)}&column=${column}&order=asc`);
        if (!response.ok) throw new Error('검색 실패');

        const usageList = await response.json();
        displayUsageList(usageList);
        showMessage(`${column} 컬럼에서 ${usageList.length}개 검색됨`, 'info');
    } catch (error) {
        showMessage('검색 오류: ' + error.message, 'error');
    }
}

async function searchUsage() {
    const searchTerm = document.getElementById('usageSearchInput').value.trim();
    currentUsageSearchKeyword = searchTerm; // 검색어 저장

    if (!searchTerm) {
        loadAllUsage();
        return;
    }

    try {
        // currentUsageSearchColumn이 설정되어 있으면 그 컬럼으로 검색, 아니면 전체 검색
        const column = currentUsageSearchColumn || currentUsageSortColumn || '';
        const response = await fetch(`${USAGE_API}/search-advanced?keyword=${encodeURIComponent(searchTerm)}&column=${column}&order=${currentUsageSortOrder}`);
        if (!response.ok) throw new Error('검색 실패');

        const usageList = await response.json();
        displayUsageList(usageList);
        showMessage(`${usageList.length}개 검색됨`, 'info');
    } catch (error) {
        showMessage('검색 오류: ' + error.message, 'error');
    }
}

async function sortUsageTable(column) {
    const searchTerm = document.getElementById('usageSearchInput').value.trim();

    if (currentUsageSortColumn === column) {
        currentUsageSortOrder = currentUsageSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        currentUsageSortColumn = column;
        currentUsageSortOrder = 'asc';
    }

    // 모든 정렬 가능한 컬럼은 검색 컬럼으로도 등록
    currentUsageSearchColumn = column;

    // 모든 헤더의 선택 표시 제거
    document.querySelectorAll('#usageTable th').forEach(th => {
        th.style.backgroundColor = '';
        th.style.fontWeight = '';
    });

    // 클릭된 컬럼 강조
    const headers = document.querySelectorAll('#usageTable th');
    const columnIndex = {
        'used_date': 0,
        'part_number': 1,
        'part_name': 2,
        'quantity_used': 3,
        'usage_location': 5,
        'note': 6,
        'created_at': 7
    };
    if (columnIndex[column] !== undefined && headers[columnIndex[column]]) {
        headers[columnIndex[column]].style.backgroundColor = '#e3f2fd';
        headers[columnIndex[column]].style.fontWeight = 'bold';
    }

    let endpoint;

    if (searchTerm) {
        // 검색어가 있으면 고급 검색 + 정렬
        endpoint = `${USAGE_API}/search-advanced?keyword=${encodeURIComponent(searchTerm)}&column=${column}&order=${currentUsageSortOrder}`;
    } else {
        // 검색어 없으면 전체 정렬
        endpoint = `${USAGE_API}/sort?column=${column}&order=${currentUsageSortOrder}`;
    }

    try {
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('정렬 실패');

        const usageList = await response.json();
        displayUsageList(usageList);
        showMessage(`${column} 기준 ${currentUsageSortOrder === 'asc' ? '오름차순' : '내림차순'} 정렬`, 'info');
    } catch (error) {
        showMessage('정렬 오류: ' + error.message, 'error');
    }
}

function displayUsageList(usageList) {
    const tbody = document.getElementById('usageTableBody');

    if (usageList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">출고 내역이 없습니다.</td></tr>';
        return;
    }

    tbody.innerHTML = usageList.map(usage => `
        <tr>
            <td class="editable" ondblclick="makeUsageEditable(event, ${usage.usageId}, 'usedDate', '${usage.usedDate}')">${formatDate(usage.usedDate)}</td>
            <td>${usage.partNumber || '-'}</td>
            <td>${usage.partName || '-'}</td>
            <td class="editable" ondblclick="makeUsageEditable(event, ${usage.usageId}, 'quantityUsed', ${usage.quantityUsed})">${usage.quantityUsed}</td>
            <td>${usage.unit || '-'}</td>
            <td class="editable" ondblclick="makeUsageEditable(event, ${usage.usageId}, 'usageLocation', '${escapeHtml(usage.usageLocation || '')}')">${usage.usageLocation || '-'}</td>
            <td>${usage.note || '-'}</td>
            <td>${formatDateTime(usage.createdAt)}</td>
        </tr>
    `).join('');
}

// 출고 셀 편집
function makeUsageEditable(event, usageId, field, currentValue) {
    event.stopPropagation();
    const cell = event.target;
    const originalValue = currentValue;

    if (cell.querySelector('input')) return;

    const input = document.createElement('input');
    input.type =
        field === 'quantityUsed' ? 'number' :
            field === 'usedDate' ? 'date' : 'text';

    if (field === 'usedDate' && currentValue) {
        input.value = currentValue;
    } else {
        input.value = (currentValue === '-' || !currentValue) ? '' : currentValue;
    }

    input.style.width = '100%';
    input.style.border = '2px solid #0078d4';
    input.style.padding = '4px';

    cell.textContent = '';
    cell.appendChild(input);
    input.focus();
    input.select();

    const saveEdit = async () => {
        const newValue = input.value.trim();
        if (newValue === String(originalValue) || (!newValue && !originalValue)) {
            if (field === 'usedDate') {
                cell.textContent = formatDate(originalValue);
            } else {
                cell.textContent = originalValue || '-';
            }
            return;
        }

        try {
            const bodyData = {};
            if (field === 'quantityUsed') {
                bodyData[field] = parseInt(newValue);
            } else {
                bodyData[field] = newValue;
            }

            const response = await fetch(`${USAGE_API}/${usageId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData)
            });

            if (response.ok) {
                cell.textContent = field === 'usedDate' ? formatDate(newValue) : newValue || '-';
                showMessage('수정 완료 (재고 자동 반영됨)', 'success');
                loadAllUsage();
                loadInventory();
                loadLowStock();
            } else {
                const msg = await response.text();
                cell.textContent = field === 'usedDate' ? formatDate(originalValue) : originalValue || '-';
                showMessage('수정 실패: ' + msg, 'error');
            }
        } catch (error) {
            cell.textContent = field === 'usedDate' ? formatDate(originalValue) : originalValue || '-';
            showMessage('수정 오류: ' + error.message, 'error');
        }
    };

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveEdit();
    });
    input.addEventListener('blur', saveEdit);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            cell.textContent = field === 'usedDate' ? formatDate(originalValue) : originalValue || '-';
        }
    });
}

// ==================== 유틸리티 함수 ====================
function formatDate(dateString) {
    if (!dateString) return '-';
    return dateString;
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    return dateString;
}

function formatNumber(number) {
    if (!number) return '0';
    return Number(number).toLocaleString('ko-KR');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/'/g, '&#39;');
}

function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';

    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 3000);
}

// 수량 입력 시 음수(-) 방지
['incomingQuantity', 'quantityUsed', 'lowStockThreshold'].forEach(id => {
    const input = document.getElementById(id);
    if (!input) return; // 혹시 id가 없을 경우 방어
    input.addEventListener('keypress', (e) => {
        if (e.key === '-' || e.key === 'e') {
            e.preventDefault();
        }
    });
    input.addEventListener('input', () => {
        if (input.value < 0) {
            input.value = Math.abs(input.value);
        }
    });
});

// ==========================================
// 🧩 부품 배치도 + 재고 연동 기능 (출고와 독립)
// ==========================================

let gridInitialized = false;

// ✅ 1. 배치도 열기 / 닫기
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

// ✅ 2. A~AA 라벨 생성
function generateColumnLabels() {
    const labels = [];
    for (let i = 0; i < 27; i++) {
        labels.push(i < 26 ? String.fromCharCode(65 + i) : 'AA');
    }
    return labels;
}

// ✅ 3. 배치도 그리드 생성
function generateGrid() {
    const columns = generateColumnLabels();
    const rows = 32;
    const grid = document.getElementById('grid');
    if (!grid) return;

    grid.innerHTML = '';

    // 상단 헤더 (맨 왼쪽 빈칸 + A~AA)
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

// ✅ 4. 셀 클릭 시 부품 등록 확인
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

// ✅ 5. DB에 위치 등록 + 셀 즉시 반영
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

// ✅ 6. 저장된 배치도 불러오기
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
                cell.innerHTML = `<strong>${name}</strong><br><span style="font-size:10px;">${number}</span>`;
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


// 배치도 검색
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

// 배치도 검색 초기화
function clearGridSearch() {
    document.getElementById('gridSearchInput').value = '';
    document.querySelectorAll('.cell').forEach(cell => {
        cell.style.border = '1px solid #ccc';
        cell.style.boxShadow = 'none';
    });
    showMessage('검색 초기화', 'info');
}

function calculateKRW() {
    const originalPrice = parseFloat(document.getElementById('originalPrice').value) || 0;
    const exchangeRate = parseFloat(document.getElementById('exchangeRate').value) || 0;

    if (originalPrice > 0 && exchangeRate > 0) {
        const purchasePrice = originalPrice * exchangeRate;
        document.getElementById('purchasePrice').value = purchasePrice.toFixed(2);
    }
}

let currentIncomingIdForImage = null;

// 모달 열기
async function openImageModal(incomingId) {
    currentIncomingIdForImage = incomingId;
    document.getElementById('imageModal').style.display = 'block';
    await loadImages(incomingId);
}

// 모달 닫기
function closeImageModal() {
    document.getElementById('imageModal').style.display = 'none';
    currentIncomingIdForImage = null;
    document.getElementById('modalFileInput').value = '';
}

// 이미지 목록 불러오기
async function loadImages(incomingId) {
    try {
        const response = await fetch(`/livewalk/part-images/incoming/${incomingId}`);
        if (!response.ok) throw new Error('이미지 조회 실패');

        const images = await response.json();
        const container = document.getElementById('imageListContainer');

        if (images.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #888;">등록된 사진이 없습니다.</p>';
            return;
        }

        container.innerHTML = images.map(img => `
            <div style="position: relative; border: 1px solid #ddd; padding: 5px;">
                <img src="${img.imageUrl}" style="width: 100%; height: 150px; object-fit: cover; cursor: pointer;" onclick="window.open('${img.imageUrl}', '_blank')">
                <div style="display: flex; gap: 5px; margin-top: 5px;">
                    <button class="btn-small" style="flex: 1;" onclick="downloadImage('${img.imageUrl}', '${img.fileName}')">다운로드</button>
                    <button class="btn-small" style="flex: 1; background-color: #dc3545;" onclick="deleteImage(${img.imageId})">삭제</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        showMessage('이미지 조회 오류: ' + error.message, 'error');
    }
}

// 이미지 업로드
async function uploadImageFromModal() {
    const fileInput = document.getElementById('modalFileInput');

    if (!fileInput.files || fileInput.files.length === 0) {
        showMessage('파일을 선택하세요', 'error');
        return;
    }

    // 여러 파일 업로드
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < fileInput.files.length; i++) {
        const formData = new FormData();
        formData.append('file', fileInput.files[i]);
        formData.append('incomingId', currentIncomingIdForImage);
        formData.append('imageType', 'part');

        try {
            const response = await fetch('/livewalk/part-images/upload', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                successCount++;
            } else {
                failCount++;
            }
        } catch (error) {
            failCount++;
        }
    }

    showMessage(`업로드 완료: ${successCount}장 성공, ${failCount}장 실패`, successCount > 0 ? 'success' : 'error');
    fileInput.value = '';
    await loadImages(currentIncomingIdForImage);
}

// 이미지 삭제
async function deleteImage(imageId) {
    if (!confirm('이 사진을 삭제하시겠습니까?')) return;

    try {
        const response = await fetch(`/livewalk/part-images/${imageId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showMessage('삭제 완료', 'success');
            await loadImages(currentIncomingIdForImage);
        } else {
            const message = await response.text();
            showMessage('삭제 실패: ' + message, 'error');
        }
    } catch (error) {
        showMessage('삭제 오류: ' + error.message, 'error');
    }
}

// 이미지 다운로드
function downloadImage(url, fileName) {
    fetch(url)
        .then(response => response.blob())
        .then(blob => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName || 'image.jpg';
            link.click();
            URL.revokeObjectURL(link.href);
        })
        .catch(error => {
            showMessage('다운로드 실패: ' + error.message, 'error');
        });
}

// 행 추가 (1개씩)
function addBulkRow() {
    const tbody = document.getElementById('bulkInsertTableBody');

    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>
            <select class="bulk-input bulk-category">
                <option value="">선택</option>
            </select>
        </td>
        <td><input type="text" class="bulk-input bulk-part-number" placeholder="부품번호" required></td>
        <td><input type="text" class="bulk-input bulk-part-name" placeholder="부품명"></td>
        <td><input type="text" class="bulk-input bulk-location" placeholder="예: A-1" maxlength="5"></td>
        <td><input type="number" class="bulk-input bulk-quantity" placeholder="수량" min="1"></td>
        <td><input type="text" class="bulk-input bulk-unit" value="EA"></td>
        <td><input type="number" class="bulk-input bulk-price" placeholder="금액" min="0" step="0.01"></td>
        <td><input type="date" class="bulk-input bulk-date"></td>
        <td><input type="text" class="bulk-input bulk-description" placeholder="설명"></td>
        <td><input type="text" class="bulk-input bulk-note" placeholder="비고(실제 파트넘버)"></td>
    `;
    tbody.appendChild(tr);
    attachLocationInputHandlers(tr.querySelector('.bulk-location'));

    // 날짜 기본값 설정
    tr.querySelector('.bulk-date').value = new Date().toISOString().split('T')[0];

    // 카테고리 로드
    loadCategoriesForBulk();
}

// 행 삭제 (마지막 행)
function removeBulkRow() {
    const tbody = document.getElementById('bulkInsertTableBody');
    if (tbody.children.length > 1) {
        tbody.removeChild(tbody.lastChild);
    } else {
        showMessage('최소 1개의 행은 유지되어야 합니다.', 'info');
    }
}

// 일괄 등록용 카테고리 로드
async function loadCategoriesForBulk() {
    if (categoriesData.length === 0) {
        await loadCategories();
    }

    // 개별 행의 카테고리 드롭다운 채우기
    document.querySelectorAll('.bulk-category').forEach(select => {
        if (select.children.length <= 1) { // 이미 로드되지 않은 경우만
            categoriesData.forEach(category => {
                const option = document.createElement('option');
                option.value = category.categoryId;
                option.textContent = `${category.categoryName} (${category.categoryCode})`;
                select.appendChild(option);
            });
        }
    });

    // 일괄 선택 드롭다운 채우기 (항상 새로고침)
    const bulkSelect = document.getElementById('bulkCategorySelect');
    if (bulkSelect) {
        const currentValue = bulkSelect.value;
        // 기존 옵션 제거 (첫 번째 "개별 선택" 제외)
        while (bulkSelect.children.length > 1) {
            bulkSelect.removeChild(bulkSelect.lastChild);
        }
        // 새로운 옵션 추가
        categoriesData.forEach(category => {
            const option = document.createElement('option');
            option.value = category.categoryId;
            option.textContent = `${category.categoryName} (${category.categoryCode})`;
            bulkSelect.appendChild(option);
        });
        // 이전 선택 값이 있으면 복원
        if (currentValue && bulkSelect.querySelector(`option[value="${currentValue}"]`)) {
            bulkSelect.value = currentValue;
        }
    }
}

// 일괄 카테고리 적용
function applyBulkCategory() {
    const bulkCategoryId = document.getElementById('bulkCategorySelect').value;

    if (!bulkCategoryId) {
        return; // "개별 선택"인 경우 아무것도 하지 않음
    }

    // 모든 행의 카테고리를 선택된 값으로 변경
    document.querySelectorAll('.bulk-category').forEach(select => {
        select.value = bulkCategoryId;
    });

    showMessage('모든 행에 카테고리가 일괄 적용되었습니다.', 'success');
}

// 테이블 초기화
function clearBulkTable() {
    if (!confirm('입력된 내용을 모두 지우시겠습니까?')) return;
    const tbody = document.getElementById('bulkInsertTableBody');
    tbody.innerHTML = '';
    addBulkRow();
}

// 일괄 등록 실행
async function submitBulkInsert() {
    const tbody = document.getElementById('bulkInsertTableBody');
    const rows = tbody.querySelectorAll('tr');
    const dataList = [];
    let invalidLocationInput = null;

    // 입력된 행만 수집
    for (const row of rows) {
        const partNumber = row.querySelector('.bulk-part-number').value.trim();
        const categoryId = row.querySelector('.bulk-category').value;
        const partName = row.querySelector('.bulk-part-name').value.trim();
        const locationInput = row.querySelector('.bulk-location');
        const location = normalizeLocationCode(locationInput.value.trim());
        locationInput.value = location;
        const quantity = row.querySelector('.bulk-quantity').value;
        const unit = row.querySelector('.bulk-unit').value.trim();
        const price = row.querySelector('.bulk-price').value;
        const date = row.querySelector('.bulk-date').value;
        const description = row.querySelector('.bulk-description').value.trim();
        const note = row.querySelector('.bulk-note').value.trim();

        if (location && !isValidLocationCode(location)) {
            invalidLocationInput = locationInput;
            break;
        }

        // 필수 항목: 부품번호, 카테고리, 부품명, 수량, 금액, 구매일자, 설명
        if (partNumber && categoryId && partName && quantity && price && date && description) {
            const data = {
                partNumber: partNumber,
                categoryId: parseInt(categoryId),
                partName: partName,
                location: location || null,
                incomingQuantity: parseInt(quantity),
                unit: unit || 'EA',
                purchasePrice: parseFloat(price),
                currency: 'KRW',
                purchaseDate: date,
                description: description,
                note: note,
                createdBy: 'system'
            };

            dataList.push(data);
        }
    }

    if (invalidLocationInput) {
        showMessage('부품 위치는 A~AA 영역과 1~32 행을 "-"로 구분한 형식(예: A-1)만 입력할 수 있습니다.', 'error');
        invalidLocationInput.focus();
        return;
    }

    if (dataList.length === 0) {
        showMessage('등록할 데이터가 없습니다. 필수 항목을 입력하세요.', 'error');
        return;
    }

    if (!confirm(`${dataList.length}건을 등록하시겠습니까?`)) return;

    try {
        const response = await fetch(`${INCOMING_API}/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataList)
        });

        if (response.ok) {
            const result = await response.json();
            showMessage(`등록 완료: ${result.success}건 성공, ${result.fail}건 실패`, 'success');
            clearBulkTable();
            loadAllIncoming();
            loadInventory();
            loadLowStock();
        } else {
            const message = await response.text();
            showMessage('등록 실패: ' + message, 'error');
        }
    } catch (error) {
        showMessage('서버 연결 오류: ' + error.message, 'error');
    }
}

// ==================== 카테고리 모달 관련 ====================
async function openCategoryModal() {
    document.getElementById('categoryModal').style.display = 'block';
    document.getElementById('categoryForm').reset();
    await loadCategoryList();
}

function closeCategoryModal() {
    document.getElementById('categoryModal').style.display = 'none';
    document.getElementById('categoryForm').reset();
}

async function loadCategoryList() {
    try {
        const response = await fetch(CATEGORY_API);
        const categories = await response.json();

        const tbody = document.getElementById('categoryListBody');
        tbody.innerHTML = '';

        categories.forEach(category => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${category.categoryCode}</td>
                <td>${category.categoryName}</td>
                <td>${category.description || '-'}</td>
                <td>
                    <button class="btn-small" onclick="deleteCategory(${category.categoryId}, '${escapeHtml(category.categoryName)}')" style="background-color: #dc3545; color: white; border: none; padding: 4px 8px; cursor: pointer; border-radius: 3px;">삭제</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        showMessage('카테고리 목록 조회 오류: ' + error.message, 'error');
    }
}

async function deleteCategory(categoryId, categoryName) {
    if (!confirm(`카테고리 "${categoryName}"을(를) 삭제하시겠습니까?`)) {
        return;
    }

    try {
        const response = await fetch(`${CATEGORY_API}/${categoryId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showMessage('카테고리 삭제 완료', 'success');
            await loadCategoryList(); // 목록 새로고침
            await loadCategories(); // 전체 카테고리 새로고침
            loadCategoriesForBulk(); // 입고 등록 드롭다운 새로고침
        } else {
            const errorMessage = await response.text();
            showMessage('카테고리 삭제 실패: ' + errorMessage, 'error');
        }
    } catch (error) {
        showMessage('서버 연결 오류: ' + error.message, 'error');
    }
}

async function submitCategory(event) {
    event.preventDefault();

    const categoryData = {
        categoryCode: document.getElementById('categoryCode').value.trim(),
        categoryName: document.getElementById('categoryName').value.trim(),
        description: document.getElementById('categoryDescription').value.trim() || null
    };

    try {
        const response = await fetch(CATEGORY_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(categoryData)
        });

        if (response.ok) {
            const message = await response.text();
            showMessage(message, 'success');
            document.getElementById('categoryForm').reset();
            await loadCategoryList(); // 목록 새로고침
            await loadCategories(); // 전체 카테고리 새로고침
            loadCategoriesForBulk(); // 입고 등록 드롭다운 새로고침
        } else {
            const errorMessage = await response.text();
            showMessage('카테고리 등록 실패: ' + errorMessage, 'error');
        }
    } catch (error) {
        showMessage('서버 연결 오류: ' + error.message, 'error');
    }
}

// ============================================
// CSV 다운로드 관련 함수
// ============================================

// CSV 다운로드 타입 및 데이터 저장
let currentCsvType = '';
let currentCsvData = null;
let currentCsvColumns = [];

/**
 * CSV 컬럼 선택 모달 열기
 */
function openCsvColumnModal(csvType, data, allColumns) {
    currentCsvType = csvType;
    currentCsvData = data;
    currentCsvColumns = allColumns;

    const columnList = document.getElementById('csvColumnList');
    columnList.innerHTML = '';

    allColumns.forEach((column) => {
        const label = document.createElement('label');
        label.style.display = 'block';
        label.style.padding = '8px';
        label.style.cursor = 'pointer';
        label.style.borderBottom = '1px solid #f0f0f0';
        label.innerHTML = `
            <input type="checkbox" class="csv-column-checkbox" value="${column}" checked style="margin-right: 8px;">
            ${column}
        `;
        columnList.appendChild(label);
    });

    document.getElementById('csvColumnModal').style.display = 'block';
}

/**
 * CSV 컬럼 선택 모달 닫기
 */
function closeCsvColumnModal() {
    document.getElementById('csvColumnModal').style.display = 'none';
    currentCsvType = '';
    currentCsvData = null;
    currentCsvColumns = [];
}

/**
 * 전체 컬럼 선택
 */
function selectAllColumns() {
    document.querySelectorAll('.csv-column-checkbox').forEach(checkbox => {
        checkbox.checked = true;
    });
}

/**
 * 전체 컬럼 해제
 */
function deselectAllColumns() {
    document.querySelectorAll('.csv-column-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
}

/**
 * 선택된 컬럼으로 CSV 다운로드 확정
 */
function confirmCsvDownload() {
    const selectedColumns = [];
    document.querySelectorAll('.csv-column-checkbox:checked').forEach(checkbox => {
        selectedColumns.push(checkbox.value);
    });

    if (selectedColumns.length === 0) {
        showMessage('최소 1개 이상의 컬럼을 선택해주세요.', 'error');
        return;
    }

    // 선택된 컬럼만 포함하여 CSV 생성
    const filteredData = currentCsvData.map(row => {
        const filteredRow = {};
        selectedColumns.forEach(col => {
            filteredRow[col] = row[col];
        });
        return filteredRow;
    });

    const csvContent = convertToCSV(selectedColumns, filteredData);
    const today = new Date().toISOString().split('T')[0];

    let filename = '';
    switch (currentCsvType) {
        case 'incoming':
            filename = `입고리스트_${today}.csv`;
            break;
        case 'inventory':
            filename = `재고현황_${today}.csv`;
            break;
        case 'lowstock':
            filename = `재고부족_${today}.csv`;
            break;
        case 'usage':
            filename = `출고내역_${today}.csv`;
            break;
    }

    downloadCSV(filename, csvContent);
    showMessage('CSV 다운로드 완료', 'success');
    closeCsvColumnModal();
}

/**
 * 데이터를 CSV 형식으로 변환 (UTF-8 BOM 포함)
 */
function convertToCSV(headers, data) {
    const BOM = '\uFEFF';
    const headerRow = headers.join(',');
    const dataRows = data.map(row => {
        return headers.map(header => {
            const value = row[header] || '';
            const stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return '"' + stringValue.replace(/"/g, '""') + '"';
            }
            return stringValue;
        }).join(',');
    });
    return BOM + headerRow + '\n' + dataRows.join('\n');
}

/**
 * CSV 파일 다운로드 트리거
 */
function downloadCSV(filename, csvContent) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * 입고 리스트 CSV 다운로드
 */
async function downloadIncomingCSV() {
    try {
        const response = await fetch(INCOMING_API);
        if (!response.ok) throw new Error('데이터 조회 실패');

        const data = await response.json();

        const csvData = data.map(item => ({
            '입고ID': item.incomingId,
            '카테고리': item.categoryName,
            '부품번호': item.partNumber,
            '부품명': item.partName,
            '설명': item.description,
            '입고수량': item.incomingQuantity,
            '단위': item.unit,
            '통화': item.currency,
            '외화단가': item.originalPrice,
            '환율': item.exchangeRate,
            '구매금액': item.purchasePrice,
            '공급업체': item.supplier,
            '입고일': item.incomingDate,
            '등록일시': item.createdAt,
            '비고': item.remarks
        }));

        const headers = ['입고ID', '카테고리', '부품번호', '부품명', '설명', '입고수량', '단위', '통화', '외화단가', '환율', '구매금액', '공급업체', '입고일', '등록일시', '비고'];

        // 컬럼 선택 모달 열기
        openCsvColumnModal('incoming', csvData, headers);
    } catch (error) {
        showMessage('CSV 다운로드 오류: ' + error.message, 'error');
    }
}

/**
 * 재고 현황 CSV 다운로드
 */
async function downloadInventoryCSV() {
    try {
        const response = await fetch(`${INCOMING_API}/inventory`);
        if (!response.ok) throw new Error('데이터 조회 실패');

        const data = await response.json();

        const csvData = data.map(item => ({
            '카테고리': item.category_name,
            '부품번호': item.part_number,
            '부품명': item.part_name,
            '총입고': item.total_incoming,
            '총출고': item.total_outgoing || 0,
            '현재고': item.current_stock,
            '평균단가': item.avg_price,
            '재고금액': item.stock_value
        }));

        const headers = ['카테고리', '부품번호', '부품명', '총입고', '총출고', '현재고', '평균단가', '재고금액'];

        // 컬럼 선택 모달 열기
        openCsvColumnModal('inventory', csvData, headers);
    } catch (error) {
        showMessage('CSV 다운로드 오류: ' + error.message, 'error');
    }
}

/**
 * 재고 부족 CSV 다운로드
 */
async function downloadLowStockCSV() {
    try {
        const threshold = parseInt(document.getElementById('lowStockThreshold').value) || 5;
        const response = await fetch(`${INCOMING_API}/low-stock?threshold=${threshold}`);
        if (!response.ok) throw new Error('데이터 조회 실패');

        const data = await response.json();

        const csvData = data.map(item => ({
            '카테고리': item.category_name,
            '부품번호': item.part_number,
            '부품명': item.part_name,
            '현재고': item.current_stock,
            '평균단가': item.avg_price
        }));

        const headers = ['카테고리', '부품번호', '부품명', '현재고', '평균단가'];

        // 컬럼 선택 모달 열기
        openCsvColumnModal('lowstock', csvData, headers);
    } catch (error) {
        showMessage('CSV 다운로드 오류: ' + error.message, 'error');
    }
}

/**
 * 출고 내역 CSV 다운로드
 */
async function downloadUsageCSV() {
    try {
        const response = await fetch(USAGE_API);
        if (!response.ok) throw new Error('데이터 조회 실패');

        const data = await response.json();

        const csvData = data.map(item => ({
            '출고ID': item.usageId,
            '카테고리': item.categoryName,
            '부품번호': item.partNumber,
            '부품명': item.partName,
            '출고수량': item.usageQuantity,
            '사용처': item.usagePurpose,
            '출고일': item.usageDate,
            '비고': item.remarks
        }));

        const headers = ['출고ID', '카테고리', '부품번호', '부품명', '출고수량', '사용처', '출고일', '비고'];

        // 컬럼 선택 모달 열기
        openCsvColumnModal('usage', csvData, headers);
    } catch (error) {
        showMessage('CSV 다운로드 오류: ' + error.message, 'error');
    }
}

// ============================================
// 부품 위치 관련 함수
// ============================================

/**
 * 부품 위치 모달 열기
 */
async function openLocationModal(partNumber) {
    try {
        // 부품 위치 정보 조회 (쿼리 파라미터로 전달)
        const response = await fetch(`/livewalk/part-locations/part?partNumber=${encodeURIComponent(partNumber)}`);
        if (!response.ok) {
            showMessage('부품 위치 정보를 찾을 수 없습니다.', 'error');
            return;
        }

        const location = await response.json();

        // 모달 열기
        document.getElementById('locationModalPartNumber').textContent = partNumber;

        // 부품명 표시 (location.partName이 있으면 표시)
        const partNameEl = document.getElementById('locationModalPartName');
        if (partNameEl && location.partName) {
            partNameEl.textContent = `(${location.partName})`;
        } else if (partNameEl) {
            partNameEl.textContent = '';
        }

        document.getElementById('locationGridModal').style.display = 'block';

        // 그리드 생성
        createLocationGrid(location.locationCode);
    } catch (error) {
        showMessage('배치도 조회 오류: ' + error.message, 'error');
    }
}

/**
 * 32x27 배치도 그리드 생성
 * 세로: 숫자 (1-32)
 * 가로: 영어 (A-Z, AA) - 27개
 */
function createLocationGrid(highlightLocation) {
    const container = document.getElementById('locationGridContainer');
    const rows = 32;  // 세로 (숫자)
    const cols = 27;  // 가로 (영어)

    let html = '<table style="border-collapse: collapse; margin: 0 auto;">';

    // 가로 레이블 (A-Z, AA) - 27개
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

// 배치도 모달 ESC 키로 닫기
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' || event.key === 'Esc') {
        const modal = document.getElementById('locationGridModal');
        if (modal && modal.style.display === 'block') {
            closeLocationGridModal();
        }
    }
});
