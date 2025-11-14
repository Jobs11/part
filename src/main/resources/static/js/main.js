const INCOMING_API = '/livewalk/incoming';
const USAGE_API = '/livewalk/part-usage';
const CATEGORY_API = '/livewalk/categories';

let categoriesData = [];
let inventoryData = [];
let currentIncomingSortColumn = null;
let currentIncomingSortOrder = 'asc';
let currentUsageSortColumn = null;
let currentUsageSortOrder = 'asc';
let currentInventorySortColumn = null;
let currentInventorySortOrder = 'asc';

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('incomingForm').addEventListener('submit', registerIncoming);
    document.getElementById('usageForm').addEventListener('submit', registerUsage);

    document.getElementById('purchaseDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('usedDate').value = new Date().toISOString().split('T')[0];

    document.getElementById('categoryId').addEventListener('change', onCategoryChange);

    loadCategories();
    loadAllIncoming();
    loadInventory();
    loadLowStock();
    loadAllUsage();
});

// ==================== 카테고리 관련 ====================
async function loadCategories() {
    try {
        const response = await fetch(CATEGORY_API);
        if (!response.ok) throw new Error('카테고리 조회 실패');

        categoriesData = await response.json();

        const select = document.getElementById('categoryId');
        select.innerHTML = '<option value="">선택하세요</option>';

        categoriesData.forEach(category => {
            const option = document.createElement('option');
            option.value = category.categoryId;
            option.textContent = `${category.categoryName} (${category.categoryCode})`;
            select.appendChild(option);
        });
    } catch (error) {
        showMessage('카테고리 조회 오류: ' + error.message, 'error');
    }
}

async function onCategoryChange() {
    const categoryId = document.getElementById('categoryId').value;
    if (!categoryId) {
        document.getElementById('partNumber').value = '';
        return;
    }

    try {
        const response = await fetch(`${CATEGORY_API}/${categoryId}`);
        if (!response.ok) throw new Error('카테고리 조회 실패');

        const category = await response.json();
        const nextNumber = category.lastNumber + 1;
        const previewPartNumber = `${category.categoryCode}-${String(nextNumber).padStart(4, '0')}`;

        document.getElementById('partNumber').value = previewPartNumber + ' (미리보기)';
    } catch (error) {
        showMessage('부품번호 미리보기 오류: ' + error.message, 'error');
    }
}

// ==================== 입고 등록 ====================
async function registerIncoming(e) {
    e.preventDefault();

    const categoryId = parseInt(document.getElementById('categoryId').value);

    let partNumber = '';
    try {
        const response = await fetch(`${CATEGORY_API}/${categoryId}/generate-part-number`, {
            method: 'POST'
        });

        if (!response.ok) throw new Error('부품번호 생성 실패');

        partNumber = await response.text();
    } catch (error) {
        showMessage('부품번호 생성 오류: ' + error.message, 'error');
        return;
    }

    const currency = document.getElementById('currency').value;

    const incomingData = {
        categoryId: categoryId,
        partNumber: partNumber,
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
        const response = await fetch(`${INCOMING_API}/with-number`, {
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
    try {
        const response = await fetch(INCOMING_API);
        if (!response.ok) throw new Error('데이터 조회 실패');

        const incomingList = await response.json();
        displayIncomingList(incomingList);
    } catch (error) {
        showMessage('입고 리스트 조회 오류: ' + error.message, 'error');
    }
}
let currentIncomingSearchKeyword = ''; // 전역 변수 추가

async function searchIncoming() {
    const searchTerm = document.getElementById('incomingSearchInput').value.trim();
    currentIncomingSearchKeyword = searchTerm; // 검색어 저장

    if (!searchTerm) {
        loadAllIncoming();
        return;
    }

    try {
        const response = await fetch(`${INCOMING_API}/search?name=${encodeURIComponent(searchTerm)}`);
        if (!response.ok) throw new Error('검색 실패');

        const incomingList = await response.json();
        displayIncomingList(incomingList);
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

    let endpoint;

    if (searchTerm) {
        // 검색어 있으면 검색+정렬
        endpoint = `${INCOMING_API}/search-sort?keyword=${encodeURIComponent(searchTerm)}&column=${column}&order=${currentIncomingSortOrder}`;
    } else {
        // 검색어 없으면 전체 정렬
        endpoint = `${INCOMING_API}/sort?column=${column}&order=${currentIncomingSortOrder}`;
    }

    try {
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('정렬 실패');

        const incomingList = await response.json();
        displayIncomingList(incomingList);
        showMessage(`${column} 기준 ${currentIncomingSortOrder === 'asc' ? '오름차순' : '내림차순'} 정렬`, 'info');
    } catch (error) {
        showMessage('정렬 오류: ' + error.message, 'error');
    }
}

function displayIncomingList(incomingList) {
    const tbody = document.getElementById('incomingTableBody');

    if (incomingList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align: center;">입고 내역이 없습니다.</td></tr>';
        return;
    }

    tbody.innerHTML = incomingList.map(incoming => `
        <tr>
            <td>${incoming.incomingId}</td>
            <td>${incoming.partNumber || '-'}</td>
            <td>${incoming.categoryName || '-'}</td>
            <td class="editable" ondblclick="makeIncomingEditable(event, ${incoming.incomingId}, 'partName', '${escapeHtml(incoming.partName)}')">${incoming.partName || '-'}</td>
            <td class="editable" ondblclick="makeIncomingEditable(event, ${incoming.incomingId}, 'incomingQuantity', ${incoming.incomingQuantity})">${incoming.incomingQuantity}</td>
            <td>${incoming.unit || '-'}</td>
            <td class="editable" ondblclick="makeIncomingEditable(event, ${incoming.incomingId}, 'purchasePrice', ${incoming.purchasePrice})">${formatNumber(incoming.purchasePrice)} 원</td>
            <td class="editable" ondblclick="makeIncomingEditable(event, ${incoming.incomingId}, 'currency', '${incoming.currency}')">${incoming.currency || '-'}</td>
            <td class="editable" ondblclick="makeIncomingEditable(event, ${incoming.incomingId}, 'purchaseDate', '${incoming.purchaseDate}')">${formatDate(incoming.purchaseDate)}</td>
            <td>${formatDateTime(incoming.createdAt)}</td>
        </tr>
    `).join('');
}

// 입고 셀 편집
function makeIncomingEditable(event, incomingId, field, currentValue) {
    event.stopPropagation();
    const cell = event.target;
    const originalValue = currentValue;

    if (cell.querySelector('input') || cell.querySelector('select')) return;

    let inputElement;

    if (field === 'currency') {
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
            field === 'incomingQuantity' || field === 'purchasePrice' ? 'number' :
                field === 'purchaseDate' ? 'date' : 'text';

        if (field === 'purchaseDate' && currentValue) {
            inputElement.value = currentValue;
        } else {
            inputElement.value = (currentValue === '-' || !currentValue) ? '' : currentValue;
        }

        if (field === 'purchasePrice') {
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
        const newValue = inputElement.value.trim();

        if (newValue === String(originalValue) || (!newValue && !originalValue)) {
            cell.textContent = originalValue || '-';
            return;
        }

        try {
            // 전체 입고 데이터를 가져와서 수정
            const getResponse = await fetch(`${INCOMING_API}/${incomingId}`);
            if (!getResponse.ok) throw new Error('데이터 조회 실패');

            const currentData = await getResponse.json();

            // 수정할 필드만 업데이트
            const updatedData = { ...currentData };

            if (field === 'incomingQuantity' || field === 'purchasePrice') {
                updatedData[field] = parseFloat(newValue);
            } else {
                updatedData[field] = newValue;
            }

            const response = await fetch(`${INCOMING_API}/${incomingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });

            if (response.ok) {
                if (field === 'purchaseDate') {
                    cell.textContent = formatDate(newValue);
                } else if (field === 'purchasePrice') {
                    cell.textContent = formatNumber(newValue) + ' 원';
                } else {
                    cell.textContent = newValue || '-';
                }
                showMessage('수정 완료', 'success');
                loadInventory();
                loadLowStock();
            } else {
                const message = await response.text();
                cell.textContent = originalValue || '-';
                showMessage('수정 실패: ' + message, 'error');
            }
        } catch (error) {
            cell.textContent = originalValue || '-';
            showMessage('수정 오류: ' + error.message, 'error');
        }
    };

    inputElement.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveEdit();
    });
    inputElement.addEventListener('blur', saveEdit);
    inputElement.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (field === 'purchaseDate') {
                cell.textContent = formatDate(originalValue);
            } else if (field === 'purchasePrice') {
                cell.textContent = formatNumber(originalValue) + ' 원';
            } else {
                cell.textContent = originalValue || '-';
            }
        }
    });
}

// ==================== 재고 현황 조회 ====================
async function loadInventory() {
    try {
        const response = await fetch(`${INCOMING_API}/inventory`);
        if (!response.ok) throw new Error('재고 조회 실패');

        inventoryData = await response.json();
        displayInventory(inventoryData);
    } catch (error) {
        showMessage('재고 조회 오류: ' + error.message, 'error');
    }
}

function sortInventoryTable(column) {
    if (currentInventorySortColumn === column) {
        currentInventorySortOrder = currentInventorySortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        currentInventorySortColumn = column;
        currentInventorySortOrder = 'asc';
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
            <td>${item.part_number}</td>
            <td>${item.part_name}</td>
            <td>${item.category_name || '-'}</td>
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

async function searchUsage() {
    const searchTerm = document.getElementById('usageSearchInput').value.trim();
    currentUsageSearchKeyword = searchTerm; // 검색어 저장

    if (!searchTerm) {
        loadAllUsage();
        return;
    }

    try {
        const response = await fetch(`${USAGE_API}/search?keyword=${encodeURIComponent(searchTerm)}`);
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

    let endpoint;

    if (searchTerm) {
        endpoint = `${USAGE_API}/search-sort?keyword=${encodeURIComponent(searchTerm)}&column=${column}&order=${currentUsageSortOrder}`;
    } else {
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
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR');
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR');
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
