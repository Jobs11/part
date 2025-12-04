// ==================== 출고 관련 전역 변수 ====================
// API 상수는 constants.js에서 선언됨
// projectsData는 category.js에서 선언됨

// 출고 관련 전역 변수
let selectedPart = null; // 부품 배치도에서 쓸 선택된 부품 정보
let currentUsageSortColumn = null;
let currentUsageSortOrder = 'asc';
let currentUsageSearchKeyword = ''; // 전역 변수 추가
let currentUsageSearchColumn = ''; // 선택된 컬럼

// ==================== 출고 등록 ====================

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

    const usedDateValue = document.getElementById('usedDate').value;
    const usageData = {
        incomingId: parseInt(incomingId),
        partNumber: document.getElementById('usagePartNumber').value,
        quantityUsed: parseInt(document.getElementById('quantityUsed').value),
        usageLocation: document.getElementById('usageLocation').value,
        usedDatetime: usedDateValue || null,  // yyyy-MM-dd 형식 (LocalDate)
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
    const now = new Date();
    // datetime-local 형식: YYYY-MM-DDTHH:mm (toISOString 사용으로 안전한 날짜 문자열 생성)
    const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    document.getElementById('usedDate').value = localDateTime;
}

// 출고 프로젝트 목록 로드
async function loadUsageProjects() {
    try {
        await loadProjects(); // 프로젝트 데이터 로드

        const usageProjectSelect = document.getElementById('usageProjectSelect');
        if (usageProjectSelect) {
            // 기존 옵션 제거 (첫 번째 "프로젝트 선택" 옵션은 유지)
            while (usageProjectSelect.children.length > 1) {
                usageProjectSelect.removeChild(usageProjectSelect.lastChild);
            }

            // 프로젝트 목록 추가
            projectsData.forEach(project => {
                const option = document.createElement('option');
                option.value = project.categoryName;
                option.textContent = project.categoryName;
                usageProjectSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('출고 프로젝트 목록 로드 오류:', error);
    }
}

// 프로젝트 선택 시 사용처에 자동 입력
function selectUsageProject() {
    const projectSelect = document.getElementById('usageProjectSelect');
    const usageLocationInput = document.getElementById('usageLocation');

    if (projectSelect.value) {
        usageLocationInput.value = projectSelect.value;
    }
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

// 사용내역 컬럼 순차 자동 검색 함수
async function searchUsageWithFallback(searchTerm, selectedColumn) {
    // 검색 가능한 모든 컬럼 (테이블 순서대로)
    const searchableColumns = [
        'used_datetime',
        'part_number',
        'part_name',
        'quantity_used',
        'unit',
        'usage_location',
        'note',
        'created_at'
    ];

    const columnNames = {
        'used_datetime': '사용일시',
        'part_number': '부품번호',
        'part_name': '부품명',
        'quantity_used': '사용수량',
        'unit': '단위',
        'usage_location': '사용위치',
        'note': '비고',
        'created_at': '등록일시'
    };

    const columnIndex = {
        'used_datetime': 0,
        'part_number': 1,
        'part_name': 2,
        'quantity_used': 3,
        'unit': 4,
        'usage_location': 5,
        'note': 6,
        'created_at': 7
    };

    // 선택된 컬럼이 있으면 먼저 검색
    if (selectedColumn) {
        try {
            const response = await fetch(`${USAGE_API}/search-advanced?keyword=${encodeURIComponent(searchTerm)}&column=${selectedColumn}&order=${currentUsageSortOrder}`);
            if (!response.ok) throw new Error('검색 실패');

            const usageList = await response.json();

            if (usageList.length > 0) {
                displayUsageList(usageList);
                showMessage(`${columnNames[selectedColumn]} 컬럼에서 ${usageList.length}개 검색됨`, 'info');
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
            const response = await fetch(`${USAGE_API}/search-advanced?keyword=${encodeURIComponent(searchTerm)}&column=${column}&order=${currentUsageSortOrder}`);
            if (!response.ok) continue;

            const usageList = await response.json();

            if (usageList.length > 0) {
                // 찾은 컬럼으로 자동 선택 변경
                currentUsageSearchColumn = column;

                // 모든 헤더 초기화
                document.querySelectorAll('#usageTable th').forEach(th => {
                    th.style.backgroundColor = '';
                    th.style.fontWeight = '';
                });

                // 찾은 컬럼 헤더 강조
                const headers = document.querySelectorAll('#usageTable th');
                if (columnIndex[column] !== undefined && headers[columnIndex[column]]) {
                    headers[columnIndex[column]].style.backgroundColor = '#e3f2fd';
                    headers[columnIndex[column]].style.fontWeight = 'bold';
                }

                displayUsageList(usageList);
                const message = selectedColumn
                    ? `${columnNames[selectedColumn]} 컬럼에서 결과 없음 → ${columnNames[column]} 컬럼에서 ${usageList.length}개 발견!`
                    : `${columnNames[column]} 컬럼에서 ${usageList.length}개 검색됨`;
                showMessage(message, 'success');
                return true;
            }
        } catch (error) {
            console.error(`${column} 검색 오류:`, error);
            continue;
        }
    }

    // 모든 컬럼에서 검색했지만 결과 없음
    displayUsageList([]);
    showMessage('모든 컬럼에서 검색했지만 결과를 찾을 수 없습니다.', 'warning');
    return false;
}

async function searchUsage() {
    const searchTerm = document.getElementById('usageSearchInput').value.trim();
    currentUsageSearchKeyword = searchTerm; // 검색어 저장

    if (!searchTerm) {
        loadAllUsage();
        return;
    }

    try {
        // 컬럼이 선택되었으면 순차 검색 사용
        if (currentUsageSearchColumn) {
            await searchUsageWithFallback(searchTerm, currentUsageSearchColumn);
        } else {
            // 전체 검색 (기존 방식)
            const column = currentUsageSortColumn || '';
            const response = await fetch(`${USAGE_API}/search-advanced?keyword=${encodeURIComponent(searchTerm)}&column=${column}&order=${currentUsageSortOrder}`);
            if (!response.ok) throw new Error('검색 실패');

            const usageList = await response.json();
            displayUsageList(usageList);
            showMessage(`${usageList.length}개 검색됨`, 'info');
        }
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
        'used_datetime': 0,  // 사용일시
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
            <td class="editable" ondblclick="makeUsageEditable(event, ${usage.usageId}, 'usedDatetime', '${usage.usedDatetime}')">${formatDateTime(usage.usedDatetime)}</td>
            <td>${usage.partNumber || '-'}</td>
            <td>${usage.partName || '-'}</td>
            <td class="editable" ondblclick="makeUsageEditable(event, ${usage.usageId}, 'quantityUsed', ${usage.quantityUsed})">${usage.quantityUsed}</td>
            <td>${usage.unit || '-'}</td>
            <td class="editable" ondblclick="makeUsageEditable(event, ${usage.usageId}, 'usageLocation', '${escapeHtml(usage.usageLocation || '')}')">${usage.usageLocation || '-'}</td>
            <td>${usage.note || '-'}</td>
            <td>${formatDateTime(usage.createdAt)}</td>
            <td><button class="btn-small" data-part-number="${escapeHtml(usage.partNumber)}" onclick="openPartLocationView(this.dataset.partNumber)">📍 배치도</button></td>
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
            field === 'usedDatetime' ? 'date' : 'text';

    if (field === 'usedDatetime' && currentValue) {
        // yyyy-MM-dd HH:mm:ss 형식에서 yyyy-MM-dd만 추출
        const dateValue = currentValue.substring(0, 10);
        input.value = dateValue;
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
            if (field === 'usedDatetime') {
                cell.textContent = formatDateTime(originalValue);
            } else {
                cell.textContent = originalValue || '-';
            }
            return;
        }

        try {
            const bodyData = {};
            if (field === 'quantityUsed') {
                bodyData[field] = parseInt(newValue);
            } else if (field === 'usedDatetime') {
                // date 값을 yyyy-MM-dd 형식으로 전송 (LocalDate)
                bodyData[field] = newValue || null;
            } else {
                bodyData[field] = newValue;
            }

            const response = await fetch(`${USAGE_API}/${usageId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData)
            });

            if (response.ok) {
                cell.textContent = field === 'usedDatetime' ? formatDateTime(newValue) : newValue || '-';
                showMessage('수정 완료 (재고 자동 반영됨)', 'success');
                loadAllUsage();
                loadInventory();
                loadLowStock();
            } else {
                const msg = await response.text();
                cell.textContent = field === 'usedDatetime' ? formatDateTime(originalValue) : originalValue || '-';
                showMessage('수정 실패: ' + msg, 'error');
            }
        } catch (error) {
            cell.textContent = field === 'usedDatetime' ? formatDateTime(originalValue) : originalValue || '-';
            showMessage('수정 오류: ' + error.message, 'error');
        }
    };

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveEdit();
    });
    input.addEventListener('blur', saveEdit);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            cell.textContent = field === 'usedDatetime' ? formatDateTime(originalValue) : originalValue || '-';
        }
    });
}

// ==================== 프로젝트 데이터 로드 (의존성) ====================
// 유틸리티 함수들은 utils.js에서 선언됨
async function loadProjects() {
    try {
        const response = await fetch(PROJECT_API);
        if (!response.ok) throw new Error('프로젝트 조회 실패');
        projectsData = await response.json();
    } catch (error) {
        showMessage('프로젝트 조회 오류: ' + error.message, 'error');
    }
}

// ==================== 외부 함수 참조 (main.js에서 정의된 함수들) ====================
// 다음 함수들은 main.js에서 정의되어야 합니다:
// - loadInventory() : 재고 현황 로드
// - loadLowStock() : 적정재고 미달 목록 로드
// - openPartLocationView(partNumber) : 부품 배치도 열기
