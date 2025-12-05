// ==================== 입고 관련 모듈 ====================
// API 상수는 constants.js에서 선언됨
// categoriesData, paymentMethodsData, projectsData는 category.js에서 선언됨

// 전역 변수
let currentIncomingSortColumn = null;
let currentIncomingSortOrder = 'asc';
let currentIncomingSearchKeyword = '';
let currentIncomingSearchColumn = '';
let currentIncomingIdForImage = null;
let currentIncomingIdForDocument = null;

// ==================== 카테고리 관련 ====================
// 헬퍼 함수들은 utils.js에서 선언됨
async function loadCategories() {
    try {
        const response = await fetch(CATEGORY_API);
        if (!response.ok) throw new Error('카테고리 조회 실패');

        categoriesData = await response.json();

        // 입고 등록 드롭다운
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
        if (!response.ok) throw new Error('결제수단 조회 실패');

        paymentMethodsData = await response.json();

        const select = document.getElementById('paymentMethodId');
        if (select) {
            const previousValue = select.value;
            select.innerHTML = '<option value="">선택해주세요</option>';

            paymentMethodsData.forEach(method => {
                const option = document.createElement('option');
                option.value = method.categoryId;
                option.textContent = method.categoryName;
                select.appendChild(option);
            });

            if (previousValue && select.querySelector(`option[value="${previousValue}"]`)) {
                select.value = previousValue;
            }
        }
    } catch (error) {
        showMessage('결제수단 조회 오류: ' + error.message, 'error');
    }
}

// 프로젝트 로드
async function loadProjects() {
    try {
        const response = await fetch(PROJECT_API);
        if (!response.ok) throw new Error('프로젝트 조회 실패');

        projectsData = await response.json();
    } catch (error) {
        showMessage('프로젝트 조회 오류: ' + error.message, 'error');
    }
}

// ==================== 입고 등록 ====================
// 현재 사용자 정보 가져오기
async function getCurrentUser() {
    try {
        const response = await fetch('/livewalk/auth/current-user');
        if (response.ok) {
            const user = await response.json();
            return user.fullName || user.username || 'system';
        }
    } catch (error) {
        console.error('사용자 정보 조회 실패:', error);
    }
    return 'system';
}

async function registerIncoming(e) {
    e.preventDefault();

    const categoryId = parseInt(document.getElementById('categoryId').value);
    const currency = document.getElementById('currency').value;
    const paymentMethodEl = document.getElementById('paymentMethodId');

    // 현재 사용자 정보 가져오기
    const currentUser = await getCurrentUser();

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
        createdBy: currentUser
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
            if (typeof loadInventory === 'function') loadInventory();
            if (typeof loadLowStock === 'function') loadLowStock();
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

// 환율 자동 계산
function calculateKRW() {
    const originalPrice = parseFloat(document.getElementById('originalPrice').value) || 0;
    const exchangeRate = parseFloat(document.getElementById('exchangeRate').value) || 0;

    if (originalPrice > 0 && exchangeRate > 0) {
        const purchasePrice = originalPrice * exchangeRate;
        document.getElementById('purchasePrice').value = purchasePrice.toFixed(2);
    }
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
        'payment_method_name': '결제수단',
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
        'note': 14
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

// 컬럼 순차 자동 검색 함수
async function searchIncomingWithFallback(searchTerm, selectedColumn) {
    // 검색 가능한 모든 컬럼 (테이블 순서대로)
    const searchableColumns = [
        'category_name',
        'part_number',
        'part_name',
        'description',
        'incoming_quantity',
        'payment_method_name',
        'purchase_price',
        'purchase_datetime',
        'purchaser',
        'supplier',
        'project_name',
        'created_at',
        'note'
    ];

    const columnNames = {
        'category_name': '카테고리',
        'part_number': '부품번호',
        'part_name': '부품명',
        'description': '설명',
        'note': '비고',
        'incoming_quantity': '입고수량',
        'payment_method_name': '결제수단',
        'purchase_price': '구매금액',
        'purchase_datetime': '구매일자',
        'purchaser': '구매자',
        'supplier': '공급자',
        'project_name': '프로젝트명',
        'created_at': '등록일'
    };

    const columnIndex = {
        'category_name': 0,
        'part_number': 1,
        'part_name': 2,
        'description': 3,
        'incoming_quantity': 4,
        'payment_method_name': 6,
        'purchase_price': 7,
        'purchase_datetime': 8,
        'purchaser': 9,
        'supplier': 10,
        'project_name': 11,
        'created_by': 12,     // 등록자
        'created_at': 13,     // 등록일
        'note': 14            // 비고
    };

    // 선택된 컬럼이 있으면 먼저 검색
    if (selectedColumn) {
        try {
            const url = `${INCOMING_API}/search-advanced?keyword=${encodeURIComponent(searchTerm)}&column=${selectedColumn}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('검색 실패');

            const incomingList = await response.json();

            if (incomingList.length > 0) {
                await displayIncomingList(incomingList);
                showMessage(`${columnNames[selectedColumn]} 컬럼에서 ${incomingList.length}개 검색됨`, 'info');
                return true;
            }
        } catch (error) {
            console.error(`${selectedColumn} 검색 오류:`, error);
        }
    }

    // 선택된 컬럼에서 결과가 없으면 다른 컬럼들을 순차 검색
    for (const column of searchableColumns) {
        // 이미 검색한 컬럼은 스킵
        if (column === selectedColumn) continue;

        try {
            const url = `${INCOMING_API}/search-advanced?keyword=${encodeURIComponent(searchTerm)}&column=${column}`;
            const response = await fetch(url);
            if (!response.ok) continue;

            const incomingList = await response.json();

            if (incomingList.length > 0) {
                // 찾은 컬럼으로 자동 선택 변경
                currentIncomingSearchColumn = column;

                // 모든 헤더 초기화
                document.querySelectorAll('#incomingTable th').forEach(th => {
                    th.style.backgroundColor = '';
                    th.style.fontWeight = '';
                });

                // 찾은 컬럼 헤더 강조
                const headers = document.querySelectorAll('#incomingTable th');
                if (columnIndex[column] !== undefined && headers[columnIndex[column]]) {
                    headers[columnIndex[column]].style.backgroundColor = '#e3f2fd';
                    headers[columnIndex[column]].style.fontWeight = 'bold';
                }

                await displayIncomingList(incomingList);
                const message = selectedColumn
                    ? `${columnNames[selectedColumn]} 컬럼에서 결과 없음 → ${columnNames[column]} 컬럼에서 ${incomingList.length}개 발견!`
                    : `${columnNames[column]} 컬럼에서 ${incomingList.length}개 검색됨`;
                showMessage(message, 'success');
                return true;
            }
        } catch (error) {
            console.error(`${column} 검색 오류:`, error);
            continue;
        }
    }

    // 모든 컬럼에서 검색했지만 결과 없음
    await displayIncomingList([]);
    showMessage('모든 컬럼에서 검색했지만 결과를 찾을 수 없습니다.', 'warning');
    return false;
}

async function searchIncoming() {
    const searchTerm = document.getElementById('incomingSearchInput').value.trim();
    currentIncomingSearchKeyword = searchTerm; // 검색어 저장

    if (!searchTerm) {
        loadAllIncoming();
        return;
    }

    try {
        const column = currentIncomingSearchColumn || '';

        // 컬럼이 선택되었으면 순차 검색 사용
        if (column) {
            await searchIncomingWithFallback(searchTerm, column);
        } else {
            // 전체 검색 (기존 방식)
            const url = `${INCOMING_API}/search-advanced?keyword=${encodeURIComponent(searchTerm)}&column=`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('검색 실패');

            const incomingList = await response.json();
            await displayIncomingList(incomingList);
            showMessage(`${incomingList.length}개 검색됨`, 'info');
        }
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
        'purchase_datetime': 8,  // 구매일자
        'purchaser': 9,
        'supplier': 10,
        'project_name': 11,
        'created_by': 12,     // 등록자
        'created_at': 13,     // 등록일
        'note': 14            // 비고
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
        tbody.innerHTML = '<tr><td colspan="17" style="text-align: center;">입고 내역이 없습니다.</td></tr>';
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
                <td class="editable" ondblclick="makeIncomingEditable(event, ${incoming.incomingId}, 'purchaseDatetime', '${incoming.purchaseDatetime}')">${formatDateTime(incoming.purchaseDatetime)}</td>
                <td class="editable" ondblclick="makeIncomingEditable(event, ${incoming.incomingId}, 'purchaser', '${escapeHtml(incoming.purchaser || '')}')">${incoming.purchaser || '-'}</td>
                <td class="editable" ondblclick="makeIncomingEditable(event, ${incoming.incomingId}, 'supplier', '${escapeHtml(incoming.supplier || '')}')">${incoming.supplier || '-'}</td>
                <td class="editable" ondblclick="makeIncomingEditable(event, ${incoming.incomingId}, 'projectName', '${escapeHtml(incoming.projectName || '')}')">${incoming.projectName || '-'}</td>
                <td>${incoming.createdBy || '-'}</td>
                <td>${formatDateTime(incoming.createdAt)}</td>
                <td class="editable" ondblclick="makeIncomingEditable(event, ${incoming.incomingId}, 'note', '${escapeHtml(incoming.note || '')}')">${incoming.note || '-'}</td>
                <td><button class="btn-small" onclick="openImageModal(${incoming.incomingId})">🖼 사진${imageCount > 0 ? ' ' + imageCount + '개' : ''}</button></td>
                <td><button class="btn-small" data-incoming-id="${incoming.incomingId}" onclick="openPartLocationViewByIncomingId(${incoming.incomingId})">📍 배치도</button></td>
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
        let options = '<option value="">선택</option>';
        paymentMethodsData.forEach(method => {
            const selected = method.categoryId === currentValue ? 'selected' : '';
            options += `<option value="${method.categoryId}" ${selected}>${method.categoryName}</option>`;
        });
        inputElement.innerHTML = options;
    } else if (field === 'projectName') {
        // 프로젝트명은 select
        inputElement = document.createElement('select');
        let options = '<option value="">선택</option>';
        projectsData.forEach(project => {
            const selected = project.categoryName === currentValue ? 'selected' : '';
            options += `<option value="${project.categoryName}" ${selected}>${project.categoryName}</option>`;
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
                field === 'purchaseDatetime' ? 'date' : 'text';

        if (field === 'purchaseDatetime' && currentValue) {
            // yyyy-MM-dd HH:mm:ss 형식에서 yyyy-MM-dd만 추출
            const dateValue = currentValue.substring(0, 10);
            inputElement.value = dateValue;
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
            } else if (field === 'purchasePrice') {
                cell.textContent = formatNumber(originalValue) + ' 원';
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
            } else if (field === 'purchaseDatetime') {
                // date 값을 yyyy-MM-dd 형식으로 전송 (LocalDate)
                updatedData[field] = newValue || null;
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
                if (typeof loadInventory === 'function') loadInventory();
                if (typeof loadLowStock === 'function') loadLowStock();

                // 부품번호 수정 시 배치도 변경 대화상자 열기
                if (field === 'partNumber') {
                    // 위치 변경 대화상자 바로 열기 (위치가 있든 없든 변경 가능하도록)
                    try {
                        const updatedIncoming = await (await fetch(`${INCOMING_API}/${incomingId}`)).json();
                        if (typeof showLocationSelectionDialogForIncoming === 'function') {
                            showLocationSelectionDialogForIncoming(incomingId, updatedIncoming.partNumber, updatedIncoming.partName);
                        }
                    } catch (error) {
                        console.error('배치도 변경 오류:', error);
                        showMessage('배치도 변경 중 오류가 발생했습니다.', 'error');
                    }
                }
            } else {
                const message = await response.text();
                if (field === 'originalPrice') {
                    cell.textContent = originalValue ? formatNumber(originalValue) : '-';
                } else if (field === 'purchasePrice') {
                    cell.textContent = formatNumber(originalValue) + ' 원';
                } else {
                    cell.textContent = originalValue || '-';
                }
                showMessage('수정 실패: ' + message, 'error');
            }
        } catch (error) {
            if (field === 'originalPrice') {
                cell.textContent = originalValue ? formatNumber(originalValue) : '-';
            } else if (field === 'purchasePrice') {
                cell.textContent = formatNumber(originalValue) + ' 원';
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
            } else if (field === 'purchaseDatetime') {
                cell.textContent = formatDateTime(originalValue);
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

// ==================== 이미지 관리 ====================

// 모달 열기
async function openImageModal(incomingId) {
    currentIncomingIdForImage = incomingId;
    document.getElementById('imageModal').style.display = 'block';

    // 부품 정보 가져와서 제목 업데이트
    try {
        const response = await fetch(`${INCOMING_API}/${incomingId}`);
        if (response.ok) {
            const incoming = await response.json();
            const partNumber = incoming.partNumber || '-';
            document.getElementById('imageModalTitle').textContent = `부품 사진 관리 - ${partNumber}`;
        } else {
            document.getElementById('imageModalTitle').textContent = '부품 사진 관리';
        }
    } catch (error) {
        console.error('부품 정보 조회 오류:', error);
        document.getElementById('imageModalTitle').textContent = '부품 사진 관리';
    }

    await loadImages(incomingId);
}

// 모달 닫기
function closeImageModal() {
    document.getElementById('imageModal').style.display = 'none';
    currentIncomingIdForImage = null;
    document.getElementById('modalFileInput').value = '';

    // 입고 리스트 새로고침
    loadAllIncoming();
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

        // 영수증과 나머지 이미지 분리
        const receiptImages = images.filter(img => img.imageType === 'receipt');
        const otherImages = images.filter(img => img.imageType !== 'receipt');

        const renderImageCard = (img) => {
            const typeLabel = img.imageType === 'receipt' ? '🧾 영수증' :
                img.imageType === 'delivery' ? '📦 택배' :
                    img.imageType === 'part' ? '📷 부품' : '📄 기타';
            const borderColor = img.imageType === 'receipt' ? '#ff9800' : '#ddd';
            return `
                <div style="position: relative; border: 2px solid ${borderColor}; padding: 5px; border-radius: 4px; min-width: 200px; flex-shrink: 0;">
                    <div style="position: absolute; top: 8px; left: 8px; background: rgba(255,255,255,0.9); padding: 3px 8px; border-radius: 3px; font-size: 11px; font-weight: bold; z-index: 1;">
                        ${typeLabel}
                    </div>
                    <img src="${img.imageUrl}" style="width: 200px; height: 150px; object-fit: cover; cursor: pointer;" onclick="window.open('${img.imageUrl}', '_blank')">
                    <div style="display: flex; gap: 5px; margin-top: 5px;">
                        <button class="btn-small" style="flex: 1;" onclick="downloadImage('${img.imageUrl}', '${img.fileName}')">다운로드</button>
                        <button class="btn-small" style="flex: 1; background-color: #dc3545;" onclick="deleteImage(${img.imageId})">삭제</button>
                    </div>
                </div>
            `;
        };

        let html = '';

        // 나머지 사진 목록 (영수증 제외)
        if (otherImages.length > 0) {
            html += `
                <div style="margin-bottom: 20px;">
                    <h4 style="margin-bottom: 10px; padding-bottom: 5px; border-bottom: 2px solid #4CAF50;">📷 부품/택배/기타 사진</h4>
                    <div style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 10px;">
                        ${otherImages.map(renderImageCard).join('')}
                    </div>
                </div>
            `;
        }

        // 영수증 목록
        if (receiptImages.length > 0) {
            html += `
                <div style="margin-bottom: 20px;">
                    <h4 style="margin-bottom: 10px; padding-bottom: 5px; border-bottom: 2px solid #ff9800;">🧾 영수증</h4>
                    <div style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 10px;">
                        ${receiptImages.map(renderImageCard).join('')}
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
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
    const imageType = document.getElementById('imageTypeSelect').value || 'part';

    for (let i = 0; i < fileInput.files.length; i++) {
        const formData = new FormData();
        formData.append('file', fileInput.files[i]);
        formData.append('incomingId', currentIncomingIdForImage);
        formData.append('imageType', imageType);

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

// ==================== 위치 관련 (입고 ID 기반) ====================

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
 * 입고 ID 기반 위치 타입 선택 처리
 */
function selectLocationTypeForIncoming(incomingId, partNumber, partName, type) {
    if (typeof closeLocationSelectionDialog === 'function') {
        closeLocationSelectionDialog();
    }

    if (type === 'cabinet') {
        if (typeof openCabinetPickerForIncoming === 'function') {
            openCabinetPickerForIncoming(incomingId, partNumber, partName);
        }
    } else if (type === 'map') {
        if (typeof openMapPickerForIncoming === 'function') {
            openMapPickerForIncoming(incomingId, partNumber, partName);
        }
    }
}

/**
 * 입고 ID 기반 캐비넷 위치 선택
 */
async function openCabinetPickerForIncoming(incomingId, partNumber, partName) {
    // 이 함수는 main.js의 캐비넷 관련 함수를 호출합니다
    if (typeof window.openCabinetPickerForIncoming === 'function') {
        window.openCabinetPickerForIncoming(incomingId, partNumber, partName);
    }
}

/**
 * 입고 ID 기반 도면 위치 선택
 */
function openMapPickerForIncoming(incomingId, partNumber, partName) {
    // 이 함수는 main.js의 도면 관련 함수를 호출합니다
    if (typeof window.openMapPickerForIncoming === 'function') {
        window.openMapPickerForIncoming(incomingId, partNumber, partName);
    }
}

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

        // main.js의 배치도 뷰어 함수 호출 (캐비넷 또는 도면)
        if (typeof window.openPartLocationViewByIncomingId === 'function') {
            window.openPartLocationViewByIncomingId(incomingId);
        }
    } catch (error) {
        console.error('배치도 조회 오류:', error);
        showMessage('배치도 조회 오류: ' + error.message, 'error');
    }
}

// ==================== 일괄 등록 ====================
async function submitBulkInsert() {
    const tbody = document.getElementById('bulkInsertTableBody');
    const rows = tbody.querySelectorAll('tr');
    const dataList = [];
    const incompleteRows = [];

    console.log('submitBulkInsert 시작, 행 개수:', rows.length);

    // 현재 사용자 정보 가져오기
    const currentUser = await getCurrentUser();

    // 기존 에러 표시 제거
    rows.forEach(row => {
        row.style.backgroundColor = '';
    });

    // 입력된 행만 수집 (실제 행 인덱스를 함께 저장)
    const rowIndexMap = []; // dataList 인덱스 -> 실제 행 인덱스 매핑

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
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
        const projectName = row.querySelector('.bulk-project-name').value.trim();
        const supplier = row.querySelector('.bulk-supplier').value.trim();
        const purchaser = row.querySelector('.bulk-purchaser').value.trim();
        const note = row.querySelector('.bulk-note').value.trim();

        console.log('행 데이터:', { partNumber, categoryId, partName, cabinetLocation, mapLocation, quantity, paymentMethodId, price, date, description, projectName, supplier, purchaser });

        // 하나라도 입력된 경우 (완전히 빈 행이 아닌 경우)
        const hasAnyInput = partNumber || categoryId || partName || quantity || price || date;

        // 필수 항목: 부품번호, 카테고리, 부품명, 수량, 금액, 구매일자
        if (partNumber && categoryId && paymentMethodId && partName && quantity && price && date) {
            // date 값을 yyyy-MM-dd 형식으로 전송 (LocalDate)
            const formattedDate = date || null;

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
                purchaseDatetime: formattedDate,
                description: description || '-',
                projectName: projectName || null,
                supplier: supplier || null,
                purchaser: purchaser || null,
                note: note,
                createdBy: currentUser
            };

            rowIndexMap.push(i); // dataList의 현재 인덱스에 대한 실제 행 인덱스 저장
            dataList.push(data);
        } else if (hasAnyInput) {
            // 일부만 입력된 불완전한 행
            const missingFields = [];
            if (!partNumber) missingFields.push('부품번호');
            if (!categoryId) missingFields.push('카테고리');
            if (!paymentMethodId) missingFields.push('결제방법');
            if (!partName) missingFields.push('부품명');
            if (!quantity) missingFields.push('수량');
            if (!price) missingFields.push('금액');
            if (!date) missingFields.push('구매일자');

            incompleteRows.push({
                rowNumber: i + 1,
                missingFields: missingFields,
                row: row
            });
        }
    }

    console.log('수집된 데이터:', dataList);
    console.log('불완전한 행:', incompleteRows);

    if (dataList.length === 0) {
        showMessage('등록할 데이터가 없습니다. 필수 항목을 입력하세요.', 'error');
        return;
    }

    // 불완전한 행이 있는 경우 경고
    if (incompleteRows.length > 0) {
        // 불완전한 행 시각적으로 표시 (노란색 배경)
        incompleteRows.forEach(item => {
            item.row.style.backgroundColor = '#fff3cd';
        });

        const warningMessage = `${incompleteRows.length}개 행이 불완전하여 건너뜁니다.\n\n` +
            incompleteRows.slice(0, 3).map(item =>
                `${item.rowNumber}번째 행: ${item.missingFields.join(', ')} 누락`
            ).join('\n') +
            (incompleteRows.length > 3 ? `\n... 외 ${incompleteRows.length - 3}개` : '') +
            `\n\n${dataList.length}건을 등록하시겠습니까?`;

        if (!confirm(warningMessage)) {
            return;
        }
    } else {
        if (!confirm(`${dataList.length}건을 등록하시겠습니까?`)) return;
    }

    console.log('서버 전송 시작');

    try {
        const response = await fetch(`${INCOMING_API}/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataList)
        });

        console.log('서버 응답:', response.status);

        if (response.ok) {
            const result = await response.json();
            console.log('등록 결과:', result);

            // 성공한 행만 제거 (rowIndexMap을 사용하여 실제 행 인덱스로 변환)
            const tbody = document.getElementById('bulkInsertTableBody');
            const successIndices = result.successIndices || [];

            // dataList 인덱스를 실제 행 인덱스로 변환
            const actualRowIndices = successIndices.map(dataIndex => rowIndexMap[dataIndex]);

            // 역순으로 정렬하여 제거 (인덱스 꼬임 방지)
            actualRowIndices.sort((a, b) => b - a);
            actualRowIndices.forEach(rowIndex => {
                if (tbody.children[rowIndex]) {
                    tbody.children[rowIndex].remove();
                }
            });

            // 모든 행이 성공한 경우 빈 행 하나 추가
            if (tbody.children.length === 0) {
                addBulkRow();
            }

            let message = `등록 완료: ${result.success}건 성공`;
            if (result.fail > 0) {
                message += `, ${result.fail}건 실패`;
            }
            if (result.skipped > 0) {
                message += `, ${result.skipped}건 건너뜀`;
            }

            // 실패 상세 정보 표시
            if (result.fail > 0 && result.failDetails && result.failDetails.length > 0) {
                let failMessage = `\n\n실패한 항목:\n`;
                result.failDetails.forEach((detail, idx) => {
                    if (idx < 5) { // 최대 5개만 표시
                        failMessage += `\n${detail.index + 1}번째 행: ${detail.partNumber} (${detail.partName})\n  ⚠️ ${detail.error}\n`;
                    }
                });
                if (result.failDetails.length > 5) {
                    failMessage += `\n... 외 ${result.failDetails.length - 5}건`;
                }
                alert(failMessage);
            }

            showMessage(message, result.fail > 0 ? 'warning' : 'success');

            loadAllIncoming();
            if (typeof loadInventory === 'function') loadInventory();
            if (typeof loadLowStock === 'function') loadLowStock();
        } else {
            const message = await response.text();
            console.error('등록 실패:', message);
            showMessage('등록 실패: ' + message, 'error');
        }
    } catch (error) {
        console.error('서버 연결 오류:', error);
        showMessage('서버 연결 오류: ' + error.message, 'error');
    }
}
