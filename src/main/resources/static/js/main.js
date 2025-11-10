const PARTS_API = '/livewalk/parts';
const USAGE_API = '/livewalk/part-usage';

let allPartsData = [];
let currentSortColumn = null;
let currentSortOrder = 'asc';
let bulkRowCounter = 0;

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('insertForm').addEventListener('submit', insertPart);
    document.getElementById('usageForm').addEventListener('submit', registerUsage);
    document.getElementById('bulkInsertForm').addEventListener('submit', bulkInsertParts);
    document.getElementById('usedDate').value = new Date().toISOString().split('T')[0];

    loadAllParts();
    loadLowStockParts();
    loadAllUsage();
});

// ==================== 부품 등록 ====================
async function insertPart(e) {
    e.preventDefault();

    const partData = {
        partNumber: document.getElementById('insertPartNumber').value,
        partName: document.getElementById('insertPartName').value,
        quantity: parseInt(document.getElementById('insertQuantity').value),
        unit: document.getElementById('insertUnit').value,
        description: document.getElementById('insertDescription').value
    };

    try {
        const response = await fetch(`${PARTS_API}/insert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(partData)
        });

        const message = await response.text();

        if (response.ok) {
            showMessage(message, 'success');
            document.getElementById('insertForm').reset();
            document.getElementById('insertPartNumber').value = 'P-';
            loadAllParts();
            loadLowStockParts();
        } else {
            showMessage(message, 'error');
        }
    } catch (error) {
        showMessage('서버 연결 오류: ' + error.message, 'error');
    }
}

// ==================== 일괄 등록 ====================
function toggleBulkInsert() {
    const area = document.getElementById('bulkInsertArea');
    const addBtn = document.getElementById('addRowBtn');
    const removeBtn = document.getElementById('removeRowBtn');

    if (area.style.display === 'none') {
        area.style.display = 'block';
        addBtn.style.display = 'inline-block';
        removeBtn.style.display = 'inline-block';

        // 처음 열 때 5개 행 생성
        if (bulkRowCounter === 0) {
            for (let i = 0; i < 5; i++) {
                addBulkRow();
            }
        }
    } else {
        area.style.display = 'none';
        addBtn.style.display = 'none';
        removeBtn.style.display = 'none';
    }
}

function addBulkRow() {
    bulkRowCounter++;
    const tbody = document.getElementById('bulkInsertBody');
    const row = document.createElement('tr');
    row.id = `bulkRow${bulkRowCounter}`;

    row.innerHTML = `
        <td style="text-align: center; background-color: #f5f5f5;">${bulkRowCounter}</td>
        <td><input type="text" class="bulk-input" name="partNumber" placeholder="P-" value="P-" required style="width: 100%;"></td>
        <td><input type="text" class="bulk-input" name="partName" placeholder="부품명" required style="width: 100%;"></td>
        <td><input type="number" class="bulk-input" name="quantity" placeholder="0" required min="0" style="width: 100%;"></td>
        <td><input type="text" class="bulk-input" name="unit" placeholder="EA" style="width: 100%;"></td>
        <td><input type="text" class="bulk-input" name="description" placeholder="설명" style="width: 100%;"></td>
    `;

    tbody.appendChild(row);
}

function removeBulkRow() {
    const tbody = document.getElementById('bulkInsertBody');
    if (tbody.children.length > 0) {
        tbody.removeChild(tbody.lastChild);
    } else {
        showMessage('삭제할 행이 없습니다.', 'info');
    }
}

function clearBulkForm() {
    const tbody = document.getElementById('bulkInsertBody');
    tbody.innerHTML = '';
    bulkRowCounter = 0;

    // 5개 행 다시 생성
    for (let i = 0; i < 5; i++) {
        addBulkRow();
    }

    showMessage('전체 초기화되었습니다.', 'info');
}

async function bulkInsertParts(e) {
    e.preventDefault();

    const rows = document.querySelectorAll('#bulkInsertBody tr');
    const partsData = [];

    // 입력된 데이터만 수집
    rows.forEach(row => {
        const inputs = row.querySelectorAll('.bulk-input');
        const partNumber = inputs[0].value.trim();
        const partName = inputs[1].value.trim();
        const quantity = inputs[2].value.trim();

        // 부품번호, 부품명, 수량이 모두 입력된 경우만 추가
        if (partNumber && partName && quantity) {
            partsData.push({
                partNumber: partNumber,
                partName: partName,
                quantity: parseInt(quantity),
                unit: inputs[3].value.trim(),
                description: inputs[4].value.trim()
            });
        }
    });

    if (partsData.length === 0) {
        showMessage('등록할 부품 데이터가 없습니다. (부품번호, 부품명, 수량은 필수)', 'error');
        return;
    }

    try {
        let successCount = 0;
        let failCount = 0;

        for (const part of partsData) {
            try {
                const response = await fetch(`${PARTS_API}/insert`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(part)
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

        showMessage(`일괄 등록 완료! 성공: ${successCount}개, 실패: ${failCount}개`,
            failCount === 0 ? 'success' : 'info');

        if (successCount > 0) {
            clearBulkForm();
            loadAllParts();
            loadLowStockParts();
        }

    } catch (error) {
        showMessage('일괄 등록 오류: ' + error.message, 'error');
    }
}

// ==================== 부품 리스트 조회 ====================
async function loadAllParts() {
    try {
        const response = await fetch(PARTS_API);
        if (!response.ok) throw new Error('데이터 조회 실패');

        const parts = await response.json();
        allPartsData = parts;
        displayPartsList(parts);
    } catch (error) {
        showMessage('목록 조회 오류: ' + error.message, 'error');
    }
}

function searchParts() {
    const searchTerm = document.getElementById('partsSearchInput').value.toLowerCase().trim();

    if (!searchTerm) {
        displayPartsList(allPartsData);
        return;
    }

    const filtered = allPartsData.filter(part => {
        const partNumber = (part.partNumber || '').toLowerCase();
        const partName = (part.partName || '').toLowerCase();
        return partNumber.includes(searchTerm) || partName.includes(searchTerm);
    });

    displayPartsList(filtered);
    showMessage(`${filtered.length}개 검색됨`, 'info');
}

function displayPartsList(parts) {
    const tbody = document.getElementById('partsTableBody');

    if (parts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">등록된 부품이 없습니다.</td></tr>';
        return;
    }

    tbody.innerHTML = parts.map(part => `
        <tr class="clickable-row" onclick="selectPartForUsage('${part.partNumber}', '${escapeHtml(part.partName)}')">
            <td>${part.partNumber || '-'}</td>
            <td class="editable" ondblclick="makeEditable(event, '${part.partNumber}', 'partName', '${escapeHtml(part.partName)}')">${part.partName || '-'}</td>
            <td class="editable" ondblclick="makeEditable(event, '${part.partNumber}', 'quantity', ${part.quantity})">${part.quantity}</td>
            <td class="editable" ondblclick="makeEditable(event, '${part.partNumber}', 'unit', '${escapeHtml(part.unit || '')}')">${part.unit || '-'}</td>
            <td class="editable" ondblclick="makeEditable(event, '${part.partNumber}', 'description', '${escapeHtml(part.description || '')}')">${part.description || '-'}</td>
            <td>${formatDate(part.createdAt)}</td>
        </tr>
    `).join('');
}

// 셀 편집 가능하게 만들기
function makeEditable(event, partNumber, field, currentValue) {
    event.stopPropagation();

    const cell = event.target;
    const originalValue = currentValue;

    if (cell.querySelector('input')) return;

    const input = document.createElement('input');
    input.type = (field === 'quantity') ? 'number' : 'text';
    input.value = (currentValue === '-' || !currentValue) ? '' : currentValue;
    input.style.width = '100%';
    input.style.border = '2px solid #0078d4';
    input.style.padding = '4px';

    cell.textContent = '';
    cell.appendChild(input);
    input.focus();
    input.select();

    const saveEdit = async () => {
        const newValue = input.value.trim();

        if (newValue === originalValue || (!newValue && !originalValue)) {
            cell.textContent = originalValue || '-';
            return;
        }

        try {
            const currentPart = allPartsData.find(p => p.partNumber === partNumber);

            const updatedData = {
                partName: field === 'partName' ? newValue : currentPart.partName,
                quantity: field === 'quantity' ? parseInt(newValue) : currentPart.quantity,
                unit: field === 'unit' ? newValue : currentPart.unit,
                description: field === 'description' ? newValue : currentPart.description
            };

            const response = await fetch(`${PARTS_API}/${partNumber}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });

            if (response.ok) {
                cell.textContent = newValue || '-';
                showMessage('수정 완료', 'success');
                loadAllParts();
                loadLowStockParts();
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

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveEdit();
    });
    input.addEventListener('blur', saveEdit);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') cell.textContent = originalValue || '-';
    });
}

// ==================== 테이블 정렬 ====================
async function sortTable(column) {
    if (currentSortColumn === column) {
        currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = column;
        currentSortOrder = 'asc';
    }

    const endpoint = currentSortOrder === 'asc'
        ? `${PARTS_API}/sort-asc?column=${column}`
        : `${PARTS_API}/sort-desc?column=${column}`;

    try {
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('정렬 실패');

        const parts = await response.json();
        displayPartsList(parts);
        showMessage(`${column} 기준 ${currentSortOrder === 'asc' ? '오름차순' : '내림차순'} 정렬`, 'info');
    } catch (error) {
        showMessage('정렬 오류: ' + error.message, 'error');
    }
}

// ==================== 재고 부족 부품 ====================
async function loadLowStockParts() {
    try {
        const threshold = document.getElementById('lowStockThreshold').value || 10;

        const response = await fetch(`${PARTS_API}/low-stock?threshold=${threshold}`);
        if (!response.ok) throw new Error('데이터 조회 실패');

        const parts = await response.json();
        displayLowStockList(parts);
        showMessage(`${threshold}개 이하 부품: ${parts.length}건`, 'info');
    } catch (error) {
        showMessage('재고 부족 부품 조회 오류: ' + error.message, 'error');
    }
}

function displayLowStockList(parts) {
    const tbody = document.getElementById('lowStockTableBody');

    if (parts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">재고 부족 부품이 없습니다.</td></tr>';
        return;
    }

    tbody.innerHTML = parts.map(part => `
        <tr class="low-stock">
            <td>${part.partNumber || '-'}</td>
            <td>${part.partName || '-'}</td>
            <td><strong>${part.quantity}</strong></td>
            <td>${part.unit || '-'}</td>
            <td>${part.description || '-'}</td>
        </tr>
    `).join('');
}

// ==================== 부품 사용처 등록 ====================
async function registerUsage(e) {
    e.preventDefault();

    const partNumber = document.getElementById('usagePartNumber').value;
    if (!partNumber) {
        showMessage('부품을 먼저 선택하세요. (부품 리스트에서 행 클릭)', 'error');
        return;
    }

    const usageData = {
        partNumber: partNumber,
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
            loadAllParts();
            loadLowStockParts();
            loadAllUsage();
        } else {
            showMessage(message, 'error');
        }
    } catch (error) {
        showMessage('서버 연결 오류: ' + error.message, 'error');
    }
}

function selectPartForUsage(partNumber, partName) {
    document.getElementById('usagePartNumber').value = partNumber;
    document.getElementById('usagePartName').value = partName;
    showMessage(`부품 "${partNumber}"이(가) 선택되었습니다.`, 'info');
}

function clearUsageForm() {
    document.getElementById('usageForm').reset();
    document.getElementById('usagePartNumber').value = '';
    document.getElementById('usagePartName').value = '';
    document.getElementById('usedDate').value = new Date().toISOString().split('T')[0];
}

// ==================== 부품 사용 내역 조회 ====================
async function loadAllUsage() {
    try {
        const response = await fetch(USAGE_API);
        if (!response.ok) throw new Error('데이터 조회 실패');

        const usageList = await response.json();
        displayUsageList(usageList);
    } catch (error) {
        showMessage('사용 내역 조회 오류: ' + error.message, 'error');
    }
}

async function filterUsageByPart() {
    const partNumber = document.getElementById('usagePartFilter').value.trim();
    if (!partNumber) {
        showMessage('부품번호를 입력하세요.', 'error');
        return;
    }

    try {
        const response = await fetch(`${USAGE_API}/part/${partNumber}`);
        if (!response.ok) throw new Error('데이터 조회 실패');

        const usageList = await response.json();
        displayUsageList(usageList);
        showMessage(`부품번호 "${partNumber}" 검색 완료`, 'info');
    } catch (error) {
        showMessage('검색 오류: ' + error.message, 'error');
    }
}

async function filterUsageByLocation() {
    const location = document.getElementById('usageLocationFilter').value.trim();
    if (!location) {
        showMessage('사용처를 입력하세요.', 'error');
        return;
    }

    try {
        const response = await fetch(`${USAGE_API}/location?name=${encodeURIComponent(location)}`);
        if (!response.ok) throw new Error('데이터 조회 실패');

        const usageList = await response.json();
        displayUsageList(usageList);
        showMessage(`사용처 "${location}" 검색 완료`, 'info');
    } catch (error) {
        showMessage('검색 오류: ' + error.message, 'error');
    }
}

function displayUsageList(usageList) {
    const tbody = document.getElementById('usageTableBody');

    if (usageList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">사용 내역이 없습니다.</td></tr>';
        return;
    }

    tbody.innerHTML = usageList.map(usage => `
        <tr>
            <td class="editable" ondblclick="makeUsageEditable(event, '${usage.id}', 'usedDate', '${usage.usedDate}')">${formatDate(usage.usedDate)}</td>
            <td>${usage.partNumber || '-'}</td>
            <td>${usage.partName || '-'}</td>
            <td class="editable" ondblclick="makeUsageEditable(event, '${usage.id}', 'quantityUsed', '${usage.quantityUsed}')">${usage.quantityUsed}</td>
            <td class="editable" ondblclick="makeUsageEditable(event, '${usage.id}', 'unit', '${escapeHtml(usage.unit || '')}')">${usage.unit || '-'}</td>
            <td class="editable" ondblclick="makeUsageEditable(event, '${usage.id}', 'usageLocation', '${escapeHtml(usage.usageLocation || '')}')">${usage.usageLocation || '-'}</td>
            <td class="editable" ondblclick="makeUsageEditable(event, '${usage.id}', 'note', '${escapeHtml(usage.note || '')}')">${usage.note || '-'}</td>
            <td>${formatDateTime(usage.createdAt)}</td>
        </tr>
    `).join('');
}

// ==================== 사용 내역 셀 편집 ====================
function makeUsageEditable(event, id, field, currentValue) {
    event.stopPropagation();
    const cell = event.target;
    const originalValue = currentValue;

    if (cell.querySelector('input')) return;

    const input = document.createElement('input');
    input.type =
        field === 'quantityUsed' ? 'number' :
            field === 'usedDate' ? 'date' : 'text';

    if (field === 'usedDate' && currentValue) {
        try {
            const date = new Date(currentValue);
            input.value = date.toISOString().split('T')[0];
        } catch {
            input.value = '';
        }
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
        if (newValue === originalValue) {
            cell.textContent = originalValue || '-';
            return;
        }

        try {
            const bodyData = {};
            if (field === 'quantityUsed') {
                bodyData[field] = parseInt(newValue);
            } else {
                bodyData[field] = newValue;
            }

            const response = await fetch(`${USAGE_API}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData)
            });

            if (response.ok) {
                cell.textContent = field === 'usedDate'
                    ? formatDate(newValue)
                    : newValue || '-';
                showMessage('수정 완료 (재고 자동 반영됨)', 'success');

                loadAllUsage();
                loadAllParts();
                loadLowStockParts();
            } else {
                const msg = await response.text();
                cell.textContent = originalValue || '-';
                showMessage('수정 실패: ' + msg, 'error');
            }
        } catch (error) {
            cell.textContent = originalValue || '-';
            showMessage('수정 오류: ' + error.message, 'error');
        }
    };

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveEdit();
    });
    input.addEventListener('blur', saveEdit);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') cell.textContent = originalValue || '-';
    });
}

// ==================== 사용 내역 정렬 ====================
async function sortUsageTable(column) {
    if (currentSortColumn === column) {
        currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = column;
        currentSortOrder = 'asc';
    }

    const endpoint = currentSortOrder === 'asc'
        ? `${USAGE_API}/sort-asc?column=${column}`
        : `${USAGE_API}/sort-desc?column=${column}`;

    try {
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('정렬 실패');

        const usageList = await response.json();
        displayUsageList(usageList);
        showMessage(`${column} 기준 ${currentSortOrder === 'asc' ? '오름차순' : '내림차순'} 정렬`, 'info');
    } catch (error) {
        showMessage('정렬 오류: ' + error.message, 'error');
    }
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

function escapeHtml(text) {
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
