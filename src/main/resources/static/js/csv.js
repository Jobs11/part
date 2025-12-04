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

    // 기본 파일명 설정
    const today = new Date().toISOString().split('T')[0];
    let defaultFileName = '';
    if (csvType === 'incoming') {
        defaultFileName = `입고목록_${today}`;
    } else if (csvType === 'usage') {
        defaultFileName = `출고목록_${today}`;
    } else if (csvType === 'inventory') {
        defaultFileName = `재고목록_${today}`;
    }
    document.getElementById('csvFileName').value = defaultFileName;

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

    // 사용자가 입력한 파일명 사용
    let filename = document.getElementById('csvFileName').value.trim();
    if (!filename) {
        showMessage('파일명을 입력하세요.', 'error');
        return;
    }

    // .csv 확장자가 없으면 추가
    if (!filename.endsWith('.csv')) {
        filename += '.csv';
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
            '프로젝트명': item.projectName || '',
            '입고수량': item.incomingQuantity,
            '단위': item.unit,
            '결제수단': item.paymentMethodName || '',
            '통화': item.currency,
            '외화단가': item.originalPrice,
            '환율': item.exchangeRate,
            '구매금액': item.purchasePrice,
            '공급업체': item.supplier,
            '입고일': item.incomingDate,
            '등록일시': item.createdAt,
            '비고': item.remarks
        }));

        const headers = ['입고ID', '카테고리', '부품번호', '부품명', '설명', '프로젝트명', '입고수량', '단위', '결제수단', '통화', '외화단가', '환율', '구매금액', '공급업체', '입고일', '등록일시', '비고'];

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
