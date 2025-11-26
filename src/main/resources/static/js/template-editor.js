// ==================== 템플릿 에디터 ====================

const TEMPLATE_API = '/livewalk/document-templates';
const DOCUMENT_API = '/livewalk/template-documents';

// 에디터 상태
let editorState = {
    canvas: null,
    ctx: null,
    backgroundImage: null,
    backgroundImageId: null,
    tables: [], // [{x, y, width, height, columns: [{name, width}], rowHeight, orientation: 'horizontal'|'vertical'}]
    selectedTableIndex: null, // 현재 선택된 표의 인덱스
    selectedTablesForMerge: [], // 병합을 위해 선택된 표들의 인덱스
    texts: [], // [{text, x, y, fontSize, fontWeight}]
    mode: 'normal', // 'normal', 'draw-table', 'add-text', 'merge-tables'
    dragStart: null
};

/**
 * 템플릿 에디터 열기
 */
async function openTemplateEditor() {
    document.getElementById('templateEditorModal').style.display = 'block';

    // 캔버스 초기화
    const canvas = document.getElementById('templateEditorCanvas');
    canvas.width = 794;  // A4 width at 96 DPI
    canvas.height = 1123; // A4 height at 96 DPI

    editorState.canvas = canvas;
    editorState.ctx = canvas.getContext('2d');

    // 초기 상태 리셋
    editorState.backgroundImage = null;
    editorState.backgroundImageId = null;
    editorState.tables = [];
    editorState.selectedTableIndex = null;
    editorState.selectedTablesForMerge = [];
    editorState.texts = [];
    editorState.mode = 'normal';

    // 배경 이미지 목록 로드
    await loadBackgroundImages();

    // 캔버스 이벤트 리스너
    canvas.addEventListener('mousedown', handleCanvasMouseDown);
    canvas.addEventListener('mousemove', handleCanvasMouseMove);
    canvas.addEventListener('mouseup', handleCanvasMouseUp);
    canvas.addEventListener('click', handleCanvasClick);

    redrawCanvas();
}

/**
 * 템플릿 에디터 닫기
 */
function closeTemplateEditor() {
    document.getElementById('templateEditorModal').style.display = 'none';
    editorState = {
        canvas: null,
        ctx: null,
        backgroundImage: null,
        backgroundImageId: null,
        tables: [],
        selectedTableIndex: null,
        selectedTablesForMerge: [],
        texts: [],
        mode: 'normal',
        dragStart: null
    };
}

/**
 * 배경 이미지 목록 로드
 */
async function loadBackgroundImages() {
    try {
        const response = await fetch('/livewalk/library');
        if (response.ok) {
            const images = await response.json();
            const select = document.getElementById('backgroundImageSelect');
            select.innerHTML = '<option value="">-- 배경 없음 --</option>';

            images.forEach(img => {
                if (img.fileType !== 'pdf') {
                    const option = document.createElement('option');
                    option.value = img.imageId;
                    option.textContent = img.title;
                    option.dataset.fileName = img.fileName;
                    select.appendChild(option);
                }
            });
        }
    } catch (error) {
        console.error('배경 이미지 목록 로드 오류:', error);
    }
}

/**
 * 배경 이미지 변경
 */
async function handleBackgroundImageChange() {
    const select = document.getElementById('backgroundImageSelect');
    const imageId = select.value;

    if (!imageId) {
        editorState.backgroundImage = null;
        editorState.backgroundImageId = null;
        redrawCanvas();
        return;
    }

    const fileName = select.selectedOptions[0].dataset.fileName;
    const img = new Image();
    img.onload = () => {
        editorState.backgroundImage = img;
        editorState.backgroundImageId = parseInt(imageId);
        redrawCanvas();
    };
    img.src = `/uploads/images/${fileName}`;
}

/**
 * 캔버스 다시 그리기
 */
function redrawCanvas() {
    const {canvas, ctx, backgroundImage, tables, texts} = editorState;

    // 캔버스 초기화
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 배경 이미지 (원본 크기로 위쪽에 배치)
    if (backgroundImage) {
        ctx.drawImage(backgroundImage, 0, 0);
    }

    // 모든 표 그리기
    tables.forEach(table => {
        drawTable(table);
    });

    // 텍스트 그리기
    texts.forEach(text => {
        drawText(text);
    });
}

/**
 * 표 그리기
 */
function drawTable(table) {
    const {ctx} = editorState;
    const {x, y, width, height, columns, rowHeight, orientation = 'horizontal'} = table;

    // 표 테두리
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    ctx.lineWidth = 1;
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (orientation === 'horizontal') {
        // 가로형: 헤더가 위에
        let currentX = x;
        columns.forEach((col, idx) => {
            if (idx > 0) {
                ctx.beginPath();
                ctx.moveTo(currentX, y);
                ctx.lineTo(currentX, y + height);
                ctx.stroke();
            }

            ctx.font = 'bold 14px Arial';
            ctx.fillText(col.name, currentX + col.width / 2, y + rowHeight / 2);
            currentX += col.width;
        });

        // 헤더 구분선
        ctx.beginPath();
        ctx.moveTo(x, y + rowHeight);
        ctx.lineTo(x + width, y + rowHeight);
        ctx.stroke();

    } else {
        // 세로형: 헤더가 왼쪽에
        const headerWidth = columns[0].width; // 첫 번째 컬럼이 헤더
        let currentY = y;

        columns.forEach((col, idx) => {
            if (idx > 0) {
                ctx.beginPath();
                ctx.moveTo(x, currentY);
                ctx.lineTo(x + width, currentY);
                ctx.stroke();
            }

            ctx.font = 'bold 14px Arial';
            ctx.fillText(col.name, x + headerWidth / 2, currentY + rowHeight / 2);
            currentY += rowHeight;
        });

        // 헤더와 데이터 구분선
        ctx.beginPath();
        ctx.moveTo(x + headerWidth, y);
        ctx.lineTo(x + headerWidth, y + height);
        ctx.stroke();
    }
}

/**
 * 텍스트 그리기
 */
function drawText(text) {
    const {ctx} = editorState;
    ctx.fillStyle = '#000';
    ctx.font = `${text.fontWeight} ${text.fontSize}px Arial`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(text.text, text.x, text.y);
}

/**
 * 표 그리기 모드 활성화
 */
function enableTableDrawMode() {
    editorState.mode = 'draw-table';
    editorState.canvas.style.cursor = 'crosshair';
    showMessage('캔버스에서 드래그하여 표 영역을 그리세요.', 'info');
}

/**
 * 텍스트 추가 모드 활성화
 */
function enableTextAddMode() {
    editorState.mode = 'add-text';
    editorState.canvas.style.cursor = 'text';
    showMessage('캔버스를 클릭하여 텍스트를 추가하세요.', 'info');
}

/**
 * 캔버스 마우스 다운
 */
function handleCanvasMouseDown(e) {
    if (editorState.mode === 'draw-table') {
        const rect = editorState.canvas.getBoundingClientRect();
        editorState.dragStart = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }
}

/**
 * 캔버스 마우스 무브
 */
function handleCanvasMouseMove(e) {
    if (editorState.mode === 'draw-table' && editorState.dragStart) {
        const rect = editorState.canvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;

        // 임시로 사각형 그리기
        redrawCanvas();
        const {ctx} = editorState;
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
            editorState.dragStart.x,
            editorState.dragStart.y,
            currentX - editorState.dragStart.x,
            currentY - editorState.dragStart.y
        );
        ctx.setLineDash([]);
    }
}

/**
 * 캔버스 마우스 업
 */
function handleCanvasMouseUp(e) {
    if (editorState.mode === 'draw-table' && editorState.dragStart) {
        const rect = editorState.canvas.getBoundingClientRect();
        const endX = e.clientX - rect.left;
        const endY = e.clientY - rect.top;

        const x = Math.min(editorState.dragStart.x, endX);
        const y = Math.min(editorState.dragStart.y, endY);
        const width = Math.abs(endX - editorState.dragStart.x);
        const height = Math.abs(endY - editorState.dragStart.y);

        if (width > 50 && height > 50) {
            const newTable = {
                x, y, width, height,
                columns: [{name: '항목', width: width / 2}, {name: '내용', width: width / 2}],
                rowHeight: 30,
                orientation: 'horizontal'
            };

            editorState.tables.push(newTable);
            editorState.selectedTableIndex = editorState.tables.length - 1;

            // 표 설정 패널 표시
            document.getElementById('tableConfigPanel').style.display = 'block';

            // 위치 및 크기 입력 필드 업데이트
            document.getElementById('tableX').value = Math.round(x);
            document.getElementById('tableY').value = Math.round(y);
            document.getElementById('tableWidth').value = Math.round(width);
            document.getElementById('tableHeight').value = Math.round(height);
            document.getElementById('tableOrientation').value = 'horizontal';

            renderColumnsList();
            renderTablesList();

            editorState.mode = 'normal';
            editorState.canvas.style.cursor = 'default';
            redrawCanvas();
            showMessage('표 영역이 생성되었습니다. 컬럼을 설정하세요.', 'success');
        }

        editorState.dragStart = null;
    }
}

/**
 * 캔버스 클릭 (텍스트 추가)
 */
function handleCanvasClick(e) {
    if (editorState.mode === 'add-text') {
        const rect = editorState.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const text = prompt('추가할 텍스트를 입력하세요:');
        if (!text) return;

        const fontSize = parseInt(prompt('글자 크기 (px):', '16'));
        const fontWeight = confirm('굵게 표시하시겠습니까?') ? 'bold' : 'normal';

        editorState.texts.push({text, x, y, fontSize, fontWeight});
        redrawCanvas();

        editorState.mode = 'normal';
        editorState.canvas.style.cursor = 'default';
        showMessage('텍스트가 추가되었습니다.', 'success');
    }
}

/**
 * 컬럼 목록 렌더링
 */
function renderColumnsList() {
    const container = document.getElementById('columnsList');
    container.innerHTML = '';

    const selectedTable = editorState.tables[editorState.selectedTableIndex];
    if (!selectedTable) return;

    selectedTable.columns.forEach((col, idx) => {
        const div = document.createElement('div');
        div.style.cssText = 'display: flex; gap: 5px; margin-bottom: 8px; align-items: center;';
        div.innerHTML = `
            <input type="text" value="${col.name}"
                   onchange="updateColumnName(${idx}, this.value)"
                   style="flex: 1; padding: 6px; border: 1px solid #ddd; border-radius: 4px;">
            <input type="number" value="${Math.round(col.width)}"
                   onchange="updateColumnWidth(${idx}, this.value)"
                   style="width: 80px; padding: 6px; border: 1px solid #ddd; border-radius: 4px;"
                   placeholder="너비">
            <button onclick="removeColumn(${idx})" class="btn btn-gray" style="padding: 6px 10px;">✕</button>
        `;
        container.appendChild(div);
    });
}

/**
 * 컬럼 추가
 */
function addColumn() {
    const selectedTable = editorState.tables[editorState.selectedTableIndex];
    if (!selectedTable) return;

    const newWidth = selectedTable.width / (selectedTable.columns.length + 1);
    selectedTable.columns.forEach(col => col.width = newWidth);
    selectedTable.columns.push({name: '새 컬럼', width: newWidth});

    // 세로형일 경우 표 높이 재계산
    if (selectedTable.orientation === 'vertical') {
        const newHeight = selectedTable.columns.length * selectedTable.rowHeight;
        selectedTable.height = newHeight;
    }

    renderColumnsList();
    redrawCanvas();
}

/**
 * 컬럼 이름 업데이트
 */
function updateColumnName(idx, name) {
    const selectedTable = editorState.tables[editorState.selectedTableIndex];
    if (selectedTable && selectedTable.columns[idx]) {
        selectedTable.columns[idx].name = name;
        redrawCanvas();
    }
}

/**
 * 컬럼 너비 업데이트
 */
function updateColumnWidth(idx, width) {
    const selectedTable = editorState.tables[editorState.selectedTableIndex];
    if (selectedTable && selectedTable.columns[idx]) {
        selectedTable.columns[idx].width = parseFloat(width);
        redrawCanvas();
    }
}

/**
 * 컬럼 삭제
 */
function removeColumn(idx) {
    const selectedTable = editorState.tables[editorState.selectedTableIndex];
    if (!selectedTable || selectedTable.columns.length <= 1) {
        showMessage('최소 1개의 컬럼은 필요합니다.', 'error');
        return;
    }

    selectedTable.columns.splice(idx, 1);

    // 세로형일 경우 표 높이 재계산
    if (selectedTable.orientation === 'vertical') {
        const newHeight = selectedTable.columns.length * selectedTable.rowHeight;
        selectedTable.height = newHeight;
    }

    renderColumnsList();
    redrawCanvas();
}

/**
 * 표 방향 업데이트
 */
function updateTableOrientation(orientation) {
    const selectedTable = editorState.tables[editorState.selectedTableIndex];
    if (selectedTable) {
        const previousOrientation = selectedTable.orientation;
        selectedTable.orientation = orientation;

        // 세로형으로 변경 시 높이를 컬럼 수에 맞게 조정
        if (orientation === 'vertical' && previousOrientation !== 'vertical') {
            selectedTable.height = selectedTable.columns.length * selectedTable.rowHeight;
            document.getElementById('tableHeight').value = Math.round(selectedTable.height);
        }

        redrawCanvas();
    }
}

/**
 * 표 위치 업데이트
 */
function updateTablePosition() {
    const selectedTable = editorState.tables[editorState.selectedTableIndex];
    if (!selectedTable) return;

    const newX = parseInt(document.getElementById('tableX').value);
    const newY = parseInt(document.getElementById('tableY').value);

    if (isNaN(newX) || isNaN(newY)) return;

    selectedTable.x = Math.max(0, Math.min(newX, 794));
    selectedTable.y = Math.max(0, Math.min(newY, 1123));

    redrawCanvas();
}

/**
 * 표 크기 업데이트
 */
function updateTableSize() {
    const selectedTable = editorState.tables[editorState.selectedTableIndex];
    if (!selectedTable) return;

    const newWidth = parseInt(document.getElementById('tableWidth').value);
    const newHeight = parseInt(document.getElementById('tableHeight').value);

    if (isNaN(newWidth) || isNaN(newHeight)) return;

    selectedTable.width = Math.max(50, Math.min(newWidth, 794));
    selectedTable.height = Math.max(50, Math.min(newHeight, 1123));

    // 컬럼 너비 재조정
    const totalWidth = selectedTable.width;
    const colCount = selectedTable.columns.length;
    selectedTable.columns.forEach(col => {
        col.width = totalWidth / colCount;
    });

    renderColumnsList();
    redrawCanvas();
}

/**
 * 표 목록 렌더링
 */
function renderTablesList() {
    const container = document.getElementById('tablesList');
    if (!container) return;

    container.innerHTML = '';

    if (editorState.tables.length === 0) {
        container.innerHTML = '<p style="color: #666; font-size: 12px;">생성된 표가 없습니다.</p>';
        return;
    }

    const isMergeMode = editorState.mode === 'merge-tables';

    editorState.tables.forEach((table, idx) => {
        const isSelected = idx === editorState.selectedTableIndex;
        const isSelectedForMerge = editorState.selectedTablesForMerge.includes(idx);

        const div = document.createElement('div');
        div.style.cssText = `
            padding: 8px;
            margin-bottom: 5px;
            border: 2px solid ${isSelectedForMerge ? '#28a745' : (isSelected ? '#007bff' : '#ddd')};
            border-radius: 4px;
            cursor: pointer;
            background: ${isSelectedForMerge ? '#d4edda' : (isSelected ? '#e7f3ff' : 'white')};
        `;
        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 12px; font-weight: ${isSelected || isSelectedForMerge ? 'bold' : 'normal'};">
                    ${isSelectedForMerge ? '✓ ' : ''}표 ${idx + 1} (${table.orientation === 'horizontal' ? '가로형' : '세로형'})
                </span>
                ${!isMergeMode ? `<button onclick="removeTable(${idx})" class="btn btn-gray" style="padding: 2px 6px; font-size: 11px;">삭제</button>` : ''}
            </div>
        `;
        div.onclick = (e) => {
            if (e.target.tagName !== 'BUTTON') {
                if (isMergeMode) {
                    toggleTableForMerge(idx);
                } else {
                    selectTable(idx);
                }
            }
        };
        container.appendChild(div);
    });
}

/**
 * 표 선택
 */
function selectTable(idx) {
    editorState.selectedTableIndex = idx;
    const table = editorState.tables[idx];

    if (table) {
        // 위치 입력 필드 업데이트
        document.getElementById('tableX').value = Math.round(table.x);
        document.getElementById('tableY').value = Math.round(table.y);

        // 크기 입력 필드 업데이트
        document.getElementById('tableWidth').value = Math.round(table.width);
        document.getElementById('tableHeight').value = Math.round(table.height);

        // 기타 설정 업데이트
        document.getElementById('tableOrientation').value = table.orientation;
        document.getElementById('tableRowHeight').value = table.rowHeight;

        renderColumnsList();
        renderTablesList();
        redrawCanvas();
    }
}

/**
 * 표 삭제
 */
function removeTable(idx) {
    if (!confirm(`표 ${idx + 1}을(를) 삭제하시겠습니까?`)) return;

    editorState.tables.splice(idx, 1);

    // 선택 인덱스 조정
    if (editorState.selectedTableIndex >= editorState.tables.length) {
        editorState.selectedTableIndex = editorState.tables.length - 1;
    }

    if (editorState.selectedTableIndex >= 0) {
        selectTable(editorState.selectedTableIndex);
    } else {
        editorState.selectedTableIndex = null;
        document.getElementById('tableConfigPanel').style.display = 'none';
    }

    renderTablesList();
    redrawCanvas();
}

/**
 * 표 병합 모드 활성화
 */
function enableTableMergeMode() {
    if (editorState.tables.length < 2) {
        showMessage('병합하려면 최소 2개의 표가 필요합니다.', 'error');
        return;
    }

    editorState.mode = 'merge-tables';
    editorState.selectedTablesForMerge = [];
    showMessage('병합할 표 2개를 선택하세요.', 'info');
    renderTablesList();
}

/**
 * 표 병합 모드 취소
 */
function cancelTableMergeMode() {
    editorState.mode = 'normal';
    editorState.selectedTablesForMerge = [];
    renderTablesList();
}

/**
 * 병합을 위한 표 선택 토글
 */
function toggleTableForMerge(idx) {
    const index = editorState.selectedTablesForMerge.indexOf(idx);

    if (index > -1) {
        // 이미 선택된 경우 제거
        editorState.selectedTablesForMerge.splice(index, 1);
    } else {
        // 선택되지 않은 경우 추가 (최대 2개)
        if (editorState.selectedTablesForMerge.length < 2) {
            editorState.selectedTablesForMerge.push(idx);
        } else {
            showMessage('최대 2개의 표만 선택할 수 있습니다.', 'error');
            return;
        }
    }

    renderTablesList();

    // 2개가 선택되면 병합 실행
    if (editorState.selectedTablesForMerge.length === 2) {
        mergeTables();
    }
}

/**
 * 표 병합 실행
 */
function mergeTables() {
    const [idx1, idx2] = editorState.selectedTablesForMerge.sort((a, b) => a - b);
    const table1 = editorState.tables[idx1];
    const table2 = editorState.tables[idx2];

    // 두 표의 방향이 같은지 확인
    if (table1.orientation !== table2.orientation) {
        showMessage('같은 방향의 표만 병합할 수 있습니다.', 'error');
        cancelTableMergeMode();
        return;
    }

    const orientation = table1.orientation;
    let mergedTable;

    if (orientation === 'horizontal') {
        // 가로형: 위아래로 붙임
        // 세로로 인접한지 확인
        const isVerticallyAdjacent =
            Math.abs((table1.y + table1.height) - table2.y) < 10 ||
            Math.abs((table2.y + table2.height) - table1.y) < 10;

        if (!isVerticallyAdjacent) {
            if (!confirm('두 표가 세로로 인접하지 않습니다. 그래도 병합하시겠습니까?')) {
                cancelTableMergeMode();
                return;
            }
        }

        // 위아래 순서 정렬
        const topTable = table1.y < table2.y ? table1 : table2;

        mergedTable = {
            x: Math.min(table1.x, table2.x),
            y: topTable.y,
            width: Math.max(table1.width, table2.width),
            height: table1.height + table2.height,
            columns: topTable.columns, // 위쪽 표의 컬럼 구조 유지
            rowHeight: topTable.rowHeight,
            orientation: 'horizontal'
        };

    } else {
        // 세로형: 좌우로 붙임
        // 가로로 인접한지 확인
        const isHorizontallyAdjacent =
            Math.abs((table1.x + table1.width) - table2.x) < 10 ||
            Math.abs((table2.x + table2.width) - table1.x) < 10;

        if (!isHorizontallyAdjacent) {
            if (!confirm('두 표가 가로로 인접하지 않습니다. 그래도 병합하시겠습니까?')) {
                cancelTableMergeMode();
                return;
            }
        }

        // 좌우 순서 정렬
        const leftTable = table1.x < table2.x ? table1 : table2;

        mergedTable = {
            x: leftTable.x,
            y: Math.min(table1.y, table2.y),
            width: table1.width + table2.width,
            height: Math.max(table1.height, table2.height),
            columns: leftTable.columns, // 왼쪽 표의 컬럼 구조 유지
            rowHeight: leftTable.rowHeight,
            orientation: 'vertical'
        };
    }

    // 기존 표 2개 삭제 (큰 인덱스부터)
    editorState.tables.splice(idx2, 1);
    editorState.tables.splice(idx1, 1);

    // 병합된 표 추가
    editorState.tables.push(mergedTable);
    editorState.selectedTableIndex = editorState.tables.length - 1;

    // 병합 모드 종료
    cancelTableMergeMode();

    selectTable(editorState.selectedTableIndex);
    showMessage('표가 병합되었습니다!', 'success');
    redrawCanvas();
}

/**
 * 템플릿 저장
 */
async function saveTemplate() {
    const templateName = document.getElementById('templateName').value.trim();

    if (!templateName) {
        showMessage('양식 이름을 입력하세요.', 'error');
        return;
    }

    if (editorState.tables.length === 0) {
        showMessage('최소 1개의 표 영역을 설정하세요.', 'error');
        return;
    }

    // 선택된 표의 행 높이 업데이트
    const selectedTable = editorState.tables[editorState.selectedTableIndex];
    if (selectedTable) {
        const rowHeight = parseInt(document.getElementById('tableRowHeight').value);
        selectedTable.rowHeight = rowHeight;
    }

    const data = {
        templateName,
        backgroundImageId: editorState.backgroundImageId,
        tableConfig: JSON.stringify(editorState.tables), // 여러 표를 배열로 저장
        fixedTexts: JSON.stringify(editorState.texts),
        createdBy: 'system'
    };

    try {
        const response = await fetch(TEMPLATE_API, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });

        if (response.ok) {
            showMessage('양식이 저장되었습니다!', 'success');
            closeTemplateEditor();
        } else {
            throw new Error('저장 실패');
        }
    } catch (error) {
        showMessage('양식 저장 오류: ' + error.message, 'error');
    }
}

/**
 * 템플릿 목록 로드
 */
async function loadTemplateList() {
    const list = document.getElementById('templateList');

    try {
        const response = await fetch(TEMPLATE_API);
        if (!response.ok) throw new Error('목록 조회 실패');

        const templates = await response.json();

        if (templates.length === 0) {
            list.innerHTML = '<p style="color: #666;">저장된 양식이 없습니다.</p>';
        } else {
            list.innerHTML = templates.map(t => `
                <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; background: white;">
                    <h4 style="margin: 0 0 10px 0;">${t.templateName}</h4>
                    <p style="font-size: 12px; color: #666; margin: 5px 0;">
                        생성일: ${new Date(t.createdAt).toLocaleString()}
                    </p>
                    <button onclick="openDocumentGenerator(${t.templateId})" class="btn" style="width: 100%; margin-top: 10px;">문서 생성</button>
                    <button onclick="deleteTemplate(${t.templateId})" class="btn btn-gray" style="width: 100%; margin-top: 5px;">삭제</button>
                </div>
            `).join('');
        }
    } catch (error) {
        showMessage('목록 로드 오류: ' + error.message, 'error');
    }
}

/**
 * 템플릿 삭제
 */
async function deleteTemplate(templateId) {
    if (!confirm('이 양식을 삭제하시겠습니까?')) return;

    try {
        const response = await fetch(`${TEMPLATE_API}/${templateId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showMessage('양식이 삭제되었습니다.', 'success');
            loadTemplateList();
        } else {
            throw new Error('삭제 실패');
        }
    } catch (error) {
        showMessage('삭제 오류: ' + error.message, 'error');
    }
}

// ==================== 문서 생성 ====================

let documentGeneratorState = {
    template: null,
    tablesData: [], // 각 표별 행 데이터: [{tableIndex, rows: [[]]}]
    backgroundImage: null,
    selectedTableIndex: 0 // 현재 선택된 표
};

/**
 * 문서 생성기 열기
 */
async function openDocumentGenerator(templateId) {
    try {
        // 템플릿 정보 로드
        const response = await fetch(`${TEMPLATE_API}/${templateId}`);
        if (!response.ok) throw new Error('템플릿 조회 실패');

        const template = await response.json();
        documentGeneratorState.template = template;

        // 표 설정 파싱
        let tablesConfig = JSON.parse(template.tableConfig);

        // 단일 표인 경우 배열로 변환
        if (!Array.isArray(tablesConfig)) {
            tablesConfig = [tablesConfig];
        }

        if (tablesConfig.length === 0) {
            throw new Error('템플릿에 표가 없습니다.');
        }

        // 각 표별로 초기 1개 행 생성
        documentGeneratorState.tablesData = tablesConfig.map((tableConfig, idx) => ({
            tableIndex: idx,
            tableConfig: tableConfig,
            rows: Array(1).fill(null).map(() =>
                tableConfig.columns.map(() => '')
            )
        }));

        documentGeneratorState.selectedTableIndex = 0;

        // 모달 열기
        document.getElementById('documentGeneratorModal').style.display = 'block';
        document.getElementById('generatedDocumentName').value = '';

        // 미리보기 캔버스 초기화
        const canvas = document.getElementById('documentPreviewCanvas');
        canvas.width = 794;
        canvas.height = 1123;

        // 배경 이미지 로드 (있는 경우)
        if (template.backgroundImageId) {
            const imgResponse = await fetch('/livewalk/library');
            const images = await imgResponse.json();
            const bgImage = images.find(img => img.imageId === template.backgroundImageId);

            if (bgImage) {
                const img = new Image();
                img.onload = () => {
                    documentGeneratorState.backgroundImage = img;
                    renderDocumentTables();
                    updateDocumentPreview();
                };
                img.src = `/uploads/images/${bgImage.fileName}`;
            } else {
                renderDocumentTables();
                updateDocumentPreview();
            }
        } else {
            renderDocumentTables();
            updateDocumentPreview();
        }

    } catch (error) {
        showMessage('문서 생성기 오류: ' + error.message, 'error');
    }
}

/**
 * 문서 생성기 닫기
 */
function closeDocumentGenerator() {
    document.getElementById('documentGeneratorModal').style.display = 'none';
    documentGeneratorState = {
        template: null,
        tablesData: [],
        backgroundImage: null,
        selectedTableIndex: 0
    };
}

/**
 * 모든 문서 표 렌더링 (다중 표 지원)
 */
function renderDocumentTables() {
    const container = document.getElementById('documentTableContainer');
    const {tablesData, selectedTableIndex} = documentGeneratorState;

    if (tablesData.length === 0) {
        container.innerHTML = '<p style="color: #666;">표가 없습니다.</p>';
        return;
    }

    let html = '';

    // 표가 여러 개인 경우 탭 선택 UI 추가
    if (tablesData.length > 1) {
        html += '<div style="margin-bottom: 15px; border-bottom: 2px solid #ddd;">';
        tablesData.forEach((tableData, idx) => {
            const isSelected = idx === selectedTableIndex;
            html += `<button onclick="selectDocumentTable(${idx})"
                style="padding: 8px 16px; border: none; background: ${isSelected ? '#007bff' : '#f5f5f5'};
                color: ${isSelected ? 'white' : '#333'}; cursor: pointer; margin-right: 5px;
                border-radius: 4px 4px 0 0; font-weight: ${isSelected ? 'bold' : 'normal'};">
                표 ${idx + 1}
            </button>`;
        });
        html += '</div>';
    }

    // 선택된 표의 데이터 렌더링
    const currentTableData = tablesData[selectedTableIndex];
    const {tableConfig, rows} = currentTableData;

    html += '<table style="width: 100%; border-collapse: collapse; margin-top: 15px;">';

    // 헤더
    html += '<thead><tr>';
    tableConfig.columns.forEach(col => {
        html += `<th style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5;">${col.name}</th>`;
    });
    // 삭제 컬럼 헤더 추가
    html += `<th style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5; width: 60px;">삭제</th>`;
    html += '</tr></thead>';

    // 데이터 행
    html += '<tbody>';
    rows.forEach((row, rowIdx) => {
        html += '<tr>';
        row.forEach((cellValue, colIdx) => {
            html += `<td style="border: 1px solid #ddd; padding: 8px;">
                <input type="text" value="${cellValue}"
                       onchange="updateDocumentCell(${rowIdx}, ${colIdx}, this.value)"
                       style="width: 100%; border: none; padding: 4px;">
            </td>`;
        });
        // 삭제 버튼 컬럼 추가
        html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center; width: 60px;">
            <button onclick="removeDocumentRow(${rowIdx})" class="btn btn-gray" style="padding: 4px 8px; font-size: 11px;">삭제</button>
        </td>`;
        html += '</tr>';
    });
    html += '</tbody>';
    html += '</table>';

    html += '<button onclick="addDocumentRow()" class="btn btn-gray" style="margin-top: 10px;">+ 행 추가</button>';

    container.innerHTML = html;

    // 미리보기 업데이트
    updateDocumentPreview();
}

/**
 * 문서 생성 시 표 선택
 */
function selectDocumentTable(idx) {
    documentGeneratorState.selectedTableIndex = idx;
    renderDocumentTables();
}

/**
 * 문서 셀 업데이트
 */
function updateDocumentCell(rowIdx, colIdx, value) {
    const {selectedTableIndex} = documentGeneratorState;
    documentGeneratorState.tablesData[selectedTableIndex].rows[rowIdx][colIdx] = value;
    updateDocumentPreview();
}

/**
 * 문서 행 추가
 */
function addDocumentRow() {
    const {selectedTableIndex, tablesData} = documentGeneratorState;
    const currentTableData = tablesData[selectedTableIndex];

    currentTableData.rows.push(
        currentTableData.tableConfig.columns.map(() => '')
    );

    renderDocumentTables();
}

/**
 * 문서 행 삭제
 */
function removeDocumentRow(rowIdx) {
    const {selectedTableIndex, tablesData} = documentGeneratorState;
    const currentTableData = tablesData[selectedTableIndex];

    if (currentTableData.rows.length <= 1) {
        showMessage('최소 1개의 행은 필요합니다.', 'error');
        return;
    }

    if (confirm(`${rowIdx + 1}번 행을 삭제하시겠습니까?`)) {
        currentTableData.rows.splice(rowIdx, 1);
        renderDocumentTables();
    }
}

/**
 * 문서 미리보기 업데이트
 */
function updateDocumentPreview() {
    const {template, tablesData, backgroundImage} = documentGeneratorState;
    if (!template) return;

    const canvas = document.getElementById('documentPreviewCanvas');
    const ctx = canvas.getContext('2d');

    const fixedTexts = JSON.parse(template.fixedTexts || '[]');

    // 배경색
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 배경 이미지
    if (backgroundImage) {
        ctx.drawImage(backgroundImage, 0, 0);
    }

    // 고정 텍스트
    fixedTexts.forEach(text => {
        ctx.fillStyle = '#000';
        ctx.font = `${text.fontWeight} ${text.fontSize}px Arial`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(text.text, text.x, text.y);
    });

    // 모든 표 그리기
    tablesData.forEach(({tableConfig, rows}) => {
        drawDocumentTable(ctx, tableConfig, rows);
    });
}

/**
 * 개별 표 그리기 (문서 생성 미리보기용)
 */
function drawDocumentTable(ctx, tableConfig, tableRows) {
    const {x, y, width, height, columns, rowHeight, orientation = 'horizontal'} = tableConfig;

    // 표 테두리
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    ctx.lineWidth = 1;
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (orientation === 'horizontal') {
        // 가로형: 헤더가 위에
        let currentX = x;
        ctx.font = 'bold 14px Arial';

        columns.forEach((col, idx) => {
            if (idx > 0) {
                ctx.beginPath();
                ctx.moveTo(currentX, y);
                ctx.lineTo(currentX, y + height);
                ctx.stroke();
            }

            ctx.fillText(col.name, currentX + col.width / 2, y + rowHeight / 2);
            currentX += col.width;
        });

        // 헤더 구분선
        ctx.beginPath();
        ctx.moveTo(x, y + rowHeight);
        ctx.lineTo(x + width, y + rowHeight);
        ctx.stroke();

        // 데이터 행
        ctx.font = '12px Arial';
        tableRows.forEach((row, rowIdx) => {
            const rowY = y + rowHeight + (rowIdx * rowHeight);

            // 행 구분선
            if (rowIdx > 0) {
                ctx.beginPath();
                ctx.moveTo(x, rowY);
                ctx.lineTo(x + width, rowY);
                ctx.stroke();
            }

            // 셀 데이터
            currentX = x;
            row.forEach((cellValue, colIdx) => {
                ctx.fillText(cellValue, currentX + columns[colIdx].width / 2, rowY + rowHeight / 2);
                currentX += columns[colIdx].width;
            });
        });

    } else {
        // 세로형: 헤더가 왼쪽에
        const headerWidth = columns[0].width;
        let currentY = y;

        ctx.font = 'bold 14px Arial';
        columns.forEach((col, idx) => {
            if (idx > 0) {
                ctx.beginPath();
                ctx.moveTo(x, currentY);
                ctx.lineTo(x + width, currentY);
                ctx.stroke();
            }

            ctx.fillText(col.name, x + headerWidth / 2, currentY + rowHeight / 2);
            currentY += rowHeight;
        });

        // 헤더와 데이터 구분선
        ctx.beginPath();
        ctx.moveTo(x + headerWidth, y);
        ctx.lineTo(x + headerWidth, y + height);
        ctx.stroke();

        // 데이터 열 (각 행이 실제로는 데이터 열이 됨)
        ctx.font = '12px Arial';
        tableRows.forEach((row, rowIdx) => {
            const colX = x + headerWidth + (rowIdx * ((width - headerWidth) / tableRows.length));

            // 열 구분선
            if (rowIdx > 0) {
                ctx.beginPath();
                ctx.moveTo(colX, y);
                ctx.lineTo(colX, y + height);
                ctx.stroke();
            }

            // 셀 데이터 (세로로 배치)
            currentY = y;
            row.forEach((cellValue) => {
                const cellWidth = (width - headerWidth) / tableRows.length;
                ctx.fillText(cellValue, colX + cellWidth / 2, currentY + rowHeight / 2);
                currentY += rowHeight;
            });
        });
    }
}

/**
 * 문서 생성 저장
 */
async function saveGeneratedDocument() {
    const documentName = document.getElementById('generatedDocumentName').value.trim();

    if (!documentName) {
        showMessage('문서 이름을 입력하세요.', 'error');
        return;
    }

    // 모든 표의 데이터를 수집
    const allTablesData = documentGeneratorState.tablesData.map(td => td.rows);

    const data = {
        templateId: documentGeneratorState.template.templateId,
        documentName,
        tableData: JSON.stringify(allTablesData),
        generatedBy: 'system'
    };

    try {
        const response = await fetch(DOCUMENT_API, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });

        if (response.ok) {
            showMessage('문서가 생성되었습니다!', 'success');
            closeDocumentGenerator();
            loadGeneratedDocuments(); // 목록 새로고침
        } else {
            throw new Error('저장 실패');
        }
    } catch (error) {
        showMessage('문서 생성 오류: ' + error.message, 'error');
    }
}

/**
 * 생성된 문서 목록 로드
 */
async function loadGeneratedDocuments() {
    const list = document.getElementById('generatedDocumentsList');

    try {
        const response = await fetch(DOCUMENT_API);
        if (!response.ok) throw new Error('목록 조회 실패');

        const documents = await response.json();

        if (documents.length === 0) {
            list.innerHTML = '<p style="color: #666;">생성된 문서가 없습니다.</p>';
        } else {
            list.innerHTML = documents.map(doc => `
                <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; background: white;">
                    <h4 style="margin: 0 0 10px 0;">${doc.documentName}</h4>
                    <p style="font-size: 12px; color: #666; margin: 5px 0;">
                        양식: ${doc.templateName || '-'}
                    </p>
                    <p style="font-size: 12px; color: #666; margin: 5px 0;">
                        생성일: ${new Date(doc.createdAt).toLocaleString()}
                    </p>
                    <button onclick="viewGeneratedDocument(${doc.documentId})" class="btn" style="width: 100%; margin-top: 10px;">보기</button>
                    <button onclick="deleteGeneratedDocument(${doc.documentId})" class="btn btn-gray" style="width: 100%; margin-top: 5px;">삭제</button>
                </div>
            `).join('');
        }
    } catch (error) {
        showMessage('목록 로드 오류: ' + error.message, 'error');
    }
}

/**
 * 생성된 문서 보기
 */
async function viewGeneratedDocument(documentId) {
    try {
        const response = await fetch(`${DOCUMENT_API}/${documentId}`);
        if (!response.ok) throw new Error('문서 조회 실패');

        const docData = await response.json();

        // 템플릿 정보 로드
        const templateResponse = await fetch(`${TEMPLATE_API}/${docData.templateId}`);
        if (!templateResponse.ok) throw new Error('템플릿 조회 실패');

        const template = await templateResponse.json();
        let tablesConfig = JSON.parse(template.tableConfig);

        // 단일 표인 경우 배열로 변환
        if (!Array.isArray(tablesConfig)) {
            tablesConfig = [tablesConfig];
        }

        const fixedTexts = JSON.parse(template.fixedTexts || '[]');
        let allTablesData = JSON.parse(docData.tableData);

        // 단일 표 데이터인 경우 배열로 변환
        if (!Array.isArray(allTablesData[0])) {
            allTablesData = [allTablesData];
        }

        // 캔버스에 렌더링
        const modal = document.getElementById('documentViewModal');
        const canvas = document.getElementById('documentViewCanvas');
        canvas.width = 794;
        canvas.height = 1123;

        const ctx = canvas.getContext('2d');

        // 배경색
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 배경 이미지
        if (template.backgroundImageId) {
            const imgResponse = await fetch('/livewalk/library');
            const images = await imgResponse.json();
            const bgImage = images.find(img => img.imageId === template.backgroundImageId);

            if (bgImage) {
                const img = new Image();
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = `/uploads/images/${bgImage.fileName}`;
                });
                ctx.drawImage(img, 0, 0);
            }
        }

        // 고정 텍스트
        fixedTexts.forEach(text => {
            ctx.fillStyle = '#000';
            ctx.font = `${text.fontWeight} ${text.fontSize}px Arial`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(text.text, text.x, text.y);
        });

        // 모든 표 그리기
        tablesConfig.forEach((tableConfig, idx) => {
            const tableData = allTablesData[idx] || [];
            drawViewDocumentTable(ctx, tableConfig, tableData);
        });

        modal.style.display = 'block';

    } catch (error) {
        showMessage('문서 보기 오류: ' + error.message, 'error');
    }
}

/**
 * 저장된 문서 표 그리기
 */
function drawViewDocumentTable(ctx, tableConfig, tableData) {
    const {x, y, width, height, columns, rowHeight, orientation = 'horizontal'} = tableConfig;

        // 표 테두리
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        ctx.lineWidth = 1;
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (orientation === 'horizontal') {
            // 가로형: 헤더가 위에
            let currentX = x;
            ctx.font = 'bold 14px Arial';

            columns.forEach((col, idx) => {
                if (idx > 0) {
                    ctx.beginPath();
                    ctx.moveTo(currentX, y);
                    ctx.lineTo(currentX, y + height);
                    ctx.stroke();
                }

                ctx.fillText(col.name, currentX + col.width / 2, y + rowHeight / 2);
                currentX += col.width;
            });

            // 헤더 구분선
            ctx.beginPath();
            ctx.moveTo(x, y + rowHeight);
            ctx.lineTo(x + width, y + rowHeight);
            ctx.stroke();

            // 데이터 행
            ctx.font = '12px Arial';
            tableData.forEach((row, rowIdx) => {
                const rowY = y + rowHeight + (rowIdx * rowHeight);

                // 행 구분선
                if (rowIdx > 0) {
                    ctx.beginPath();
                    ctx.moveTo(x, rowY);
                    ctx.lineTo(x + width, rowY);
                    ctx.stroke();
                }

                // 셀 데이터
                currentX = x;
                row.forEach((cellValue, colIdx) => {
                    ctx.fillText(cellValue, currentX + columns[colIdx].width / 2, rowY + rowHeight / 2);
                    currentX += columns[colIdx].width;
                });
            });

        } else {
            // 세로형: 헤더가 왼쪽에
            const headerWidth = columns[0].width;
            let currentY = y;

            ctx.font = 'bold 14px Arial';
            columns.forEach((col, idx) => {
                if (idx > 0) {
                    ctx.beginPath();
                    ctx.moveTo(x, currentY);
                    ctx.lineTo(x + width, currentY);
                    ctx.stroke();
                }

                ctx.fillText(col.name, x + headerWidth / 2, currentY + rowHeight / 2);
                currentY += rowHeight;
            });

            // 헤더와 데이터 구분선
            ctx.beginPath();
            ctx.moveTo(x + headerWidth, y);
            ctx.lineTo(x + headerWidth, y + height);
            ctx.stroke();

            // 데이터 열
            ctx.font = '12px Arial';
            tableData.forEach((row, rowIdx) => {
                const colX = x + headerWidth + (rowIdx * ((width - headerWidth) / tableData.length));

                // 열 구분선
                if (rowIdx > 0) {
                    ctx.beginPath();
                    ctx.moveTo(colX, y);
                    ctx.lineTo(colX, y + height);
                    ctx.stroke();
                }

                // 셀 데이터 (세로로 배치)
                currentY = y;
                row.forEach((cellValue) => {
                    const cellWidth = (width - headerWidth) / tableData.length;
                    ctx.fillText(cellValue, colX + cellWidth / 2, currentY + rowHeight / 2);
                    currentY += rowHeight;
                });
            });
        }
}

/**
 * 문서 보기 모달 닫기
 */
function closeDocumentView() {
    document.getElementById('documentViewModal').style.display = 'none';
}

/**
 * 문서 삭제
 */
async function deleteGeneratedDocument(documentId) {
    if (!confirm('이 문서를 삭제하시겠습니까?')) return;

    try {
        const response = await fetch(`${DOCUMENT_API}/${documentId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showMessage('문서가 삭제되었습니다.', 'success');
            loadGeneratedDocuments();
        } else {
            throw new Error('삭제 실패');
        }
    } catch (error) {
        showMessage('삭제 오류: ' + error.message, 'error');
    }
}
