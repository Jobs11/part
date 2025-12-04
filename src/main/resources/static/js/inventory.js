// ==================== 재고 관련 전역 변수 ====================
// API 상수는 constants.js에서 선언됨
let inventoryData = [];
let lowStockData = [];
let currentInventorySearchKeyword = '';
let currentInventorySearchColumn = '';
let currentInventorySortColumn = null;
let currentInventorySortOrder = 'asc';

// ==================== 재고 현황 조회 ====================
// 유틸리티 함수들은 utils.js에서 선언됨
async function loadInventory() {
    // 검색어만 초기화 (선택한 컬럼은 유지)
    document.getElementById('inventorySearchInput').value = '';
    currentInventorySearchKeyword = '';

    try {
        const response = await fetch(`${INCOMING_API}/inventory`);
        if (!response.ok) throw new Error('재고 조회 실패');

        inventoryData = await response.json();

        // 카테고리 필터 적용
        const selectedCategory = document.getElementById('inventoryCategoryFilter')?.value;
        const filteredData = selectedCategory
            ? inventoryData.filter(item => item.category_name === selectedCategory)
            : inventoryData;

        displayInventory(filteredData);
    } catch (error) {
        showMessage('재고 조회 오류: ' + error.message, 'error');
    }
}

// 재고 검색 (백엔드 고급 검색 연동)
// 현재재고현황 컬럼 순차 자동 검색 함수
async function searchInventoryWithFallback(searchTerm, selectedColumn) {
    // 검색 가능한 모든 컬럼 (테이블 순서대로)
    const searchableColumns = [
        'part_number',
        'part_name',
        'category_name',
        'current_stock',
        'total_incoming',
        'total_used',
        'incoming_count'
    ];

    const columnNames = {
        'part_number': '부품번호',
        'part_name': '부품명',
        'category_name': '카테고리',
        'current_stock': '현재재고',
        'total_incoming': '총입고',
        'total_used': '총출고',
        'incoming_count': '입고횟수'
    };

    const columnIndex = {
        'part_number': 0,
        'part_name': 1,
        'category_name': 2,
        'current_stock': 3,
        'unit': 4,
        'total_incoming': 5,
        'total_used': 6,
        'incoming_count': 7
    };

    // 선택된 컬럼이 있으면 먼저 검색
    if (selectedColumn) {
        try {
            const params = new URLSearchParams();
            params.append('keyword', searchTerm);
            params.append('column', selectedColumn);

            const response = await fetch(`${INCOMING_API}/inventory/search-advanced?${params.toString()}`);
            if (!response.ok) throw new Error('검색 실패');

            const inventoryList = await response.json();

            if (inventoryList.length > 0) {
                inventoryData = inventoryList;
                displayInventory(inventoryData);
                showMessage(`${columnNames[selectedColumn]} 컬럼에서 ${inventoryList.length}개 검색됨`, 'info');
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
            const params = new URLSearchParams();
            params.append('keyword', searchTerm);
            params.append('column', column);

            const response = await fetch(`${INCOMING_API}/inventory/search-advanced?${params.toString()}`);
            if (!response.ok) continue;

            const inventoryList = await response.json();

            if (inventoryList.length > 0) {
                // 찾은 컬럼으로 자동 선택 변경
                currentInventorySearchColumn = column;

                // 모든 헤더 초기화
                document.querySelectorAll('#inventoryTable th').forEach(th => {
                    th.style.backgroundColor = '';
                    th.style.fontWeight = '';
                });

                // 찾은 컬럼 헤더 강조
                const headers = document.querySelectorAll('#inventoryTable th');
                if (columnIndex[column] !== undefined && headers[columnIndex[column]]) {
                    headers[columnIndex[column]].style.backgroundColor = '#e3f2fd';
                    headers[columnIndex[column]].style.fontWeight = 'bold';
                }

                inventoryData = inventoryList;
                displayInventory(inventoryData);
                const message = selectedColumn
                    ? `${columnNames[selectedColumn]} 컬럼에서 결과 없음 → ${columnNames[column]} 컬럼에서 ${inventoryList.length}개 발견!`
                    : `${columnNames[column]} 컬럼에서 ${inventoryList.length}개 검색됨`;
                showMessage(message, 'success');
                return true;
            }
        } catch (error) {
            console.error(`${column} 검색 오류:`, error);
            continue;
        }
    }

    // 모든 컬럼에서 검색했지만 결과 없음
    inventoryData = [];
    displayInventory(inventoryData);
    showMessage('모든 컬럼에서 검색했지만 결과를 찾을 수 없습니다.', 'warning');
    return false;
}

async function searchInventory() {
    const searchTerm = document.getElementById('inventorySearchInput').value.trim();

    if (!searchTerm) {
        await loadInventory();
        return;
    }

    // 컬럼이 선택되었으면 순차 검색 사용
    if (currentInventorySearchColumn) {
        await searchInventoryWithFallback(searchTerm, currentInventorySearchColumn);
    } else {
        // 전체 검색 (기존 방식)
        await requestInventorySearch(searchTerm, '');
    }
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

async function sortInventoryTable(column) {
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

    // 검색어가 있는지 확인
    const searchTerm = document.getElementById('inventorySearchInput')?.value.trim() || '';

    if (searchTerm) {
        // 검색어가 있으면 서버에 검색 + 정렬 요청
        try {
            currentInventorySearchKeyword = searchTerm;

            const params = new URLSearchParams();
            params.append('keyword', searchTerm);
            params.append('column', column);
            params.append('sortColumn', column);
            params.append('order', currentInventorySortOrder);

            const response = await fetch(`${INCOMING_API}/inventory/search-advanced?${params.toString()}`);
            if (!response.ok) throw new Error('검색+정렬 실패');

            inventoryData = await response.json();
            displayInventory(inventoryData);
            showMessage(`${column} 기준 ${currentInventorySortOrder === 'asc' ? '오름차순' : '내림차순'} 정렬 (검색: ${inventoryData.length}건)`, 'info');
        } catch (error) {
            showMessage('검색+정렬 오류: ' + error.message, 'error');
        }
    } else {
        // 검색어가 없으면 클라이언트 측 정렬
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
}

function displayInventory(inventory) {
    const tbody = document.getElementById('inventoryTableBody');

    if (inventory.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">재고 데이터가 없습니다.</td></tr>';
        return;
    }

    tbody.innerHTML = inventory.map(item => `
        <tr>
            <td class="clickable-row" onclick="selectPartForUsage('${item.part_number}', '${escapeHtml(item.part_name || '')}')">${item.part_number}</td>
            <td class="clickable-row" onclick="selectPartForUsage('${item.part_number}', '${escapeHtml(item.part_name || '')}')">${item.part_name || '-'}</td>
            <td class="clickable-row" onclick="selectPartForUsage('${item.part_number}', '${escapeHtml(item.part_name || '')}')">${item.category_name || '-'}</td>
            <td class="clickable-row" onclick="selectPartForUsage('${item.part_number}', '${escapeHtml(item.part_name || '')}')"><strong>${item.current_stock}</strong></td>
            <td class="clickable-row" onclick="selectPartForUsage('${item.part_number}', '${escapeHtml(item.part_name || '')}')">${item.unit || '-'}</td>
            <td class="clickable-row" onclick="selectPartForUsage('${item.part_number}', '${escapeHtml(item.part_name || '')}')">${item.total_incoming}</td>
            <td class="clickable-row" onclick="selectPartForUsage('${item.part_number}', '${escapeHtml(item.part_name || '')}')">${item.total_used}</td>
            <td class="clickable-row" onclick="selectPartForUsage('${item.part_number}', '${escapeHtml(item.part_name || '')}')">${item.incoming_count}</td>
            <td><button class="btn-small" data-part-number="${escapeHtml(item.part_number)}" onclick="event.stopPropagation(); openPartLocationView(this.dataset.partNumber)">📍 배치도</button></td>
        </tr>
    `).join('');
}

// ==================== 재고 부족 조회 ====================
async function loadLowStock() {
    try {
        const threshold = document.getElementById('lowStockThreshold').value || 10;

        const response = await fetch(`${INCOMING_API}/low-stock?threshold=${threshold}`);
        if (!response.ok) throw new Error('재고 부족 조회 실패');

        lowStockData = await response.json();

        // 카테고리 필터 적용
        const selectedCategory = document.getElementById('inventoryCategoryFilter')?.value;
        const filteredData = selectedCategory
            ? lowStockData.filter(item => item.category_name === selectedCategory)
            : lowStockData;

        displayLowStock(filteredData);
        showMessage(`${threshold}개 이하 부품: ${filteredData.length}건`, 'info');
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

// 카테고리 필터 변경 시 현재재고와 재고부족을 동시에 필터링
function filterInventoryByCategory() {
    const selectedCategory = document.getElementById('inventoryCategoryFilter').value;

    // 현재 재고 현황 필터링
    if (inventoryData.length > 0) {
        const filteredInventory = selectedCategory
            ? inventoryData.filter(item => item.category_name === selectedCategory)
            : inventoryData;
        displayInventory(filteredInventory);
    }

    // 재고 부족 부품 필터링
    if (lowStockData.length > 0) {
        const filteredLowStock = selectedCategory
            ? lowStockData.filter(item => item.category_name === selectedCategory)
            : lowStockData;
        displayLowStock(filteredLowStock);
    }
}
