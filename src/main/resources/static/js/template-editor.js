// ==================== 템플릿 에디터 ====================
// 이 파일은 main.js.backup에서 추출된 템플릿 에디터 관련 코드입니다.
// Canvas 기반 문서 편집 및 템플릿 필드 설정 기능을 포함합니다.

// NOTE: 에디터 관련 전역 변수들 (editorZoom, editorSnapEnabled, editorTableMode,
// editorEditMode, currentTemplateImage 등)은 document.js에서 선언됩니다.

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
        btn.textContent = editorSnapEnabled ? `스냅: ON (${editorSnapSize}px)` : '스냅: OFF';
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
            btn.textContent = '박스 모드: ON';
            btn.style.background = '#28a745';
        }
        if (tableBtn) {
            tableBtn.textContent = '표 모드: OFF';
            tableBtn.style.background = '#6c757d';
        }
        showMessage('드래그로 영역을 선택하면 박스 필드가 추가됩니다.', 'info');
    } else {
        canvas.style.cursor = 'crosshair';
        if (btn) {
            btn.textContent = '박스 모드: OFF';
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
            btn.textContent = `표 모드: ON (${editorTableColumns}칸)`;
            btn.style.background = '#17a2b8';
        }
        if (dragBtn) {
            dragBtn.textContent = '박스 모드: OFF';
            dragBtn.style.background = '#6c757d';
        }
        showMessage(`드래그로 ${editorTableColumns}칸 표를 추가합니다.`, 'info');
    } else {
        canvas.style.cursor = 'crosshair';
        if (btn) {
            btn.textContent = '표 모드: OFF';
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
            btn.textContent = '수정 모드: ON';
            btn.style.background = '#ffc107';
        }
        if (dragBtn) {
            dragBtn.textContent = '박스 모드: OFF';
            dragBtn.style.background = '#6c757d';
        }
        if (tableBtn) {
            tableBtn.textContent = '표 모드: OFF';
            tableBtn.style.background = '#6c757d';
        }
        showMessage('박스나 표를 클릭하여 선택하고 드래그하여 이동/크기 조절', 'info');
    } else {
        canvas.style.cursor = 'crosshair';
        if (btn) {
            btn.textContent = '수정 모드: OFF';
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

// ==================== Canvas 다시 그리기 ====================

// Canvas 다시 그리기 (A4 크기 고정)
function redrawCanvas() {
    const canvas = document.getElementById('documentCanvas');
    if (!canvas) return;

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

// 템플릿 선택 시 Canvas에 이미지 로드
async function loadTemplateToCanvas() {
    const templateSelect = document.getElementById('templateSelect');
    if (!templateSelect) return;

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
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.onload = function () {
        currentTemplateImage = img;

        // Canvas 크기를 A4로 고정 (210mm x 297mm @ 96 DPI)
        canvas.width = 794;  // A4 가로
        canvas.height = 1123; // A4 세로

        // 배경 흰색으로 채우기
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 이미지를 맨 위(0, 0)에 배치 (원본 크기 유지)
        ctx.drawImage(img, 0, 0);

        redrawCanvas();

        // 저장된 필드 설정 자동 불러오기
        const imageId = parseInt(selectedOption.value);
        loadFieldCoordinatesFromDB(imageId);
    };
    img.src = `/livewalk/library/image/${fileName}`;
}

// 필드 행 삭제
function removeCanvasField(button) {
    const tbody = document.getElementById('canvasFieldsTableBody');
    if (tbody.rows.length > 0) {
        button.closest('tr').remove();
        redrawCanvas();
    }
}

// 유틸리티 함수
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/'/g, '&#39;');
}

function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    if (!messageDiv) return;

    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';

    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 3000);
}
