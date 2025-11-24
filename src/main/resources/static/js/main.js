const INCOMING_API = '/livewalk/incoming';
const USAGE_API = '/livewalk/part-usage';
const CATEGORY_API = '/livewalk/categories';
const PAYMENT_METHOD_API = '/livewalk/categories/payment-methods';
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
let paymentMethodsData = [];
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
document.addEventListener('DOMContentLoaded', async function () {
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

    // 관리자/일반 유저 버튼 표시 여부 확인
    try {
        const response = await fetch('/livewalk/auth/current-user');
        if (response.ok) {
            const data = await response.json();
            const adminBtn = document.getElementById('adminBtn');
            const myProfileBtn = document.getElementById('myProfileBtn');

            if (data.isAdmin) {
                // 관리자: 관리자 페이지 버튼만 표시
                if (adminBtn) {
                    adminBtn.style.display = 'block';
                }
            } else {
                // 일반 유저: 내 정보 버튼만 표시
                if (myProfileBtn) {
                    myProfileBtn.style.display = 'block';
                }
            }
        }
    } catch (error) {
        console.error('사용자 정보 조회 오류:', error);
    }

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
    Promise.all([loadCategories(), loadPaymentMethods()])
        .catch(() => {
            // 데이터 로드 중 �??�류��??�시됨
        })
        .finally(() => {
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

    // 초기 카테고리 설정
    switchCategory('parts');
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
                option.textContent = category.categoryName;
                select.appendChild(option);
            });
        }
    } catch (error) {
        showMessage('카테고리 조회 오류: ' + error.message, 'error');
    }
}

async function loadPaymentMethods() {
    try {
        const response = await fetch(PAYMENT_METHOD_API);
        if (!response.ok) throw new Error('결제수단 조회 ?�패');

        paymentMethodsData = await response.json();

        const select = document.getElementById('paymentMethodId');
        if (select) {
            const previousValue = select.value;
            select.innerHTML = '<option value="">\uC120\uD0DD\uD574\uC8FC\uC138\uC694</option>';

            paymentMethodsData.forEach(method => {
                const option = document.createElement('option');
                option.value = method.categoryId;
                option.textContent = method.categoryName;
                select.appendChild(option);
            });

            if (previousValue && select.querySelector(`option[value=\"${previousValue}\"]`)) {
                select.value = previousValue;
            }
        }
    } catch (error) {
        showMessage('결제수단 조회 ?�류: ' + error.message, 'error');
    }
}

// onCategoryChange 함수 제거됨 - 부품번호를 사용자가 직접 입력함

// ==================== 입고 등록 ====================
async function registerIncoming(e) {
    e.preventDefault();

    const categoryId = parseInt(document.getElementById('categoryId').value);
    const currency = document.getElementById('currency').value;
    const paymentMethodEl = document.getElementById('paymentMethodId');

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

    if (paymentMethodEl && paymentMethodEl.value) {
        incomingData.paymentMethodId = parseInt(paymentMethodEl.value);
    }

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
    const paymentMethodEl = document.getElementById('paymentMethodId');
    if (paymentMethodEl) paymentMethodEl.value = '';
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
        'category_name': '\uCE74\uD14C\uACE0\uB9AC',
        'part_number': '\uBD80\uD488\uBC88\uD638',
        'part_name': '\uBD80\uD488\uBA85',
        'description': '\uC124\uBA85',
        'note': '\uBE44\uACE0',
        'incoming_quantity': '\uC785\uACE0\uC218\uB7C9',
        'payment_method_name': '\uACB0\uC81C\uC218\uB2E8',
        'purchase_price': '\uAD6C\uB9E4\uAE08\uC561',
        'purchase_date': '\uAD6C\uB9E4\uC77C\uC790',
        'created_at': '\uB4F1\uB85D\uC77C'
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
        'note': 10
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
        'payment_method_name': 6,
        'purchase_price': 7,
        'purchase_date': 8,
        'created_at': 9,
        'note': 10
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
        tbody.innerHTML = '<tr><td colspan="13" style="text-align: center;">입고 내역이 없습니다.</td></tr>';
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
                <td class="editable" ondblclick="makeIncomingEditable(event, ${incoming.incomingId}, 'paymentMethodId', ${incoming.paymentMethodId != null ? incoming.paymentMethodId : 'null'}, null, '${escapeHtml(incoming.paymentMethodName || '')}')">${incoming.paymentMethodName || '-'}</td>
                <td class="editable" ondblclick="makeIncomingEditable(event, ${incoming.incomingId}, 'purchasePrice', ${incoming.purchasePrice})">${formatNumber(incoming.purchasePrice)} 원</td>
                <td class="editable" ondblclick="makeIncomingEditable(event, ${incoming.incomingId}, 'purchaseDate', '${incoming.purchaseDate}')">${formatDate(incoming.purchaseDate)}</td>
                <td>${formatDateTime(incoming.createdAt)}</td>
                <td class="editable" ondblclick="makeIncomingEditable(event, ${incoming.incomingId}, 'note', '${escapeHtml(incoming.note || '')}')">${incoming.note || '-'}</td>
                <td><button class="btn-small" onclick="openImageModal(${incoming.incomingId})">🖼 사진${imageCount > 0 ? ' ' + imageCount + '개' : ''}</button></td>
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
            options += `<option value="${category.categoryId}" ${selected}>${category.categoryName}</option>`;
        });
        inputElement.innerHTML = options;
    } else if (field === 'paymentMethodId') {
        inputElement = document.createElement('select');
        let options = '<option value="">\uC120\uD0DD</option>';
        paymentMethodsData.forEach(method => {
            const selected = method.categoryId === currentValue ? 'selected' : '';
            options += `<option value="${method.categoryId}" ${selected}>${method.categoryName}</option>`;
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
        const newValue = (field === 'categoryId' || field === 'paymentMethodId') ? inputElement.value : inputElement.value.trim();

        if (newValue === String(originalValue) || (!newValue && !originalValue)) {
            if (field === 'categoryId' || field === 'paymentMethodId') {
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

            if (field === 'categoryId' || field === 'paymentMethodId') {
                updatedData[field] = newValue ? parseInt(newValue) : null;
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
            if (field === 'categoryId' || field === 'paymentMethodId') {
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

function downloadFile(url, fileName, fallbackName = 'file') {
    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error('파일을 다운로드할 수 없습니다.');
            return response.blob();
        })
        .then(blob => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName || `${fallbackName}.dat`;
            link.click();
            URL.revokeObjectURL(link.href);
        })
        .catch(error => {
            showMessage('다운로드 실패: ' + error.message, 'error');
        });
}

function downloadImage(url, fileName) {
    downloadFile(url, fileName || 'image.jpg', 'image');
}

let currentIncomingIdForDocument = null;

async function openDocumentModal(incomingId) {
    currentIncomingIdForDocument = incomingId;
    const modal = document.getElementById('documentModal');
    const idSpan = document.getElementById('documentModalIncomingId');
    if (idSpan) idSpan.textContent = incomingId;
    if (modal) modal.style.display = 'block';

    const fileInput = document.getElementById('documentFileInput');
    if (fileInput) fileInput.value = '';

    await loadDocuments(incomingId);
}

function closeDocumentModal() {
    const modal = document.getElementById('documentModal');
    if (modal) modal.style.display = 'none';

    const fileInput = document.getElementById('documentFileInput');
    if (fileInput) fileInput.value = '';

    currentIncomingIdForDocument = null;
}

async function loadDocuments(incomingId = currentIncomingIdForDocument) {
    if (!incomingId) return;

    const container = document.getElementById('documentListContainer');
    if (!container) return;
    container.innerHTML = '<p style="text-align: center; color: #999;">문서를 불러오는 중...</p>';

    try {
        const response = await fetch(`/livewalk/documents/incoming/${incomingId}`);
        if (!response.ok) throw new Error('문서 조회 실패');

        const documents = await response.json();
        if (!documents || documents.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999;">등록된 문서가 없습니다.</p>';
            return;
        }

        container.innerHTML = documents.map(doc => `
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; border: 1px solid #e0e0e0; border-radius: 6px; padding: 10px 12px; margin-bottom: 10px;">
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        📄 ${escapeHtml(doc.title || '문서')}
                    </div>
                    <div style="font-size: 11px; color: #777; margin-top: 4px;">
                        ${formatDateTime(doc.createdAt)} · ${formatFileSize(doc.fileSize)}
                    </div>
                </div>
                <div style="display: flex; gap: 6px;">
                    <button class="btn-small" onclick="viewPDF('${doc.fileName}', '${escapeHtml(doc.title || '문서')}')">보기</button>
                    <button class="btn-small" onclick="downloadPDF('${doc.fileName}', '${escapeHtml(doc.title || '문서')}')">다운로드</button>
                    <button class="btn-small" style="background-color: #dc3545; color: #fff;" onclick="deleteGeneratedDocument(${doc.documentId})">삭제</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<p style="text-align: center; color: #e74c3c;">문서를 불러오지 못했습니다.</p>';
        showMessage('문서 조회 오류: ' + error.message, 'error');
    }
}

async function uploadDocuments() {
    if (!currentIncomingIdForDocument) {
        showMessage('입고 정보를 먼저 선택해주세요.', 'error');
        return;
    }

    const fileInput = document.getElementById('documentFileInput');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        showMessage('업로드할 문서를 선택해주세요.', 'warning');
        return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const file of fileInput.files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('incomingId', currentIncomingIdForDocument);
        formData.append('imageType', 'document');

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

    showMessage(`문서 업로드 완료: ${successCount}건 성공, ${failCount}건 실패`, successCount > 0 ? 'success' : 'error');
    fileInput.value = '';
    await loadDocuments();
}

async function deleteDocument(documentId) {
    if (!confirm('선택한 문서를 삭제할까요?')) return;

    try {
        const response = await fetch(`/livewalk/part-images/${documentId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showMessage('문서가 삭제되었습니다.', 'success');
            await loadDocuments();
        } else {
            const message = await response.text();
            showMessage('문서 삭제 실패: ' + message, 'error');
        }
    } catch (error) {
        showMessage('문서 삭제 오류: ' + error.message, 'error');
    }
}

// 문서 생성 모달 열기
async function openDocumentCreateForm() {
    // 자료실에서 양식 목록 불러오기 (이미지만)
    try {
        const response = await fetch('/livewalk/library');
        if (response.ok) {
            const templates = await response.json();
            const templateSelect = document.getElementById('templateSelect');
            templateSelect.innerHTML = '<option value="">-- 양식을 선택하세요 --</option>';

            templates.forEach(template => {
                // 이미지 파일만 추가
                if (template.fileType !== 'pdf') {
                    const option = document.createElement('option');
                    option.value = template.imageId;
                    option.textContent = template.title;
                    option.dataset.fileName = template.fileName;
                    option.dataset.fileType = template.fileType || 'image';
                    templateSelect.appendChild(option);
                }
            });
        }
    } catch (error) {
        console.error('양식 목록 로딩 오류:', error);
    }

    // 폼 초기화
    document.getElementById('documentCreateForm').reset();

    // Canvas 초기화
    const canvas = document.getElementById('documentCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    currentTemplateImage = null;

    // 필드 테이블 초기화 (1개 행만 남기고 모두 제거)
    const tbody = document.getElementById('canvasFieldsTableBody');
    tbody.innerHTML = `
        <tr>
            <td style="border: 1px solid #dee2e6; padding: 4px;">
                <input type="text" class="canvas-field-value" oninput="redrawCanvas()" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;" placeholder="텍스트 입력">
            </td>
            <td style="border: 1px solid #dee2e6; padding: 4px;">
                <input type="number" class="canvas-field-x" value="100" oninput="redrawCanvas()" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;">
            </td>
            <td style="border: 1px solid #dee2e6; padding: 4px;">
                <input type="number" class="canvas-field-y" value="100" oninput="redrawCanvas()" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;">
            </td>
            <td style="border: 1px solid #dee2e6; padding: 4px;">
                <input type="number" class="canvas-field-fontsize" value="20" oninput="redrawCanvas()" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;">
            </td>
            <td style="border: 1px solid #dee2e6; padding: 4px; text-align: center;">
                <button type="button" onclick="removeCanvasField(this)" style="padding: 4px 8px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">×</button>
            </td>
        </tr>
    `;

    // 모달 표시
    document.getElementById('documentCreateModal').style.display = 'block';
}

// 문서 생성 모달 닫기
function closeDocumentCreateModal() {
    document.getElementById('documentCreateModal').style.display = 'none';
}

// 전역 변수로 현재 PDF 정보 저장
let currentTemplatePdf = null;
let currentTemplateFileType = null;
let currentTemplateFileName = null;

// 템플릿 미리보기 로드
async function loadTemplatePreview() {
    const select = document.getElementById('templateSelect');
    const selectedOption = select.options[select.selectedIndex];
    const preview = document.getElementById('templatePreview');

    if (selectedOption.value) {
        const fileName = selectedOption.dataset.fileName;
        const fileType = selectedOption.dataset.fileType;

        currentTemplateFileName = fileName;
        currentTemplateFileType = fileType;
        // Canvas에 이미지 로드
        loadTemplateToCanvas();

        if (fileType === 'pdf') {
            // PDF.js를 사용한 PDF 미리보기
            preview.innerHTML = `
                <canvas id="pdfCanvas" style="border: 1px solid #ddd; border-radius: 4px; max-width: 100%;"></canvas>
            `;
            preview.style.display = 'block';

            // PDF.js로 PDF 렌더링
            const pdfUrl = `/livewalk/library/image/${fileName}`;
            try {
                const pdfjsLib = window['pdfjs-dist/build/pdf'];
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

                const loadingTask = pdfjsLib.getDocument(pdfUrl);
                currentTemplatePdf = await loadingTask.promise;
                const page = await currentTemplatePdf.getPage(1); // 첫 페이지만 미리보기

                const canvas = document.getElementById('pdfCanvas');
                const context = canvas.getContext('2d');
                const viewport = page.getViewport({ scale: 1.5 });

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };
                await page.render(renderContext).promise;

                // PDF 로드 성공 시 표 위치 미리보기 활성화
                updateTablePositionPreview();
            } catch (error) {
                console.error('PDF 로딩 오류:', error);
                currentTemplatePdf = null;
                preview.innerHTML = `
                    <div style="padding: 30px; text-align: center;">
                        <div style="font-size: 48px; margin-bottom: 15px;">📄</div>
                        <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">PDF 미리보기 실패</div>
                        <a href="${pdfUrl}" target="_blank"
                           style="display: inline-block; padding: 10px 20px; background: #007bff; color: white;
                                  text-decoration: none; border-radius: 4px; margin-top: 10px;">
                            새 창에서 열기
                        </a>
                    </div>
                `;
            }
        } else {
            // 이미지 미리보기
            currentTemplatePdf = null;
            preview.innerHTML = `
                <img src="/livewalk/library/image/${fileName}" alt="양식 미리보기"
                     style="max-width: 100%; max-height: 300px; border-radius: 4px;">
            `;
            preview.style.display = 'block';
            document.getElementById('tablePositionPreview').style.display = 'none';
        }
    } else {
        preview.style.display = 'none';
        currentTemplatePdf = null;
        document.getElementById('tablePositionPreview').style.display = 'none';
    }
}

// 표 위치 미리보기 업데이트
async function updateTablePositionPreview() {
    if (!currentTemplatePdf || currentTemplateFileType !== 'pdf') {
        document.getElementById('tablePositionPreview').style.display = 'none';
        return;
    }

    try {
        const page = await currentTemplatePdf.getPage(1);
        const canvas = document.getElementById('previewCanvas');
        const context = canvas.getContext('2d');

        // A4 크기 기준으로 스케일 조정
        const scale = 1.0;
        const viewport = page.getViewport({ scale: scale });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // PDF 렌더링
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        // 표 위치 박스 그리기
        const tableX = parseFloat(document.getElementById('tableX').value) || 50;
        const tableY = parseFloat(document.getElementById('tableY').value) || 250;

        // PDF 좌표계는 왼쪽 아래가 원점이므로 Canvas 좌표계로 변환
        const canvasY = viewport.height - tableY;

        // 표 크기 (대략적인 크기)
        const tableWidth = viewport.width - (tableX * 2);
        const tableHeight = 150; // 대략적인 표 높이

        // 빨간색 반투명 박스 그리기
        context.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        context.lineWidth = 3;
        context.strokeRect(tableX, canvasY - tableHeight, tableWidth, tableHeight);

        // 내부를 연한 빨간색으로 채우기
        context.fillStyle = 'rgba(255, 0, 0, 0.1)';
        context.fillRect(tableX, canvasY - tableHeight, tableWidth, tableHeight);

        document.getElementById('tablePositionPreview').style.display = 'block';
    } catch (error) {
        console.error('표 위치 미리보기 오류:', error);
    }
}

// 문서 행 추가
function addDocumentRow() {
    const tbody = document.getElementById('documentItemsTableBody');
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td style="border: 1px solid #dee2e6; padding: 4px;">
            <input type="text" class="doc-item-name" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;">
        </td>
        <td style="border: 1px solid #dee2e6; padding: 4px;">
            <input type="text" class="doc-spec" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;">
        </td>
        <td style="border: 1px solid #dee2e6; padding: 4px;">
            <input type="number" class="doc-quantity" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;">
        </td>
        <td style="border: 1px solid #dee2e6; padding: 4px;">
            <input type="number" class="doc-unit-price" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;">
        </td>
        <td style="border: 1px solid #dee2e6; padding: 4px;">
            <input type="number" class="doc-supply-price" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;">
        </td>
        <td style="border: 1px solid #dee2e6; padding: 4px;">
            <input type="number" class="doc-tax" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;">
        </td>
        <td style="border: 1px solid #dee2e6; padding: 4px;">
            <input type="text" class="doc-notes" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;">
        </td>
        <td style="border: 1px solid #dee2e6; padding: 4px; text-align: center;">
            <button type="button" onclick="removeDocumentRow(this)" style="padding: 4px 8px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">×</button>
        </td>
    `;
    tbody.appendChild(newRow);
}

// 문서 행 삭제
function removeDocumentRow(button) {
    const tbody = document.getElementById('documentItemsTableBody');
    if (tbody.rows.length > 1) {
        button.closest('tr').remove();
    } else {
        alert('최소 1개의 행은 필요합니다.');
    }
}

// 입력 방식 전환
function toggleInputMode() {
    const mode = document.querySelector('input[name="inputMode"]:checked').value;
    const tableInputArea = document.getElementById('tableInputArea');
    const fieldsInputArea = document.getElementById('fieldsInputArea');
    const tablePositionArea = document.querySelector('#tableX').closest('div').closest('div').closest('div');

    if (mode === 'table') {
        tableInputArea.style.display = 'block';
        fieldsInputArea.style.display = 'none';
        tablePositionArea.style.display = 'block';
    } else {
        tableInputArea.style.display = 'none';
        fieldsInputArea.style.display = 'block';
        tablePositionArea.style.display = 'none';
    }
}

// 개별 필드 행 추가
function addFieldRow() {
    const tbody = document.getElementById('documentFieldsTableBody');
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td style="border: 1px solid #dee2e6; padding: 4px;">
            <input type="text" class="field-name" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;" placeholder="예: 공급자명">
        </td>
        <td style="border: 1px solid #dee2e6; padding: 4px;">
            <input type="text" class="field-value" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;" placeholder="값 입력">
        </td>
        <td style="border: 1px solid #dee2e6; padding: 4px;">
            <input type="number" class="field-x" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;" placeholder="100">
        </td>
        <td style="border: 1px solid #dee2e6; padding: 4px;">
            <input type="number" class="field-y" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;" placeholder="700">
        </td>
        <td style="border: 1px solid #dee2e6; padding: 4px;">
            <input type="number" class="field-font-size" value="10" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;">
        </td>
        <td style="border: 1px solid #dee2e6; padding: 4px; text-align: center;">
            <button type="button" onclick="removeFieldRow(this)" style="padding: 4px 8px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">×</button>
        </td>
    `;
    tbody.appendChild(newRow);
}

// 개별 필드 행 삭제
function removeFieldRow(button) {
    const tbody = document.getElementById('documentFieldsTableBody');
    if (tbody.rows.length > 1) {
        button.closest('tr').remove();
    } else {
        alert('최소 1개의 필드는 필요합니다.');
    }
}

// PDF 문서 생성
async function generateDocument() {
    const templateId = document.getElementById('templateSelect').value;
    const title = document.getElementById('docTitle').value;

    if (!templateId) {
        alert('문서 양식을 선택해주세요.');
        return;
    }

    if (!title) {
        alert('문서 제목을 입력해주세요.');
        return;
    }

    // 입력 방식 확인
    const mode = document.querySelector('input[name="inputMode"]:checked').value;

    let documentData = {
        templateId: templateId,
        incomingId: currentIncomingIdForDocument,
        title: title
    };

    if (mode === 'table') {
        // 표 형식: 테이블에서 모든 행의 데이터 수집
        const tbody = document.getElementById('documentItemsTableBody');
        const rows = tbody.querySelectorAll('tr');
        const items = [];

        rows.forEach(row => {
            const item = {
                itemName: row.querySelector('.doc-item-name').value,
                spec: row.querySelector('.doc-spec').value,
                quantity: row.querySelector('.doc-quantity').value,
                unitPrice: row.querySelector('.doc-unit-price').value,
                supplyPrice: row.querySelector('.doc-supply-price').value,
                tax: row.querySelector('.doc-tax').value,
                notes: row.querySelector('.doc-notes').value
            };
            items.push(item);
        });

        // 표 위치 좌표 가져오기
        const tableX = parseFloat(document.getElementById('tableX').value) || null;
        const tableY = parseFloat(document.getElementById('tableY').value) || null;

        documentData.items = items;
        documentData.tableX = tableX;
        documentData.tableY = tableY;
    } else {
        // 개별 필드: 필드 테이블에서 데이터 수집
        const tbody = document.getElementById('documentFieldsTableBody');
        const rows = tbody.querySelectorAll('tr');
        const fields = [];

        rows.forEach(row => {
            const field = {
                fieldName: row.querySelector('.field-name').value,
                fieldValue: row.querySelector('.field-value').value,
                x: parseFloat(row.querySelector('.field-x').value),
                y: parseFloat(row.querySelector('.field-y').value),
                fontSize: parseInt(row.querySelector('.field-font-size').value) || 10
            };
            fields.push(field);
        });

        documentData.fields = fields;
    }

    try {
        const response = await fetch('/livewalk/documents/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(documentData)
        });

        if (response.ok) {
            const result = await response.json();
            showMessage('문서가 생성되었습니다.', 'success');
            closeDocumentCreateModal();
            await loadDocuments();
        } else {
            const error = await response.json();
            showMessage('문서 생성 실패: ' + error.message, 'error');
        }
    } catch (error) {
        showMessage('문서 생성 오류: ' + error.message, 'error');
    }
}

// PDF 보기
function viewPDF(fileName, title) {
    const url = `/livewalk/documents/view/${fileName}`;
    window.open(url, '_blank');
}

// PDF 다운로드
function downloadPDF(fileName, title) {
    const url = `/livewalk/documents/download/${fileName}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = title + '.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 생성된 문서 삭제
async function deleteGeneratedDocument(documentId) {
    if (!confirm('선택한 문서를 삭제할까요?')) return;

    try {
        const response = await fetch(`/livewalk/documents/${documentId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showMessage('문서가 삭제되었습니다.', 'success');
            await loadDocuments();
        } else {
            const error = await response.json();
            showMessage('문서 삭제 실패: ' + error.message, 'error');
        }
    } catch (error) {
        showMessage('문서 삭제 오류: ' + error.message, 'error');
    }
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
        <td><input type="text" class="bulk-input bulk-cabinet-location" placeholder="예: A-1" maxlength="10"></td>
        <td style="padding: 2px;">
            <div style="display: flex; gap: 3px; align-items: center;">
                <input type="text" class="bulk-input bulk-map-location" placeholder="예: 8-A" maxlength="10" style="flex: 1; min-width: 50px;">
                <button type="button" onclick="openLocationPicker(this)" class="btn-small" style="padding: 3px 8px; font-size: 11px; white-space: nowrap;">배치</button>
            </div>
        </td>
        <td><input type="number" class="bulk-input bulk-quantity" placeholder="수량" min="1"></td>
        <td><input type="text" class="bulk-input bulk-unit" value="EA"></td>
        <td>
            <select class="bulk-input bulk-payment-method">
                <option value="">\uC120\uD0DD</option>
            </select>
        </td>
        <td><input type="number" class="bulk-input bulk-price" placeholder="금액" min="0" step="0.01"></td>
        <td><input type="date" class="bulk-input bulk-date"></td>
        <td><input type="text" class="bulk-input bulk-description" placeholder="설명"></td>
        <td><input type="text" class="bulk-input bulk-note" placeholder="비고(실제 파트넘버)"></td>
    `;
    tbody.appendChild(tr);

    // 날짜 기본값 설정
    tr.querySelector('.bulk-date').value = new Date().toISOString().split('T')[0];

    // 캐비닷 위치 입력 정규화 (blur 시 A2 -> A-2)
    attachCabinetNormalizer(tr.querySelector('.bulk-cabinet-location'));


    // 카테고리 로드
    loadCategoriesForBulk();
    loadPaymentMethodsForBulk();
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
                option.textContent = category.categoryName;
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
            option.textContent = category.categoryName;
            bulkSelect.appendChild(option);
        });
        // 이전 선택 값이 있으면 복원
        if (currentValue && bulkSelect.querySelector(`option[value="${currentValue}"]`)) {
            bulkSelect.value = currentValue;
        }
    }
}

async function loadPaymentMethodsForBulk() {
    if (paymentMethodsData.length === 0) {
        await loadPaymentMethods();
    }

    document.querySelectorAll('.bulk-payment-method').forEach(select => {
        if (select.children.length <= 1) {
            paymentMethodsData.forEach(method => {
                const option = document.createElement('option');
                option.value = method.categoryId;
                option.textContent = method.categoryName;
                select.appendChild(option);
            });
        }
    });
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

function normalizeCabinetLocationValue(value) {
    if (!value) return '';
    const trimmed = value.trim().toUpperCase();
    if (/^[A-Z]{1,2}-\d+$/.test(trimmed)) return trimmed;
    const match = /^([A-Z]{1,2})(\d+)$/.exec(trimmed);
    if (match) return `${match[1]}-${match[2]}`;
    return trimmed;
}

function attachCabinetNormalizer(inputEl) {
    if (!inputEl) return;
    const handler = () => {
        const normalized = normalizeCabinetLocationValue(inputEl.value);
        if (inputEl.value !== normalized) {
            const pos = inputEl.selectionStart;
            inputEl.value = normalized;
            inputEl.selectionStart = inputEl.selectionEnd = normalized.length;
        }
    };
    inputEl.addEventListener('blur', handler);
    inputEl.addEventListener('input', handler);
}

async function submitBulkInsert() {
    const tbody = document.getElementById('bulkInsertTableBody');
    const rows = tbody.querySelectorAll('tr');
    const dataList = [];

    // 입력된 행만 수집
    for (const row of rows) {
        const partNumber = row.querySelector('.bulk-part-number').value.trim();
        const categoryId = row.querySelector('.bulk-category').value;
        const partName = row.querySelector('.bulk-part-name').value.trim();
        const cabinetLocation = normalizeCabinetLocationValue(row.querySelector('.bulk-cabinet-location').value);
        const mapLocation = row.querySelector('.bulk-map-location').value.trim();
        const quantity = row.querySelector('.bulk-quantity').value;
        const unit = row.querySelector('.bulk-unit').value.trim();
        const paymentMethodId = row.querySelector('.bulk-payment-method').value;
        const price = row.querySelector('.bulk-price').value;
        const date = row.querySelector('.bulk-date').value;
        const description = row.querySelector('.bulk-description').value.trim();
        const note = row.querySelector('.bulk-note').value.trim();

        // 필수 항목: 부품번호, 카테고리, 부품명, 수량, 금액, 구매일자, 설명
        if (partNumber && categoryId && paymentMethodId && partName && quantity && price && date && description) {
            const data = {
                partNumber: partNumber,
                categoryId: parseInt(categoryId),
                partName: partName,
                cabinetLocation: cabinetLocation || null,
                mapLocation: mapLocation || null,
                incomingQuantity: parseInt(quantity),
                unit: unit || 'EA',
                paymentMethodId: parseInt(paymentMethodId),
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
            '\uC785\uACE0ID': item.incomingId,
            '\uCE74\uD14C\uACE0\uB9AC': item.categoryName,
            '\uBD80\uD488\uBC88\uD638': item.partNumber,
            '\uBD80\uD488\uBA85': item.partName,
            '\uC124\uBA85': item.description,
            '\uC785\uACE0\uC218\uB7C9': item.incomingQuantity,
            '\uB2E8\uC704': item.unit,
            '\uACB0\uC81C\uC218\uB2E8': item.paymentMethodName || '',
            '\uD1B5\uD654': item.currency,
            '\uC678\uD654\uB2E8\uAC00': item.originalPrice,
            '\uD658\uC728': item.exchangeRate,
            '\uAD6C\uB9E4\uAE08\uC561': item.purchasePrice,
            '\uACF5\uAE09\uC5C5\uCCB4': item.supplier,
            '\uC785\uACE0\uC77C': item.incomingDate,
            '\uB4F1\uB85D\uC77C\uC2DC': item.createdAt,
            '\uBE44\uACE0': item.remarks
        }));

        const headers = ['\uC785\uACE0ID', '\uCE74\uD14C\uACE0\uB9AC', '\uBD80\uD488\uBC88\uD638', '\uBD80\uD488\uBA85', '\uC124\uBA85', '\uC785\uACE0\uC218\uB7C9', '\uB2E8\uC704', '\uACB0\uC81C\uC218\uB2E8', '\uD1B5\uD654', '\uC678\uD654\uB2E8\uAC00', '\uD658\uC728', '\uAD6C\uB9E4\uAE08\uC561', '\uACF5\uAE09\uC5C5\uCCB4', '\uC785\uACE0\uC77C', '\uB4F1\uB85D\uC77C\uC2DC', '\uBE44\uACE0'];

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

function logout() {
    if (confirm('로그아웃하시겠습니까?')) {
        window.location.href = '/logout';
    }
}

// ==================== 내 정보 ====================
let currentUserInfo = null;

async function openMyProfileModal() {
    try {
        // 현재 사용자 정보 조회
        const response = await fetch('/livewalk/auth/current-user');
        if (response.ok) {
            const data = await response.json();
            currentUserInfo = data;

            // 폼에 현재 정보 설정
            document.getElementById('myUsername').value = data.username || '';
            document.getElementById('myFullName').value = data.fullName || '';

            // 비밀번호 필드 초기화
            document.getElementById('myCurrentPassword').value = '';
            document.getElementById('myNewPassword').value = '';
            document.getElementById('myNewPasswordConfirm').value = '';

            // 모달 표시
            document.getElementById('myProfileModal').style.display = 'block';
        } else {
            showMessage('사용자 정보를 불러올 수 없습니다.', 'error');
        }
    } catch (error) {
        showMessage('사용자 정보 조회 오류: ' + error.message, 'error');
    }
}

function closeMyProfileModal() {
    document.getElementById('myProfileModal').style.display = 'none';
}

async function updateMyProfile() {
    const fullName = document.getElementById('myFullName').value;
    const currentPassword = document.getElementById('myCurrentPassword').value;
    const newPassword = document.getElementById('myNewPassword').value;
    const newPasswordConfirm = document.getElementById('myNewPasswordConfirm').value;

    if (!fullName) {
        alert('이름을 입력해주세요.');
        return;
    }

    // 비밀번호 변경 검증
    if (newPassword || newPasswordConfirm || currentPassword) {
        if (!currentPassword) {
            alert('비밀번호를 변경하려면 현재 비밀번호를 입력해주세요.');
            return;
        }
        if (!newPassword) {
            alert('새 비밀번호를 입력해주세요.');
            return;
        }
        if (newPassword !== newPasswordConfirm) {
            alert('새 비밀번호가 일치하지 않습니다.');
            return;
        }
        if (newPassword.length < 4) {
            alert('비밀번호는 최소 4자 이상이어야 합니다.');
            return;
        }
    }

    const updateData = {
        userId: currentUserInfo.userId,
        fullName: fullName
    };

    // 비밀번호 변경이 있는 경우에만 추가
    if (currentPassword && newPassword) {
        updateData.currentPassword = currentPassword;
        updateData.password = newPassword;
    }

    try {
        const response = await fetch(`/livewalk/users/${currentUserInfo.userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        if (response.ok) {
            showMessage('정보가 수정되었습니다.', 'success');
            closeMyProfileModal();
        } else {
            const error = await response.json();
            showMessage('정보 수정 실패: ' + error.message, 'error');
        }
    } catch (error) {
        showMessage('정보 수정 오류: ' + error.message, 'error');
    }
}

// ==================== 자료실 ====================
const LIBRARY_API = '/livewalk/library';

function openLibraryModal() {
    document.getElementById('libraryModal').style.display = 'block';
    loadLibraryImages();
}

function closeLibraryModal() {
    document.getElementById('libraryModal').style.display = 'none';
    document.getElementById('libraryTitle').value = '';
    document.getElementById('libraryDescription').value = '';
    document.getElementById('libraryFileInput').value = '';
}

async function loadLibraryImages() {
    try {
        const response = await fetch(LIBRARY_API);
        if (!response.ok) throw new Error('자료 목록을 불러올 수 없습니다.');

        const images = await response.json();
        displayLibraryImages(images);
    } catch (error) {
        showMessage('자료 목록 조회 실패: ' + error.message, 'error');
    }
}

function displayLibraryImages(images) {
    const container = document.getElementById('libraryListContainer');

    if (!images || images.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999;">등록된 자료가 없습니다.</p>';
        return;
    }

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;">
            ${images.map(img => {
        const isPdf = img.fileType === 'pdf';
        const previewHtml = isPdf
            ? `<canvas id="libraryPdfCanvas_${img.imageId}"
                              style="width: 100%; height: 200px; border-radius: 4px; cursor: pointer; background: #f5f5f5;"
                              onclick="window.open('/uploads/images/${img.fileName}', '_blank')"></canvas>`
            : `<img src="/uploads/images/${img.fileName}"
                           alt="${img.title}"
                           style="width: 100%; height: 200px; object-fit: cover; border-radius: 4px; cursor: pointer;"
                           onclick="window.open('/uploads/images/${img.fileName}', '_blank')">`;

        return `
                    <div style="border: 1px solid #ddd; border-radius: 5px; padding: 10px; background: #f9f9f9;">
                        ${previewHtml}
                        <h4 style="margin: 10px 0 5px 0; font-size: 14px;">${img.title} ${isPdf ? '[PDF]' : ''}</h4>
                        <p style="margin: 0 0 10px 0; font-size: 12px; color: #666;">${img.description || ''}</p>
                        <div style="font-size: 11px; color: #999; margin-bottom: 10px;">
                            업로드: ${formatDateTime(img.uploadedAt)}
                        </div>
                        <button onclick="deleteLibraryImage(${img.imageId}, '${img.title}')" class="btn btn-gray" style="width: 100%; padding: 5px; font-size: 12px;">삭제</button>
                    </div>
                `;
    }).join('')}
        </div>
    `;

    // PDF 미리보기 렌더링
    images.forEach(img => {
        if (img.fileType === 'pdf') {
            renderLibraryPdfPreview(img.imageId, img.fileName);
        }
    });
}

// 자료실 PDF 미리보기 렌더링
async function renderLibraryPdfPreview(imageId, fileName) {
    try {
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        const pdfUrl = `/uploads/images/${fileName}`;
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        const canvas = document.getElementById(`libraryPdfCanvas_${imageId}`);
        if (!canvas) return;

        const context = canvas.getContext('2d');

        // Canvas를 200px 높이에 맞춰 스케일 조정
        const desiredHeight = 200;
        const viewport = page.getViewport({ scale: 1.0 });
        const scale = desiredHeight / viewport.height;
        const scaledViewport = page.getViewport({ scale: scale });

        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;

        const renderContext = {
            canvasContext: context,
            viewport: scaledViewport
        };
        await page.render(renderContext).promise;
    } catch (error) {
        console.error(`PDF 미리보기 렌더링 오류 (${fileName}):`, error);
        // 오류 시 PDF 아이콘 표시
        const canvas = document.getElementById(`libraryPdfCanvas_${imageId}`);
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('📄', canvas.width / 2, canvas.height / 2);
        }
    }
}

async function uploadLibraryImage() {
    const title = document.getElementById('libraryTitle').value.trim();
    const description = document.getElementById('libraryDescription').value.trim();
    const fileInput = document.getElementById('libraryFileInput');

    if (!title) {
        showMessage('제목을 입력해주세요.', 'error');
        return;
    }

    if (!fileInput.files || fileInput.files.length === 0) {
        showMessage('사진 파일을 선택해주세요.', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('file', fileInput.files[0]);

    try {
        const response = await fetch(LIBRARY_API, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('업로드 실패');

        showMessage('자료가 등록되었습니다.', 'success');
        document.getElementById('libraryTitle').value = '';
        document.getElementById('libraryDescription').value = '';
        document.getElementById('libraryFileInput').value = '';
        loadLibraryImages();
    } catch (error) {
        showMessage('업로드 실패: ' + error.message, 'error');
    }
}

async function deleteLibraryImage(imageId, title) {
    if (!confirm(`"${title}" 자료를 삭제하시겠습니까?`)) return;

    try {
        const response = await fetch(`${LIBRARY_API}/${imageId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('삭제 실패');

        showMessage('자료가 삭제되었습니다.', 'success');
        loadLibraryImages();
    } catch (error) {
        showMessage('삭제 실패: ' + error.message, 'error');
    }
}

function formatDateTime(dateTime) {
    if (!dateTime) return '';
    return dateTime.replace('T', ' ').substring(0, 19);
}

// ==================== 도면 좌표 마킹 (UI 준비) ====================
let mapSpotImagesCache = [];
let mapSpotMarkers = [];
let mapSpotBaseImageData = null;
let mapSpotSelectedImage = null;
let mapSpotRegisterEnabled = false;
let mapSpotTargetInputElement = null; // 배치 선택 시 값을 넣을 input 요소

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
            selectEl.innerHTML = '<option value=\"\">-- 자료가 없습니다 --</option>';
            statusEl.textContent = '설명에 "도면"이 포함된 자료가 없습니다.';
            renderMapSpotPreview(null);
            return;
        }

        selectEl.innerHTML = filtered.map(img => {
            const typeLabel = (img.fileType || 'img').toString().toUpperCase();
            return `<option value=\"${img.imageId}\">${img.title} (${typeLabel})</option>`;
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
        tbody.innerHTML = '<tr><td colspan=\"7\" style=\"text-align: center; color: #888; padding: 8px;\">좌표를 클릭해 추가하고, 구역명/크기/설명을 설정하세요.</td></tr>';
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

function submitMapSpotMarkers() {
    if (!mapSpotSelectedImage) {
        showMessage('이미지를 먼저 선택하세요.', 'warning');
        return;
    }
    if (mapSpotMarkers.length === 0) {
        showMessage('등록할 좌표가 없습니다. 이미지를 클릭해 좌표를 추가하세요.', 'warning');
        return;
    }

    const payload = mapSpotMarkers.map(marker => ({
        imageId: mapSpotSelectedImage.imageId,
        spotName: marker.name || '',
        posX: marker.x,
        posY: marker.y,
        radius: marker.radius || 20,
        description: marker.desc || ''
    }));

    fetch('/livewalk/map-spot/bulk', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
        .then(response => {
            if (!response.ok) throw new Error('등록 실패');
            showMessage('좌표가 등록되었습니다.', 'success');
        })
        .catch(err => {
            showMessage('좌표 등록 실패: ' + err.message, 'error');
        });
}


// ==================== 도면 위치 선택 (Location Picker) ====================
let locationPickerImagesCache = [];
let locationPickerSelectedImage = null;
let locationPickerBaseImageData = null;
let locationPickerMarkers = [];
let locationPickerTargetInput = null;

function openLocationPicker(buttonElement) {
    // 버튼의 행에서 도면 위치 입력 필드 찾기
    const row = buttonElement.closest('tr');
    locationPickerTargetInput = row.querySelector('.bulk-map-location');

    document.getElementById('locationPickerModal').style.display = 'block';
    loadLocationPickerImages();
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

function handleLocationPickerCanvasClick(event) {
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

    if (clickedMarker && locationPickerTargetInput) {
        // 층 추출 (이미지 title에서 숫자 추출)
        const floorMatch = locationPickerSelectedImage.title.match(/\d+/);
        const floor = floorMatch ? floorMatch[0] : '';

        // 층-구역이름 형식으로 입력
        const locationCode = floor ? `${floor}-${clickedMarker.name}` : clickedMarker.name;
        locationPickerTargetInput.value = locationCode;

        showMessage(`위치 선택됨: ${locationCode}`, 'success');
        closeLocationPicker();
    }
}











// ==================== Canvas 기반 문서 편집 ====================

let currentTemplateImage = null;

// 템플릿 선택 시 Canvas에 이미지 로드
// 템플릿 선택 시 Canvas에 이미지 로드 (A4 크기 고정)
async function loadTemplateToCanvas() {
    const templateSelect = document.getElementById('templateSelect');
    const selectedOption = templateSelect.options[templateSelect.selectedIndex];

    if (!selectedOption.value) {
        return;
    }

    const fileName = selectedOption.dataset.fileName;
    const fileType = selectedOption.dataset.fileType;

    // 이미지 파일만 지원
    if (fileType === 'pdf') {
        alert('Canvas 편집은 이미지 파일만 지원합니다. PDF 파일은 선택할 수 없습니다.');
        templateSelect.selectedIndex = 0;
        return;
    }

    const canvas = document.getElementById('documentCanvas');
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.onload = function () {
        currentTemplateImage = img;

        // Canvas 크기를 이미지 원본 크기에 맞춤
        canvas.width = img.width;
        canvas.height = img.height;

        // 배경 흰색으로 채우기
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 이미지를 원본 크기 그대로 그리기 (좌상단 0,0부터)
        ctx.drawImage(img, 0, 0);

        redrawCanvas();

        // 저장된 필드 설정 자동 불러오기
        const imageId = parseInt(selectedOption.value);
        loadFieldCoordinatesFromDB(imageId);
    };
    img.src = `/livewalk/library/image/${fileName}`;
}

// 필드 행 추가
function addCanvasField() {
    const tbody = document.getElementById('canvasFieldsTableBody');
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td style="border: 1px solid #dee2e6; padding: 4px;">
            <input type="text" class="canvas-field-value" oninput="redrawCanvas()" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;" placeholder="텍스트 입력">
        </td>
        <td style="border: 1px solid #dee2e6; padding: 4px;">
            <input type="number" class="canvas-field-x" value="100" oninput="redrawCanvas()" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;">
        </td>
        <td style="border: 1px solid #dee2e6; padding: 4px;">
            <input type="number" class="canvas-field-y" value="100" oninput="redrawCanvas()" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;">
        </td>
        <td style="border: 1px solid #dee2e6; padding: 4px;">
            <input type="number" class="canvas-field-fontsize" value="20" oninput="redrawCanvas()" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;">
        </td>
        <td style="border: 1px solid #dee2e6; padding: 4px; text-align: center;">
            <button type="button" onclick="removeCanvasField(this)" style="padding: 4px 8px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">×</button>
        </td>
    `;
    tbody.appendChild(newRow);
}

// 필드 행 삭제
function removeCanvasField(button) {
    const tbody = document.getElementById('canvasFieldsTableBody');
    if (tbody.rows.length > 1) {
        button.closest('tr').remove();
        redrawCanvas();
    } else {
        alert('최소 1개의 필드는 필요합니다.');
    }
}


// Canvas 다시 그리기 (A4 크기 고정)
function redrawCanvas() {
    const canvas = document.getElementById('documentCanvas');
    const ctx = canvas.getContext('2d');

    // Canvas 실제 크기 사용 (이미지에 맞춰 동적으로 설정됨)
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Canvas 초기화
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 눈금선 그리기 (50px 간격)
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;

    // 세로 눈금선
    for (let x = 0; x <= canvasWidth; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();
    }

    // 가로 눈금선
    for (let y = 0; y <= canvasHeight; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();
    }

    // 100px 간격 눈금선 (진하게)
    ctx.strokeStyle = '#c0c0c0';
    ctx.lineWidth = 1;

    // 세로 눈금선 (100px)
    for (let x = 0; x <= canvasWidth; x += 100) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();
    }

    // 가로 눈금선 (100px)
    for (let y = 0; y <= canvasHeight; y += 100) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();
    }

    // 이미지가 있으면 원본 크기로 그리기
    if (currentTemplateImage) {
        ctx.drawImage(currentTemplateImage, 0, 0);
    }

    // 모든 텍스트 필드 그리기
    const tbody = document.getElementById('canvasFieldsTableBody');
    if (tbody) {
        const rows = tbody.querySelectorAll('tr');

        rows.forEach(row => {
            // 필드명 또는 텍스트 값 확인
            const labelInput = row.querySelector('.canvas-field-label');
            const valueInput = row.querySelector('.canvas-field-value');
            const value = labelInput ? labelInput.value : (valueInput ? valueInput.value : '');

            const x = parseFloat(row.querySelector('.canvas-field-x').value) || 0;
            const y = parseFloat(row.querySelector('.canvas-field-y').value) || 0;
            const fontSize = parseInt(row.querySelector('.canvas-field-fontsize').value) || 14;

            // 필드 타입 확인
            const fieldType = row.dataset.fieldType;

            if (fieldType === 'table') {
                // 표 타입 필드 처리
                const tableDataInput = row.querySelector('.canvas-field-tabledata');
                if (tableDataInput && tableDataInput.value) {
                    try {
                        const tableData = JSON.parse(tableDataInput.value);
                        const { columns, widths, height } = tableData;

                        console.log('표 그리기:', { x, y, columns, widths, height });

                        // 표 배경 먼저 그리기 (더 잘 보이게)
                        ctx.fillStyle = 'rgba(23, 162, 184, 0.1)';
                        let currentX = x;
                        for (let i = 0; i < columns; i++) {
                            const cellWidth = widths[i];
                            ctx.fillRect(currentX, y, cellWidth, height);
                            currentX += cellWidth;
                        }

                        // 표 테두리 그리기 (더 굵게)
                        ctx.strokeStyle = '#17a2b8';
                        ctx.lineWidth = 3;
                        currentX = x;
                        // 각 칸 그리기
                        for (let i = 0; i < columns; i++) {
                            const cellWidth = widths[i];
                            ctx.strokeRect(currentX, y, cellWidth, height);
                            currentX += cellWidth;
                        }
                    } catch (e) {
                        console.error('표 데이터 파싱 오류:', e);
                    }
                }
            } else if (fieldType === 'box') {
                // 박스 타입 필드 처리
                const boxSizeInput = row.querySelector('.canvas-field-boxsize');
                if (boxSizeInput && boxSizeInput.value) {
                    const sizeMatch = boxSizeInput.value.match(/(\d+)x(\d+)/);
                    if (sizeMatch) {
                        const boxWidth = parseInt(sizeMatch[1]);
                        const boxHeight = parseInt(sizeMatch[2]);

                        // 박스 테두리 그리기
                        ctx.strokeStyle = '#007bff';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(x, y, boxWidth, boxHeight);

                        // 박스 내부 반투명 채우기
                        ctx.fillStyle = 'rgba(0, 123, 255, 0.05)';
                        ctx.fillRect(x, y, boxWidth, boxHeight);

                        // 텍스트가 있으면 좌측중앙에 그리기
                        if (value) {
                            ctx.font = `${fontSize}px Arial`;
                            ctx.fillStyle = 'red';
                            ctx.textBaseline = 'middle'; // 세로 중앙 정렬
                            ctx.fillText(value, x + 10, y + boxHeight / 2); // 좌측에서 10px 여백, 세로 중앙
                            ctx.textBaseline = 'alphabetic'; // 기본값으로 복원
                        }
                    }
                }
            } else {
                // 일반 포인트 타입 필드 처리
                const lineWidthInput = row.querySelector('.canvas-field-linewidth');
                const lineWidth = lineWidthInput ? parseInt(lineWidthInput.value) || 0 : 0;

                if (value) {
                    ctx.font = `${fontSize}px Arial`;
                    ctx.fillStyle = 'red'; // 필드 위치 표시용 (빨간색)
                    ctx.fillText(value, x, y);

                    // 선 그리기 (lineWidth가 0보다 크면)
                    if (lineWidth > 0) {
                        ctx.strokeStyle = 'black';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(x, y + 2); // 텍스트 바로 아래
                        ctx.lineTo(x + lineWidth, y + 2);
                        ctx.stroke();
                    }

                    // 필드 위치에 작은 마커 표시
                    ctx.fillStyle = 'blue';
                    ctx.beginPath();
                    ctx.arc(x, y, 3, 0, 2 * Math.PI);
                    ctx.fill();
                }
            }
        });
    }

    // 드래그 박스/표 프리뷰 그리기
    if ((editorDragMode || editorTableMode) && editorDragStart && editorDragEnd) {
        const startX = Math.min(editorDragStart.x, editorDragEnd.x);
        const startY = Math.min(editorDragStart.y, editorDragEnd.y);
        const width = Math.abs(editorDragEnd.x - editorDragStart.x);
        const height = Math.abs(editorDragEnd.y - editorDragStart.y);

        if (editorTableMode) {
            // 표 프리뷰
            ctx.strokeStyle = 'rgba(23, 162, 184, 0.8)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);

            // 각 칸 그리기
            const cellWidth = width / editorTableColumns;
            for (let i = 0; i < editorTableColumns; i++) {
                ctx.strokeRect(startX + (i * cellWidth), startY, cellWidth, height);
            }
            ctx.setLineDash([]);

            // 표 내부 반투명 채우기
            ctx.fillStyle = 'rgba(23, 162, 184, 0.1)';
            ctx.fillRect(startX, startY, width, height);

            // 크기 표시
            ctx.fillStyle = 'black';
            ctx.font = '12px Arial';
            ctx.fillText(`${editorTableColumns}칸: ${Math.round(width)}x${Math.round(height)}`, startX + 10, startY - 10);
        } else {
            // 박스 프리뷰
            ctx.strokeStyle = 'rgba(0, 123, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(startX, startY, width, height);
            ctx.setLineDash([]);

            // 박스 내부 반투명 채우기
            ctx.fillStyle = 'rgba(0, 123, 255, 0.1)';
            ctx.fillRect(startX, startY, width, height);

            // 중앙 좌표 표시
            const centerX = Math.round((editorDragStart.x + editorDragEnd.x) / 2);
            const centerY = Math.round((editorDragStart.y + editorDragEnd.y) / 2);

            ctx.fillStyle = 'red';
            ctx.beginPath();
            ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
            ctx.fill();

            // 좌표 텍스트
            ctx.fillStyle = 'black';
            ctx.font = '12px Arial';
            ctx.fillText(`(${centerX}, ${centerY})`, centerX + 10, centerY - 10);
        }
    }

    // 선택된 필드 강조 표시
    if (editorEditMode && editorSelectedField) {
        const fieldType = editorSelectedField.dataset.fieldType;
        const x = parseInt(editorSelectedField.querySelector('.canvas-field-x').value);
        const y = parseInt(editorSelectedField.querySelector('.canvas-field-y').value);

        if (fieldType === 'box') {
            const boxSizeInput = editorSelectedField.querySelector('.canvas-field-boxsize');
            if (boxSizeInput && boxSizeInput.value) {
                const sizeMatch = boxSizeInput.value.match(/(\d+)x(\d+)/);
                if (sizeMatch) {
                    const width = parseInt(sizeMatch[1]);
                    const height = parseInt(sizeMatch[2]);

                    // 선택 테두리 (점선)
                    ctx.strokeStyle = '#ffc107';
                    ctx.lineWidth = 3;
                    ctx.setLineDash([10, 5]);
                    ctx.strokeRect(x, y, width, height);
                    ctx.setLineDash([]);

                    // 크기 조절 핸들 (우하단)
                    ctx.fillStyle = '#ffc107';
                    ctx.fillRect(x + width - 8, y + height - 8, 16, 16);
                }
            }
        } else if (fieldType === 'table') {
            const tableDataInput = editorSelectedField.querySelector('.canvas-field-tabledata');
            if (tableDataInput && tableDataInput.value) {
                try {
                    const tableData = JSON.parse(tableDataInput.value);
                    const totalWidth = tableData.widths.reduce((sum, w) => sum + w, 0);
                    const height = tableData.height;

                    // 선택 테두리 (점선)
                    ctx.strokeStyle = '#ffc107';
                    ctx.lineWidth = 3;
                    ctx.setLineDash([10, 5]);
                    ctx.strokeRect(x, y, totalWidth, height);
                    ctx.setLineDash([]);

                    // 크기 조절 핸들 (우하단)
                    ctx.fillStyle = '#ffc107';
                    ctx.fillRect(x + totalWidth - 8, y + height - 8, 16, 16);
                } catch (e) { }
            }
        }
    }
}

// ==================== 카테고리 전환 ====================

let currentCategory = 'parts'; // 기본값: 부품

// 카테고리 전환
function switchCategory(category) {
    currentCategory = category;

    const partsSections = document.querySelectorAll('.parts-section');
    const docsSections = document.querySelectorAll('.docs-section');
    const partsBtn = document.getElementById('categoryBtnParts');
    const docsBtn = document.getElementById('categoryBtnDocs');

    if (category === 'parts') {
        // 부품 섹션 보이기
        partsSections.forEach(section => section.style.display = 'block');
        docsSections.forEach(section => section.style.display = 'none');

        // 버튼 스타일 변경
        partsBtn.style.background = '#007bff';
        partsBtn.style.color = 'white';
        docsBtn.style.background = 'white';
        docsBtn.style.color = '#007bff';
    } else {
        // 문서 섹션 보이기
        partsSections.forEach(section => section.style.display = 'none');
        docsSections.forEach(section => section.style.display = 'block');

        // 버튼 스타일 변경
        docsBtn.style.background = '#007bff';
        docsBtn.style.color = 'white';
        partsBtn.style.background = 'white';
        partsBtn.style.color = '#007bff';

        // 문서 목록 로드
        loadAllDocuments();
    }
}

// 모든 문서 목록 로드 (입고 ID 없이)
async function loadAllDocuments() {
    try {
        // 서버에서 모든 문서 가져오는 API가 필요함
        // 임시로 빈 목록 표시
        const container = document.getElementById('documentsListContainer');
        container.innerHTML = '<p style="color: #999;">문서 목록을 불러오는 중...</p>';

        // TODO: 서버에서 모든 문서 목록 가져오기
        // const response = await fetch('/livewalk/documents/all');
        // if (response.ok) {
        //     const documents = await response.json();
        //     displayDocumentsList(documents);
        // }
    } catch (error) {
        console.error('문서 목록 로딩 오류:', error);
    }
}

// ==================== 템플릿 에디터 ====================

// 에디터 상태 관리
let editorZoom = 1.0;
let editorSnapEnabled = true;
let editorSnapSize = 1; // 기본값 1px (세밀한 조정)
let editorDragMode = false;
let editorDragStart = null;
let editorDragEnd = null;

// 표 모드
let editorTableMode = false;
let editorTableColumns = 3; // 기본 칸 수

// 수정 모드
let editorEditMode = false;
let editorSelectedField = null; // 선택된 필드의 행 (tr 요소)
let editorResizeHandle = null; // 'se' (southeast corner)

// 스냅 기능 (좌표를 격자에 붙임)
function snapToGrid(value, gridSize = editorSnapSize) {
    return Math.round(value / gridSize) * gridSize;
}

// Canvas 마우스 이동 이벤트 (가이드라인 표시)
function handleCanvasMouseMove(event) {
    if ((editorDragMode || editorTableMode) && editorDragStart) {
        // 드래그/표 모드에서는 영역 표시
        const canvas = document.getElementById('documentCanvas');
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        editorDragEnd = {
            x: Math.round((event.clientX - rect.left) * scaleX),
            y: Math.round((event.clientY - rect.top) * scaleY)
        };

        redrawCanvas();
        return;
    }

    const canvas = document.getElementById('documentCanvas');
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let mouseX = Math.round((event.clientX - rect.left) * scaleX);
    let mouseY = Math.round((event.clientY - rect.top) * scaleY);

    // 스냅 적용
    if (editorSnapEnabled) {
        mouseX = snapToGrid(mouseX);
        mouseY = snapToGrid(mouseY);
    }

    // 좌표 표시 업데이트
    const coordDisplay = document.getElementById('canvasCoordDisplay');
    if (coordDisplay) {
        coordDisplay.textContent = `X: ${mouseX}, Y: ${mouseY}`;
    }

    // 가이드라인 그리기
    redrawCanvas();
    const ctx = canvas.getContext('2d');

    // 십자 가이드라인
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    // 세로선
    ctx.beginPath();
    ctx.moveTo(mouseX, 0);
    ctx.lineTo(mouseX, canvas.height);
    ctx.stroke();

    // 가로선
    ctx.beginPath();
    ctx.moveTo(0, mouseY);
    ctx.lineTo(canvas.width, mouseY);
    ctx.stroke();

    ctx.setLineDash([]);
}

// Canvas 마우스 다운 (드래그 시작)
function handleCanvasMouseDown(event) {
    if (!editorDragMode && !editorTableMode && !editorEditMode) return;

    const canvas = document.getElementById('documentCanvas');
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    editorDragStart = {
        x: Math.round((event.clientX - rect.left) * scaleX),
        y: Math.round((event.clientY - rect.top) * scaleY)
    };

    // 수정 모드: 크기 조절 핸들 확인
    if (editorEditMode && editorSelectedField) {
        editorResizeHandle = checkResizeHandle(editorDragStart.x, editorDragStart.y);
    }

    editorDragEnd = null;
}

// 크기 조절 핸들 확인
function checkResizeHandle(clickX, clickY) {
    if (!editorSelectedField) return null;

    const fieldType = editorSelectedField.dataset.fieldType;
    const x = parseInt(editorSelectedField.querySelector('.canvas-field-x').value);
    const y = parseInt(editorSelectedField.querySelector('.canvas-field-y').value);

    let width = 0, height = 0;

    if (fieldType === 'box') {
        const boxSizeInput = editorSelectedField.querySelector('.canvas-field-boxsize');
        if (boxSizeInput && boxSizeInput.value) {
            const sizeMatch = boxSizeInput.value.match(/(\d+)x(\d+)/);
            if (sizeMatch) {
                width = parseInt(sizeMatch[1]);
                height = parseInt(sizeMatch[2]);
            }
        }
    } else if (fieldType === 'table') {
        const tableDataInput = editorSelectedField.querySelector('.canvas-field-tabledata');
        if (tableDataInput && tableDataInput.value) {
            try {
                const tableData = JSON.parse(tableDataInput.value);
                width = tableData.widths.reduce((sum, w) => sum + w, 0);
                height = tableData.height;
            } catch (e) { }
        }
    }

    // 우하단 모서리 근처인지 확인 (10px 범위)
    const cornerX = x + width;
    const cornerY = y + height;
    if (Math.abs(clickX - cornerX) < 10 && Math.abs(clickY - cornerY) < 10) {
        return 'se'; // southeast corner
    }

    return null;
}

// Canvas 마우스 업 (드래그 종료)
function handleCanvasMouseUp(event) {
    if ((!editorDragMode && !editorTableMode && !editorEditMode) || !editorDragStart) return;

    const canvas = document.getElementById('documentCanvas');
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    editorDragEnd = {
        x: Math.round((event.clientX - rect.left) * scaleX),
        y: Math.round((event.clientY - rect.top) * scaleY)
    };

    // 수정 모드: 이동 또는 크기 조절
    if (editorEditMode && editorSelectedField && editorDragStart && editorDragEnd) {
        const deltaX = editorDragEnd.x - editorDragStart.x;
        const deltaY = editorDragEnd.y - editorDragStart.y;

        if (editorResizeHandle === 'se') {
            // 크기 조절
            resizeSelectedField(deltaX, deltaY);
        } else if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
            // 이동 (최소 2px 이상 이동했을 때만)
            moveSelectedField(deltaX, deltaY);
        }

        editorResizeHandle = null;
        editorDragStart = null;
        editorDragEnd = null;
        redrawCanvas();
        return;
    }

    // 박스의 시작점과 크기 계산
    const boxX = Math.min(editorDragStart.x, editorDragEnd.x);
    const boxY = Math.min(editorDragStart.y, editorDragEnd.y);
    const boxWidth = Math.abs(editorDragEnd.x - editorDragStart.x);
    const boxHeight = Math.abs(editorDragEnd.y - editorDragStart.y);

    if (editorTableMode) {
        // 표 모드: 표 추가
        addTableToCanvas(boxX, boxY, boxWidth, boxHeight, editorTableColumns);
    } else if (editorDragMode) {
        // 박스 모드: 박스 필드 추가
        const fieldName = prompt(`박스 영역: ${boxWidth}x${boxHeight}\n필드명을 입력하세요 (빈칸: 박스만 그리기):`);
        if (fieldName !== null) { // 취소가 아니면
            addBoxToTable(fieldName.trim(), boxX, boxY, boxWidth, boxHeight);
        }
    }

    // 드래그 상태 초기화
    editorDragStart = null;
    editorDragEnd = null;
    redrawCanvas();
}

// 선택된 필드 이동
function moveSelectedField(deltaX, deltaY) {
    if (!editorSelectedField) return;

    const xInput = editorSelectedField.querySelector('.canvas-field-x');
    const yInput = editorSelectedField.querySelector('.canvas-field-y');

    xInput.value = parseInt(xInput.value) + deltaX;
    yInput.value = parseInt(yInput.value) + deltaY;

    showMessage('필드 이동됨', 'success');
}

// 선택된 필드 크기 조절
function resizeSelectedField(deltaX, deltaY) {
    if (!editorSelectedField) return;

    const fieldType = editorSelectedField.dataset.fieldType;

    if (fieldType === 'box') {
        const boxSizeInput = editorSelectedField.querySelector('.canvas-field-boxsize');
        if (boxSizeInput && boxSizeInput.value) {
            const sizeMatch = boxSizeInput.value.match(/(\d+)x(\d+)/);
            if (sizeMatch) {
                const newWidth = Math.max(10, parseInt(sizeMatch[1]) + deltaX);
                const newHeight = Math.max(10, parseInt(sizeMatch[2]) + deltaY);
                boxSizeInput.value = `${newWidth}x${newHeight}`;
                showMessage(`박스 크기 조절: ${newWidth}x${newHeight}`, 'success');
            }
        }
    } else if (fieldType === 'table') {
        const tableDataInput = editorSelectedField.querySelector('.canvas-field-tabledata');
        if (tableDataInput && tableDataInput.value) {
            try {
                const tableData = JSON.parse(tableDataInput.value);
                const oldTotalWidth = tableData.widths.reduce((sum, w) => sum + w, 0);
                const newTotalWidth = Math.max(50, oldTotalWidth + deltaX);
                const newHeight = Math.max(20, tableData.height + deltaY);

                // 각 칸의 너비를 비율에 따라 조정
                const ratio = newTotalWidth / oldTotalWidth;
                tableData.widths = tableData.widths.map(w => Math.floor(w * ratio));
                tableData.height = newHeight;

                tableDataInput.value = JSON.stringify(tableData);
                showMessage(`표 크기 조절: ${newTotalWidth}x${newHeight}`, 'success');
            } catch (e) { }
        }
    }
}

// Canvas 클릭 시 필드 추가
function addFieldAtPosition(event) {
    // 드래그 모드나 표 모드에서는 클릭 무시
    if (editorDragMode || editorTableMode) return;

    const canvas = document.getElementById('documentCanvas');
    const rect = canvas.getBoundingClientRect();

    // Canvas 내 클릭 위치 계산
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let x = Math.round((event.clientX - rect.left) * scaleX);
    let y = Math.round((event.clientY - rect.top) * scaleY);

    // 수정 모드: 필드 선택
    if (editorEditMode) {
        selectFieldAtPosition(x, y);
        return;
    }

    // 스냅 적용
    if (editorSnapEnabled) {
        x = snapToGrid(x);
        y = snapToGrid(y);
    }

    // 필드명 입력 받기
    const fieldName = prompt('필드명을 입력하세요 (예: 날짜, 금액, 공급자명):');
    if (!fieldName || fieldName.trim() === '') {
        return;
    }

    addFieldToTable(fieldName.trim(), x, y);
}

// 특정 위치의 필드 선택
function selectFieldAtPosition(clickX, clickY) {
    const tbody = document.getElementById('canvasFieldsTableBody');
    const rows = tbody.querySelectorAll('tr');

    editorSelectedField = null;

    rows.forEach(row => {
        const fieldType = row.dataset.fieldType;
        const x = parseInt(row.querySelector('.canvas-field-x').value);
        const y = parseInt(row.querySelector('.canvas-field-y').value);

        if (fieldType === 'box') {
            const boxSizeInput = row.querySelector('.canvas-field-boxsize');
            if (boxSizeInput && boxSizeInput.value) {
                const sizeMatch = boxSizeInput.value.match(/(\d+)x(\d+)/);
                if (sizeMatch) {
                    const width = parseInt(sizeMatch[1]);
                    const height = parseInt(sizeMatch[2]);

                    // 박스 영역 안인지 확인
                    if (clickX >= x && clickX <= x + width && clickY >= y && clickY <= y + height) {
                        editorSelectedField = row;
                    }
                }
            }
        } else if (fieldType === 'table') {
            const tableDataInput = row.querySelector('.canvas-field-tabledata');
            if (tableDataInput && tableDataInput.value) {
                try {
                    const tableData = JSON.parse(tableDataInput.value);
                    const totalWidth = tableData.widths.reduce((sum, w) => sum + w, 0);
                    const height = tableData.height;

                    // 표 영역 안인지 확인
                    if (clickX >= x && clickX <= x + totalWidth && clickY >= y && clickY <= y + height) {
                        editorSelectedField = row;
                    }
                } catch (e) { }
            }
        }
    });

    if (editorSelectedField) {
        showMessage('필드 선택됨 - 드래그로 이동 또는 모서리로 크기 조절', 'info');
    }

    redrawCanvas();
}

// 필드를 테이블에 추가하는 공통 함수
function addFieldToTable(fieldName, x, y) {
    const tbody = document.getElementById('canvasFieldsTableBody');
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td style="border: 1px solid #dee2e6; padding: 4px;">
            <input type="text" class="canvas-field-label" value="${escapeHtml(fieldName)}" oninput="redrawCanvas()" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;">
        </td>
        <td style="border: 1px solid #dee2e6; padding: 4px;">
            <input type="number" class="canvas-field-x" value="${x}" oninput="redrawCanvas()" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;">
        </td>
        <td style="border: 1px solid #dee2e6; padding: 4px;">
            <input type="number" class="canvas-field-y" value="${y}" oninput="redrawCanvas()" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;">
        </td>
        <td style="border: 1px solid #dee2e6; padding: 4px;">
            <input type="number" class="canvas-field-fontsize" value="14" oninput="redrawCanvas()" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;">
        </td>
        <td style="border: 1px solid #dee2e6; padding: 4px;">
            <input type="number" class="canvas-field-linewidth" value="0" oninput="redrawCanvas()" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;" placeholder="0" title="0이면 선 없음, 숫자 입력 시 밑줄 표시">
        </td>
        <td style="border: 1px solid #dee2e6; padding: 4px; text-align: center;">
            <button type="button" onclick="removeCanvasField(this)" style="padding: 4px 8px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">×</button>
        </td>
    `;
    tbody.appendChild(newRow);

    // Canvas 다시 그리기
    redrawCanvas();

    showMessage(`필드 "${fieldName}" 추가됨 (X: ${x}, Y: ${y})`, 'success');
}

// 박스를 테이블에 추가하는 함수
function addBoxToTable(fieldName, x, y, width, height) {
    const tbody = document.getElementById('canvasFieldsTableBody');
    const newRow = document.createElement('tr');
    newRow.dataset.fieldType = 'box'; // 박스 타입 표시

    newRow.innerHTML = `
        <td style="border: 1px solid #dee2e6; padding: 4px; background: #fffbf0;">
            <input type="text" class="canvas-field-label" value="${escapeHtml(fieldName)}" oninput="redrawCanvas()" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;" placeholder="(박스)">
        </td>
        <td style="border: 1px solid #dee2e6; padding: 4px;">
            <input type="number" class="canvas-field-x" value="${x}" oninput="redrawCanvas()" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;" title="박스 시작 X">
        </td>
        <td style="border: 1px solid #dee2e6; padding: 4px;">
            <input type="number" class="canvas-field-y" value="${y}" oninput="redrawCanvas()" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;" title="박스 시작 Y">
        </td>
        <td style="border: 1px solid #dee2e6; padding: 4px;">
            <input type="number" class="canvas-field-fontsize" value="14" oninput="redrawCanvas()" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;" title="폰트 크기">
        </td>
        <td style="border: 1px solid #dee2e6; padding: 4px;">
            <input type="text" class="canvas-field-boxsize" value="${width}x${height}" oninput="redrawCanvas()" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;" placeholder="너비x높이" title="박스 크기 (너비x높이)">
        </td>
        <td style="border: 1px solid #dee2e6; padding: 4px; text-align: center;">
            <button type="button" onclick="removeCanvasField(this)" style="padding: 4px 8px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">×</button>
        </td>
    `;
    tbody.appendChild(newRow);

    // Canvas 다시 그리기
    redrawCanvas();

    if (fieldName) {
        showMessage(`박스 "${fieldName}" 추가됨 (${width}x${height})`, 'success');
    } else {
        showMessage(`박스 추가됨 (${width}x${height})`, 'success');
    }
}

// 표 추가
function addTableToCanvas(x, y, totalWidth, height, columns) {
    const tbody = document.getElementById('canvasFieldsTableBody');
    const newRow = document.createElement('tr');
    newRow.dataset.fieldType = 'table'; // 표 타입 표시

    // 칸 너비 계산 (균등 분할)
    const columnWidths = [];
    const cellWidth = Math.floor(totalWidth / columns);
    for (let i = 0; i < columns; i++) {
        columnWidths.push(cellWidth);
    }

    const tableDataJson = JSON.stringify({ columns: columns, widths: columnWidths, height: height });

    console.log('표 추가:', { x, y, totalWidth, height, columns, tableDataJson });

    newRow.innerHTML = `
        <td style="border: 1px solid #dee2e6; padding: 4px; background: #f0f8ff;">
            <input type="text" class="canvas-field-label" value="" oninput="redrawCanvas()" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;" placeholder="(표)">
        </td>
        <td style="border: 1px solid #dee2e6; padding: 4px;">
            <input type="number" class="canvas-field-x" value="${x}" oninput="redrawCanvas()" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;" title="표 시작 X">
        </td>
        <td style="border: 1px solid #dee2e6; padding: 4px;">
            <input type="number" class="canvas-field-y" value="${y}" oninput="redrawCanvas()" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;" title="표 시작 Y">
        </td>
        <td style="border: 1px solid #dee2e6; padding: 4px;">
            <input type="number" class="canvas-field-fontsize" value="14" oninput="redrawCanvas()" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px;" title="폰트 크기">
        </td>
        <td style="border: 1px solid #dee2e6; padding: 4px;">
            <input type="text" class="canvas-field-tabledata" value='${tableDataJson}' oninput="redrawCanvas()" style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 3px; font-size: 11px;" placeholder="표 데이터" title="표 데이터 (JSON)">
        </td>
        <td style="border: 1px solid #dee2e6; padding: 4px; text-align: center;">
            <button type="button" onclick="removeCanvasField(this)" style="padding: 4px 8px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">×</button>
        </td>
    `;
    tbody.appendChild(newRow);

    redrawCanvas();
    showMessage(`${columns}칸 표 추가됨 (${totalWidth}x${height})`, 'success');
}

// 줌 조절
function setEditorZoom(zoom) {
    editorZoom = parseFloat(zoom);
    const canvas = document.getElementById('documentCanvas');
    const container = canvas.parentElement;

    canvas.style.transform = `scale(${editorZoom})`;
    canvas.style.transformOrigin = 'top left';

    // 컨테이너 높이 조정
    const scaledHeight = canvas.offsetHeight * editorZoom;
    container.style.minHeight = scaledHeight + 'px';

    document.getElementById('zoomLevel').textContent = Math.round(editorZoom * 100) + '%';

    // 모든 줌 버튼 비활성화 스타일로 변경
    const zoomButtons = ['zoom50Btn', 'zoom75Btn', 'zoom100Btn', 'zoom125Btn', 'zoom150Btn', 'zoom200Btn'];
    zoomButtons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.style.background = '';
            btn.style.color = '';
        }
    });

    // 현재 선택된 줌 버튼 활성화 스타일 적용
    const zoomMap = {
        0.5: 'zoom50Btn',
        0.75: 'zoom75Btn',
        1.0: 'zoom100Btn',
        1.25: 'zoom125Btn',
        1.5: 'zoom150Btn',
        2.0: 'zoom200Btn'
    };
    const activeBtn = document.getElementById(zoomMap[zoom]);
    if (activeBtn) {
        activeBtn.style.background = '#007bff';
        activeBtn.style.color = 'white';
    }
}

// 스냅 크기 변경
function setSnapSize(size) {
    editorSnapSize = parseInt(size);
    document.getElementById('snapSizeDisplay').textContent = `${editorSnapSize}px`;
    showMessage(`스냅 크기: ${editorSnapSize}px`, 'info');

    // 모든 스냅 버튼 비활성화 스타일로 변경
    const snapButtons = ['snap1Btn', 'snap5Btn', 'snap10Btn', 'snap25Btn', 'snap50Btn'];
    snapButtons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.style.background = '';
            btn.style.color = '';
        }
    });

    // 현재 선택된 스냅 버튼 활성화 스타일 적용
    const snapMap = {
        1: 'snap1Btn',
        5: 'snap5Btn',
        10: 'snap10Btn',
        25: 'snap25Btn',
        50: 'snap50Btn'
    };
    const activeBtn = document.getElementById(snapMap[size]);
    if (activeBtn) {
        activeBtn.style.background = '#28a745';
        activeBtn.style.color = 'white';
    }
}

// 스냅 토글
function toggleSnap() {
    editorSnapEnabled = !editorSnapEnabled;
    const btn = document.getElementById('snapToggleBtn');
    if (btn) {
        btn.textContent = editorSnapEnabled ? `🧲 스냅: ON (${editorSnapSize}px)` : '🧲 스냅: OFF';
        btn.style.background = editorSnapEnabled ? '#28a745' : '#6c757d';
    }
    showMessage(`스냅 기능 ${editorSnapEnabled ? '켜짐' : '꺼짐'}`, 'info');
}

// 드래그 모드 토글
function toggleDragMode() {
    editorDragMode = !editorDragMode;
    editorTableMode = false; // 표 모드 끄기

    const canvas = document.getElementById('documentCanvas');
    const btn = document.getElementById('dragModeBtn');
    const tableBtn = document.getElementById('tableModeBtn');

    if (editorDragMode) {
        canvas.style.cursor = 'crosshair';
        if (btn) {
            btn.textContent = '📦 박스 모드: ON';
            btn.style.background = '#28a745';
        }
        if (tableBtn) {
            tableBtn.textContent = '📊 표 모드: OFF';
            tableBtn.style.background = '#6c757d';
        }
        showMessage('드래그로 영역을 선택하면 박스 필드가 추가됩니다.', 'info');
    } else {
        canvas.style.cursor = 'crosshair';
        if (btn) {
            btn.textContent = '📦 박스 모드: OFF';
            btn.style.background = '#6c757d';
        }
        editorDragStart = null;
        editorDragEnd = null;
        redrawCanvas();
    }
}

// 표 모드 토글
function toggleTableMode() {
    // 칸 수 입력받기
    if (!editorTableMode) {
        const columns = prompt('표의 칸 수를 입력하세요 (2-10):', editorTableColumns);
        if (columns === null) return; // 취소

        const colNum = parseInt(columns);
        if (isNaN(colNum) || colNum < 2 || colNum > 10) {
            alert('칸 수는 2~10 사이의 숫자여야 합니다.');
            return;
        }

        editorTableColumns = colNum;
    }

    editorTableMode = !editorTableMode;
    editorDragMode = false; // 박스 모드 끄기

    const canvas = document.getElementById('documentCanvas');
    const btn = document.getElementById('tableModeBtn');
    const dragBtn = document.getElementById('dragModeBtn');

    if (editorTableMode) {
        canvas.style.cursor = 'crosshair';
        if (btn) {
            btn.textContent = `📊 표 모드: ON (${editorTableColumns}칸)`;
            btn.style.background = '#17a2b8';
        }
        if (dragBtn) {
            dragBtn.textContent = '📦 박스 모드: OFF';
            dragBtn.style.background = '#6c757d';
        }
        showMessage(`드래그로 ${editorTableColumns}칸 표를 추가합니다.`, 'info');
    } else {
        canvas.style.cursor = 'crosshair';
        if (btn) {
            btn.textContent = '📊 표 모드: OFF';
            btn.style.background = '#6c757d';
        }
        editorDragStart = null;
        editorDragEnd = null;
        redrawCanvas();
    }
}

// 수정 모드 토글
function toggleEditMode() {
    editorEditMode = !editorEditMode;
    editorDragMode = false;
    editorTableMode = false;

    const canvas = document.getElementById('documentCanvas');
    const btn = document.getElementById('editModeBtn');
    const dragBtn = document.getElementById('dragModeBtn');
    const tableBtn = document.getElementById('tableModeBtn');

    if (editorEditMode) {
        canvas.style.cursor = 'pointer';
        if (btn) {
            btn.textContent = '✏️ 수정 모드: ON';
            btn.style.background = '#ffc107';
        }
        if (dragBtn) {
            dragBtn.textContent = '📦 박스 모드: OFF';
            dragBtn.style.background = '#6c757d';
        }
        if (tableBtn) {
            tableBtn.textContent = '📊 표 모드: OFF';
            tableBtn.style.background = '#6c757d';
        }
        showMessage('박스나 표를 클릭하여 선택하고 드래그하여 이동/크기 조절', 'info');
    } else {
        canvas.style.cursor = 'crosshair';
        if (btn) {
            btn.textContent = '✏️ 수정 모드: OFF';
            btn.style.background = '#6c757d';
        }
        editorSelectedField = null;
        editorDragStart = null;
        editorDragEnd = null;
        editorResizeHandle = null;
        redrawCanvas();
    }
}

// 모든 필드 삭제
function clearAllFields() {
    if (!confirm('모든 필드를 삭제하시겠습니까?')) {
        return;
    }

    const tbody = document.getElementById('canvasFieldsTableBody');
    tbody.innerHTML = '';
    redrawCanvas();
    showMessage('모든 필드가 삭제되었습니다.', 'info');
}

// 템플릿 좌표 저장 (DB에 저장)
async function saveTemplateCoordinates() {
    const tbody = document.getElementById('canvasFieldsTableBody');
    const rows = tbody.querySelectorAll('tr');

    if (rows.length === 0) {
        alert('저장할 필드가 없습니다.');
        return;
    }

    // 템플릿 정보 수집
    const templateSelect = document.getElementById('templateSelect');
    const selectedOption = templateSelect.options[templateSelect.selectedIndex];

    if (!selectedOption.value) {
        alert('양식을 먼저 선택하세요.');
        return;
    }

    const fields = [];
    rows.forEach(row => {
        const label = row.querySelector('.canvas-field-label').value.trim();
        const x = parseInt(row.querySelector('.canvas-field-x').value);
        const y = parseInt(row.querySelector('.canvas-field-y').value);
        const fontSize = parseInt(row.querySelector('.canvas-field-fontsize').value);
        const fieldType = row.dataset.fieldType;

        const fieldData = {
            label: label,
            x: x,
            y: y,
            fontSize: fontSize
        };

        if (fieldType === 'table') {
            // 표 타입이면 표 데이터 저장
            const tableDataInput = row.querySelector('.canvas-field-tabledata');
            if (tableDataInput && tableDataInput.value) {
                try {
                    const tableData = JSON.parse(tableDataInput.value);
                    fieldData.type = 'table';
                    fieldData.tableData = tableData;
                } catch (e) {
                    console.error('표 데이터 파싱 오류:', e);
                }
            }
        } else if (fieldType === 'box') {
            // 박스 타입이면 크기 정보 저장
            const boxSizeInput = row.querySelector('.canvas-field-boxsize');
            if (boxSizeInput && boxSizeInput.value) {
                const sizeMatch = boxSizeInput.value.match(/(\d+)x(\d+)/);
                if (sizeMatch) {
                    fieldData.type = 'box';
                    fieldData.width = parseInt(sizeMatch[1]);
                    fieldData.height = parseInt(sizeMatch[2]);
                }
            }
        } else {
            // 일반 포인트 타입이면 선 너비 저장
            const lineWidthInput = row.querySelector('.canvas-field-linewidth');
            const lineWidth = lineWidthInput ? parseInt(lineWidthInput.value) || 0 : 0;
            if (lineWidth > 0) {
                fieldData.lineWidth = lineWidth;
            }
        }

        fields.push(fieldData);
    });

    const templateData = {
        canvasWidth: 794,
        canvasHeight: 1123,
        fields: fields
    };

    try {
        // DB에 저장
        const formData = new FormData();
        formData.append('coordinates', JSON.stringify(templateData));

        const response = await fetch(`/livewalk/library/${selectedOption.value}/coordinates`, {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            showMessage('템플릿 좌표가 저장되었습니다.', 'success');
        } else {
            const error = await response.json();
            showMessage('저장 실패: ' + error.message, 'error');
        }
    } catch (error) {
        showMessage('저장 오류: ' + error.message, 'error');
    }
}

// JSON 파일 다운로드 (백업용)
function downloadTemplateJSON() {
    const tbody = document.getElementById('canvasFieldsTableBody');
    const rows = tbody.querySelectorAll('tr');

    if (rows.length === 0) {
        alert('저장할 필드가 없습니다.');
        return;
    }

    // 템플릿 정보 수집
    const templateSelect = document.getElementById('templateSelect');
    const selectedOption = templateSelect.options[templateSelect.selectedIndex];

    if (!selectedOption.value) {
        alert('양식을 먼저 선택하세요.');
        return;
    }

    const fields = [];
    rows.forEach(row => {
        const label = row.querySelector('.canvas-field-label').value.trim();
        const x = parseInt(row.querySelector('.canvas-field-x').value);
        const y = parseInt(row.querySelector('.canvas-field-y').value);
        const fontSize = parseInt(row.querySelector('.canvas-field-fontsize').value);
        const fieldType = row.dataset.fieldType;

        const fieldData = {
            label: label,
            x: x,
            y: y,
            fontSize: fontSize
        };

        if (fieldType === 'table') {
            // 표 타입이면 표 데이터 저장
            const tableDataInput = row.querySelector('.canvas-field-tabledata');
            if (tableDataInput && tableDataInput.value) {
                try {
                    const tableData = JSON.parse(tableDataInput.value);
                    fieldData.type = 'table';
                    fieldData.tableData = tableData;
                } catch (e) {
                    console.error('표 데이터 파싱 오류:', e);
                }
            }
        } else if (fieldType === 'box') {
            // 박스 타입이면 크기 정보 저장
            const boxSizeInput = row.querySelector('.canvas-field-boxsize');
            if (boxSizeInput && boxSizeInput.value) {
                const sizeMatch = boxSizeInput.value.match(/(\d+)x(\d+)/);
                if (sizeMatch) {
                    fieldData.type = 'box';
                    fieldData.width = parseInt(sizeMatch[1]);
                    fieldData.height = parseInt(sizeMatch[2]);
                }
            }
        } else {
            // 일반 포인트 타입이면 선 너비 저장
            const lineWidthInput = row.querySelector('.canvas-field-linewidth');
            const lineWidth = lineWidthInput ? parseInt(lineWidthInput.value) || 0 : 0;
            if (lineWidth > 0) {
                fieldData.lineWidth = lineWidth;
            }
        }

        fields.push(fieldData);
    });

    const templateData = {
        templateId: selectedOption.value,
        templateName: selectedOption.text,
        fileName: selectedOption.dataset.fileName,
        fileType: selectedOption.dataset.fileType,
        canvasWidth: 794,
        canvasHeight: 1123,
        fields: fields
    };

    // JSON 파일로 다운로드
    const jsonStr = JSON.stringify(templateData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_${selectedOption.value}_fields.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showMessage('JSON 파일이 다운로드되었습니다.', 'success');
}

// ==================== 템플릿 필드 설정 저장/불러오기 (DB 연동) ====================

/**
 * 현재 Canvas 필드 설정을 DB에 저장
 */
async function saveFieldCoordinatesToDB() {
    const templateSelect = document.getElementById('templateSelect');
    const selectedOption = templateSelect.options[templateSelect.selectedIndex];

    if (!selectedOption.value) {
        showMessage('템플릿을 먼저 선택하세요.', 'error');
        return;
    }

    const imageId = parseInt(selectedOption.value);
    const tbody = document.getElementById('canvasFieldsTableBody');
    const rows = tbody.querySelectorAll('tr');

    if (rows.length === 0) {
        showMessage('저장할 필드가 없습니다.', 'warning');
        return;
    }

    const fields = [];

    rows.forEach(row => {
        const fieldType = row.dataset.fieldType || 'point';
        const label = row.querySelector('.canvas-field-label')?.value || '';
        const x = parseInt(row.querySelector('.canvas-field-x').value);
        const y = parseInt(row.querySelector('.canvas-field-y').value);
        const fontSize = parseInt(row.querySelector('.canvas-field-fontsize')?.value || 14);

        const fieldData = {
            type: fieldType,
            label: label,
            x: x,
            y: y,
            fontSize: fontSize
        };

        if (fieldType === 'box') {
            const boxSizeInput = row.querySelector('.canvas-field-boxsize');
            if (boxSizeInput && boxSizeInput.value) {
                const sizeMatch = boxSizeInput.value.match(/(\d+)x(\d+)/);
                if (sizeMatch) {
                    fieldData.width = parseInt(sizeMatch[1]);
                    fieldData.height = parseInt(sizeMatch[2]);
                }
            }
        } else if (fieldType === 'table') {
            const tableDataInput = row.querySelector('.canvas-field-tabledata');
            if (tableDataInput && tableDataInput.value) {
                try {
                    fieldData.tableData = JSON.parse(tableDataInput.value);
                } catch (e) {
                    console.error('표 데이터 파싱 오류:', e);
                }
            }
        } else {
            // 일반 포인트 타입
            const lineWidthInput = row.querySelector('.canvas-field-linewidth');
            if (lineWidthInput && lineWidthInput.value) {
                const lineWidth = parseInt(lineWidthInput.value);
                if (lineWidth > 0) {
                    fieldData.lineWidth = lineWidth;
                }
            }
        }

        fields.push(fieldData);
    });

    const coordinatesJson = JSON.stringify(fields);

    try {
        const formData = new FormData();
        formData.append('coordinates', coordinatesJson);

        const response = await fetch(`/livewalk/library/${imageId}/coordinates`, {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            showMessage(`템플릿 필드 설정이 저장되었습니다 (${fields.length}개 필드)`, 'success');
        } else {
            const error = await response.json();
            showMessage('저장 실패: ' + error.message, 'error');
        }
    } catch (error) {
        showMessage('저장 오류: ' + error.message, 'error');
    }
}

/**
 * DB에서 저장된 필드 설정 불러오기
 */
async function loadFieldCoordinatesFromDB(imageId) {
    if (!imageId) return;

    try {
        const response = await fetch(`/livewalk/library/${imageId}`);
        if (!response.ok) {
            console.warn('템플릿 정보 조회 실패');
            return;
        }

        const template = await response.json();

        if (!template.fieldCoordinates) {
            console.log('저장된 필드 설정이 없습니다.');
            return;
        }

        const fields = JSON.parse(template.fieldCoordinates);

        if (!Array.isArray(fields) || fields.length === 0) {
            console.log('필드 데이터가 비어있습니다.');
            return;
        }

        // 기존 필드 초기화
        const tbody = document.getElementById('canvasFieldsTableBody');
        tbody.innerHTML = '';

        // 저장된 필드 복원
        fields.forEach(field => {
            if (field.type === 'box') {
                addBoxToTable(field.label || '', field.x, field.y, field.width, field.height);
            } else if (field.type === 'table') {
                const tableData = field.tableData;
                if (tableData) {
                    const totalWidth = tableData.widths.reduce((sum, w) => sum + w, 0);
                    addTableToCanvas(field.x, field.y, totalWidth, tableData.height, tableData.columns);
                }
            } else {
                // 일반 포인트 타입
                addFieldToTable(field.label || '', field.x, field.y);

                // fontSize, lineWidth 복원
                const rows = tbody.querySelectorAll('tr');
                const lastRow = rows[rows.length - 1];
                if (lastRow) {
                    const fontSizeInput = lastRow.querySelector('.canvas-field-fontsize');
                    if (fontSizeInput && field.fontSize) {
                        fontSizeInput.value = field.fontSize;
                    }

                    const lineWidthInput = lastRow.querySelector('.canvas-field-linewidth');
                    if (lineWidthInput && field.lineWidth) {
                        lineWidthInput.value = field.lineWidth;
                    }
                }
            }
        });

        redrawCanvas();
        showMessage(`저장된 필드 설정을 불러왔습니다 (${fields.length}개 필드)`, 'info');

    } catch (error) {
        console.error('필드 설정 불러오기 오류:', error);
    }
}

// ==================== Canvas를 PDF로 변환 ====================

/**
 * Canvas 내용을 PDF로 생성하여 다운로드/보기
 */
async function generatePDFFromCanvas() {
    const canvas = document.getElementById('documentCanvas');
    const templateSelect = document.getElementById('templateSelect');
    const titleInput = document.getElementById('docTitle');

    if (!canvas) {
        showMessage('Canvas를 찾을 수 없습니다.', 'error');
        return;
    }

    const selectedOption = templateSelect.options[templateSelect.selectedIndex];
    if (!selectedOption.value) {
        showMessage('템플릿을 선택하세요.', 'error');
        return;
    }

    const title = titleInput.value.trim();
    if (!title) {
        showMessage('문서 제목을 입력하세요.', 'error');
        return;
    }

    const templateId = parseInt(selectedOption.value);
    const incomingId = currentIncomingIdForDocument; // 문서 모달에서 사용하는 전역 변수

    try {
        showMessage('PDF 생성 중...', 'info');

        // Canvas를 Blob으로 변환
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/png');
        });

        // FormData로 서버 전송
        const formData = new FormData();
        formData.append('templateId', templateId);
        formData.append('title', title);
        formData.append('image', blob, 'canvas.png');

        if (incomingId) {
            formData.append('incomingId', incomingId);
        }

        const response = await fetch('/livewalk/documents/generate-canvas-pdf', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'PDF 생성 실패');
        }

        const result = await response.json();

        if (result.success) {
            showMessage('PDF가 생성되었습니다!', 'success');

            // PDF 새 창에서 열기
            const pdfFileName = result.document.fileName;
            window.open(`/livewalk/documents/view/${pdfFileName}`, '_blank');

            // 문서 모달 닫고 목록 새로고침
            closeDocumentCreateModal();
            if (currentIncomingIdForDocument) {
                loadDocuments(currentIncomingIdForDocument);
            }
        } else {
            throw new Error(result.message || 'PDF 생성 실패');
        }

    } catch (error) {
        showMessage('PDF 생성 오류: ' + error.message, 'error');
    }
}

/**
 * Canvas를 PNG 이미지로 다운로드 (미리보기용)
 */
function downloadCanvasAsImage() {
    const canvas = document.getElementById('documentCanvas');
    if (!canvas) {
        showMessage('Canvas를 찾을 수 없습니다.', 'error');
        return;
    }

    canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'canvas_preview.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showMessage('이미지가 다운로드되었습니다.', 'success');
    }, 'image/png');
}
