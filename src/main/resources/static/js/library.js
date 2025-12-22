// ==================== 자료실 ====================
// NOTE: 이 파일은 main.js에서 분리된 자료실 관련 기능입니다.
// 필요한 전역 함수들 (showMessage, formatDateTime)은 utils.js에서 제공됩니다.
// LIBRARY_API 상수는 constants.js에서 선언됩니다.

// ==================== 전체 배치도 ====================
function openFullLayoutModal() {
    document.getElementById('fullLayoutModal').style.display = 'block';
    // 기본적으로 캐비넷 뷰 표시
    switchLayoutTab('cabinet');
}

function closeFullLayoutModal() {
    document.getElementById('fullLayoutModal').style.display = 'none';

    // CSV 데이터 초기화
    csvCabinetData = null;
    notFoundParts = [];

    // 상태 메시지 초기화
    const statusEl = document.getElementById('csvUploadStatus');
    if (statusEl) {
        statusEl.textContent = '';
    }

    // 찾지 못한 부품 목록 숨기기
    const notFoundContainer = document.getElementById('notFoundPartsContainer');
    if (notFoundContainer) {
        notFoundContainer.style.display = 'none';
    }

    // 파일 입력 초기화
    const csvInput = document.getElementById('cabinetCsvInput');
    if (csvInput) {
        csvInput.value = '';
    }
}

function switchLayoutTab(tab) {
    const cabinetView = document.getElementById('cabinetLayoutView');
    const mapView = document.getElementById('mapLayoutView');
    const cabinetBtn = document.getElementById('cabinetTabBtn');
    const mapBtn = document.getElementById('mapTabBtn');

    if (tab === 'cabinet') {
        cabinetView.style.display = 'block';
        mapView.style.display = 'none';
        cabinetBtn.style.background = '#007bff';
        cabinetBtn.style.color = 'white';
        mapBtn.style.background = '#f0f0f0';
        mapBtn.style.color = '#666';
        loadCabinetLayout();
    } else if (tab === 'map') {
        cabinetView.style.display = 'none';
        mapView.style.display = 'block';
        cabinetBtn.style.background = '#f0f0f0';
        cabinetBtn.style.color = '#666';
        mapBtn.style.background = '#007bff';
        mapBtn.style.color = 'white';
        loadMapLayout();
    }
}

// 캐비넷 위치 뷰 로드
async function loadCabinetLayout() {
    const container = document.getElementById('fullLayoutCabinetGrid');
    const rows = 32;  // 세로 (숫자)
    const cols = 27;  // 가로 (영어)

    try {
        // 등록된 캐비넷 위치 조회 (중복 허용 - 배열로 저장)
        const response = await fetch('/livewalk/part-locations/occupied-cabinets');
        if (!response.ok) throw new Error('캐비넷 정보 조회 실패');

        const occupiedList = await response.json();

        // 위치별로 그룹화 (배열로 저장)
        let occupiedMap = new Map();
        occupiedList.forEach(loc => {
            const key = `${loc.posX}-${loc.posY}`;
            if (!occupiedMap.has(key)) {
                occupiedMap.set(key, []);
            }
            occupiedMap.get(key).push(loc);
        });

        // 그리드 생성
        let html = '<table style="border-collapse: collapse; margin: 0 auto; table-layout: fixed;">';

        // 가로 레이블 생성 (A-Z, AA) - 27개
        const colLabels = [];
        for (let i = 0; i < cols; i++) {
            if (i < 26) {
                colLabels.push(String.fromCharCode(65 + i)); // A-Z
            } else {
                colLabels.push('A' + String.fromCharCode(65 + (i - 26))); // AA
            }
        }

        // 헤더 (가로 - 영어)
        html += '<tr><th style="border: 2px solid #999; padding: 8px; background: #f5f5f5; width: 50px; height: 35px; font-weight: bold;"></th>';
        for (let col = 0; col < cols; col++) {
            html += `<th style="border: 2px solid #999; padding: 8px; background: #f5f5f5; width: 80px; height: 35px; font-size: 11px; font-weight: bold;">${colLabels[col]}</th>`;
        }
        html += '</tr>';

        // 행 생성 (세로 - 숫자)
        for (let row = 1; row <= rows; row++) {
            html += `<tr>`;
            // 행 레이블 (세로 - 숫자)
            html += `<th style="border: 2px solid #999; padding: 8px; background: #f5f5f5; width: 50px; height: 40px; font-size: 11px; font-weight: bold;">${row}</th>`;

            // 셀 생성
            for (let col = 0; col < cols; col++) {
                const posX = colLabels[col];
                const posY = row;
                const locationCode = `${posX}-${posY}`;
                const occupiedArray = occupiedMap.get(locationCode);

                if (occupiedArray && occupiedArray.length > 0) {
                    // 부품번호별로 그룹화 (같은 부품번호는 하나로 통합)
                    const partNumberGroups = {};
                    occupiedArray.forEach(loc => {
                        const pn = loc.partNumber || '미지정';
                        if (!partNumberGroups[pn]) {
                            partNumberGroups[pn] = [];
                        }
                        partNumberGroups[pn].push(loc);
                    });

                    const uniquePartNumbers = Object.keys(partNumberGroups);
                    const uniqueCount = uniquePartNumbers.length;

                    let displayText;
                    if (uniqueCount === 1) {
                        // 같은 부품번호만 있음 - 부품번호 표시
                        displayText = uniquePartNumbers[0];
                    } else {
                        // 여러 부품번호 - 첫 번째 부품번호(개수) 형식으로 표시
                        const firstPartNumber = occupiedArray[0].partNumber || '미지정';
                        displayText = `${firstPartNumber}(${uniqueCount}개)`;
                    }

                    // 툴팁에 부품번호별 정보 표시
                    const tooltipParts = uniquePartNumbers.map(pn => {
                        const items = partNumberGroups[pn];
                        const latestItem = items[0]; // 제일 최신 것 (첫 번째)
                        return `${pn} (${latestItem.partName || ''}) x${items.length}`;
                    }).join('\\n');

                    html += `<td
                        style="border: 2px solid #f9a825; padding: 8px 4px; text-align: center; cursor: pointer; font-size: 10px; width: 80px; min-height: 40px; background: #fff9c4; color: #333; font-weight: bold; overflow-wrap: break-word; word-break: break-all; line-height: 1.3;"
                        onclick="showCabinetDetail('${posX}', ${posY})"
                        title="${tooltipParts}"
                    >${displayText}</td>`;
                } else {
                    // 비어있는 위치
                    html += `<td
                        style="border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 9px; width: 80px; min-height: 40px; background: white; color: #ccc;"
                        title="${locationCode}"
                    >-</td>`;
                }
            }

            html += '</tr>';
        }

        html += '</table>';
        container.innerHTML = html;

    } catch (error) {
        console.error('캐비넷 레이아웃 로드 오류:', error);
        container.innerHTML = `<p style="color: red; text-align: center;">캐비넷 정보를 불러오는 중 오류가 발생했습니다.</p>`;
    }
}

// 캐비넷 상세 정보 표시
async function showCabinetDetail(posX, posY) {
    try {
        const response = await fetch('/livewalk/part-locations/occupied-cabinets');
        if (!response.ok) throw new Error('캐비넷 정보 조회 실패');

        const occupiedList = await response.json();
        const filtered = occupiedList.filter(loc => loc.posX === posX && loc.posY === posY);

        if (filtered.length === 0) {
            showMessage(`${posX}-${posY} 위치에 부품이 없습니다.`, 'info');
            return;
        }

        // 부품번호별로 그룹화
        const partNumberGroups = {};
        filtered.forEach(loc => {
            const pn = loc.partNumber || '미지정';
            if (!partNumberGroups[pn]) {
                partNumberGroups[pn] = [];
            }
            partNumberGroups[pn].push(loc);
        });

        // 모달 제목 설정
        document.getElementById('cabinetDetailTitle').textContent = `📦 ${posX}-${posY} 위치 부품 정보`;

        // 부품번호별 정보 생성
        const uniquePartNumbers = Object.keys(partNumberGroups);
        let contentHtml = `
            <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                <div style="font-size: 16px; font-weight: bold; color: #1565c0; margin-bottom: 10px;">
                    📍 총 ${uniquePartNumbers.length}종류 (${filtered.length}건)
                </div>
            </div>
        `;

        // 각 부품번호별로 카드 형태로 표시
        uniquePartNumbers.forEach(pn => {
            const items = partNumberGroups[pn];
            const latestItem = items[0]; // 제일 최신 것

            contentHtml += `
                <div style="border: 1px solid #e0e0e0; border-radius: 5px; padding: 15px; margin-bottom: 15px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                        <div style="font-weight: bold; font-size: 15px; color: #333;">
                            ${pn}
                        </div>
                        <div style="background: #007bff; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                            ${items.length}건
                        </div>
                    </div>
                    <div style="color: #666; font-size: 14px; margin-bottom: 5px;">
                        📦 부품명: ${latestItem.partName || '미지정'}
                    </div>
                    <div style="color: #999; font-size: 12px;">
                        📅 최근 등록: ${latestItem.updatedAt || '정보 없음'}
                    </div>
                </div>
            `;
        });

        document.getElementById('cabinetDetailContent').innerHTML = contentHtml;

        // 모달 표시
        document.getElementById('cabinetDetailModal').style.display = 'block';

    } catch (error) {
        console.error('캐비넷 상세 정보 조회 오류:', error);
        showMessage('캐비넷 상세 정보를 불러오는 중 오류가 발생했습니다.', 'error');
    }
}

// 캐비넷 상세정보 모달 닫기
function closeCabinetDetailModal() {
    document.getElementById('cabinetDetailModal').style.display = 'none';
}

// ==================== CSV 업로드 및 PDF 출력 ====================
let csvCabinetData = null; // CSV에서 읽은 캐비넷 데이터 저장
let notFoundParts = []; // 찾지 못한 부품번호 목록

// CSV 양식 다운로드
function downloadCsvTemplate() {
    const csvContent = '부품번호\n여기서부터 밑으로 쭉 적어주세요\n\n\n\n\n\n\n\n';
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '캐비넷_배치도_양식.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showMessage('CSV 양식이 다운로드되었습니다.', 'success');
}

// CSV 파일 업로드 처리 (부품번호만 입력)
async function handleCabinetCsvUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const statusEl = document.getElementById('csvUploadStatus');
    statusEl.textContent = '파일 읽는 중...';

    try {
        const text = await file.text();
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);

        // CSV 형식: 부품번호만 (예: 2024-E-0001)
        const partNumbers = [];
        for (let i = 1; i < lines.length; i++) { // 0번은 헤더로 가정
            const partNumber = lines[i].trim();
            if (partNumber) {
                partNumbers.push(partNumber);
            }
        }

        if (partNumbers.length === 0) {
            statusEl.textContent = '❌ 유효한 부품번호가 없습니다';
            statusEl.style.color = '#dc3545';
            showMessage('CSV 파일에 부품번호가 없습니다.', 'error');
            return;
        }

        statusEl.textContent = '위치 정보 조회 중...';

        // 서버에서 위치 정보 조회
        const response = await fetch('/livewalk/part-locations/occupied-cabinets');
        if (!response.ok) throw new Error('위치 정보 조회 실패');

        const allLocations = await response.json();

        // 부품번호로 필터링하여 csvCabinetData 생성
        csvCabinetData = {};
        let foundCount = 0;
        const foundPartNumbers = new Set();
        const notFoundPartNumbers = [];

        partNumbers.forEach(partNumber => {
            const locations = allLocations.filter(loc => loc.partNumber === partNumber);
            if (locations.length > 0) {
                foundPartNumbers.add(partNumber);
                locations.forEach(loc => {
                    if (loc.posX && loc.posY) {
                        const key = `${loc.posX}-${loc.posY}`;
                        if (!csvCabinetData[key]) {
                            csvCabinetData[key] = [];
                        }
                        csvCabinetData[key].push(partNumber);
                        foundCount++;
                    }
                });
            } else {
                notFoundPartNumbers.push(partNumber);
            }
        });

        if (foundCount === 0) {
            statusEl.textContent = '❌ 캐비넷 위치에 등록된 부품이 없습니다';
            statusEl.style.color = '#dc3545';

            let message = '입력한 부품번호가 캐비넷 위치에 등록되어 있지 않습니다.';
            if (notFoundPartNumbers.length > 0) {
                message += '\n\n찾지 못한 부품:\n' + notFoundPartNumbers.join('\n');
            }
            showMessage(message, 'warning');
            return;
        }

        // 상태 메시지 생성
        let statusMessage = `✅ ${foundPartNumbers.size}개 부품번호, ${foundCount}개 위치 데이터 로드됨`;
        if (notFoundPartNumbers.length > 0) {
            statusMessage += ` (${notFoundPartNumbers.length}개 미등록)`;
        }
        statusEl.textContent = statusMessage;
        statusEl.style.color = '#28a745';

        // 찾지 못한 부품 목록 저장 및 표시
        notFoundParts = notFoundPartNumbers;
        const notFoundContainer = document.getElementById('notFoundPartsContainer');
        const notFoundList = document.getElementById('notFoundPartsList');

        if (notFoundPartNumbers.length > 0) {
            notFoundContainer.style.display = 'block';
            notFoundList.innerHTML = notFoundPartNumbers.map(pn => `<span style="display: inline-block; margin: 2px 5px 2px 0; padding: 2px 8px; background: white; border: 1px solid #ffc107; border-radius: 3px;">${pn}</span>`).join('');
        } else {
            notFoundContainer.style.display = 'none';
        }

        // 데이터 로드 후 그리드 다시 그리기
        loadCabinetLayoutFromCSV();

    } catch (error) {
        console.error('CSV 파일 처리 오류:', error);
        statusEl.textContent = '❌ CSV 파일 처리 실패';
        statusEl.style.color = '#dc3545';
        showMessage('CSV 파일을 읽는 중 오류가 발생했습니다: ' + error.message, 'error');
    }
}

// CSV 데이터로 캐비넷 그리드 생성
function loadCabinetLayoutFromCSV() {
    if (!csvCabinetData) {
        showMessage('CSV 파일을 먼저 업로드해주세요.', 'info');
        return;
    }

    const container = document.getElementById('fullLayoutCabinetGrid');
    const rows = 32;
    const cols = 27;

    // 그리드 생성
    let html = '<table style="border-collapse: collapse; margin: 0 auto; table-layout: fixed;">';

    // 가로 레이블 생성 (A-Z, AA) - 27개
    const colLabels = [];
    for (let i = 0; i < cols; i++) {
        if (i < 26) {
            colLabels.push(String.fromCharCode(65 + i)); // A-Z
        } else {
            colLabels.push('A' + String.fromCharCode(65 + (i - 26))); // AA
        }
    }

    // 헤더 (가로 - 영어)
    html += '<tr><th style="border: 2px solid #999; padding: 8px; background: #f5f5f5; width: 50px; height: 35px; font-weight: bold;"></th>';
    for (let col = 0; col < cols; col++) {
        html += `<th style="border: 2px solid #999; padding: 8px; background: #f5f5f5; width: 80px; height: 35px; font-size: 11px; font-weight: bold;">${colLabels[col]}</th>`;
    }
    html += '</tr>';

    // 행 생성 (세로 - 숫자)
    for (let row = 1; row <= rows; row++) {
        html += `<tr>`;
        html += `<th style="border: 2px solid #999; padding: 8px; background: #f5f5f5; width: 50px; height: 40px; font-size: 11px; font-weight: bold;">${row}</th>`;

        for (let col = 0; col < cols; col++) {
            const posX = colLabels[col];
            const posY = row;
            const locationCode = `${posX}-${posY}`;
            const parts = csvCabinetData[locationCode];

            if (parts && parts.length > 0) {
                // CSV에서 입력한 부품이 있는 칸 - 연한 노란 배경에 검정 글자
                const uniqueParts = [...new Set(parts)];
                const displayText = uniqueParts.join('<br>');

                html += `<td
                    style="border: 2px solid #f9a825; padding: 8px 4px; text-align: center; font-size: 9px; line-height: 1.3; width: 80px; min-height: 40px; background: #fff9c4; color: #333; font-weight: bold; overflow-wrap: break-word; word-break: break-all;"
                    title="${uniqueParts.join(', ')}"
                >${displayText}</td>`;
            } else {
                html += `<td
                    style="border: 1px solid #ddd; padding: 8px; text-align: center; font-size: 9px; width: 80px; height: 40px; background: white; color: #ccc;"
                    title="${locationCode}"
                ></td>`;
            }
        }

        html += '</tr>';
    }

    html += '</table>';
    container.innerHTML = html;
}

// PDF 출력 (캔버스로 렌더링 후 이미지로 변환)
async function exportCabinetToPDF() {
    if (!csvCabinetData) {
        showMessage('CSV 파일을 먼저 업로드해주세요.', 'info');
        return;
    }

    try {
        const canvas = document.getElementById('cabinetCanvas');
        const ctx = canvas.getContext('2d');

        const rows = 32;
        const cols = 27;
        const cellWidth = 45;  // 가로 폭 최대화 (A4 꽉 채우기)
        const cellHeight = 28;  // 세로 높이 증가
        const headerSize = 50;
        const scale = 3;  // 고해상도를 위한 스케일

        // 캔버스 크기 설정 (고해상도)
        canvas.width = (cols + 1) * cellWidth * scale;
        canvas.height = ((rows + 1) * cellHeight + headerSize) * scale;

        // 스케일 적용
        ctx.scale(scale, scale);

        // 배경 흰색
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, (cols + 1) * cellWidth, (rows + 1) * cellHeight + headerSize);

        // 제목
        ctx.fillStyle = 'black';
        ctx.font = 'bold 20px Arial, "Malgun Gothic", "맑은 고딕"';
        ctx.textAlign = 'center';
        ctx.fillText('캐비넷 배치도', ((cols + 1) * cellWidth) / 2, 28);

        // 가로 레이블 생성
        const colLabels = [];
        for (let i = 0; i < cols; i++) {
            if (i < 26) {
                colLabels.push(String.fromCharCode(65 + i));
            } else {
                colLabels.push('A' + String.fromCharCode(65 + (i - 26)));
            }
        }

        ctx.font = 'bold 12px Arial, "Malgun Gothic", "맑은 고딕"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 헤더 그리기 (가로 - 영어)
        for (let col = 0; col < cols; col++) {
            const x = (col + 1) * cellWidth;
            const y = headerSize;

            ctx.fillStyle = '#f5f5f5';
            ctx.fillRect(x, y, cellWidth, cellHeight);
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, cellWidth, cellHeight);

            ctx.fillStyle = 'black';
            ctx.fillText(colLabels[col], x + cellWidth / 2, y + cellHeight / 2);
        }

        // 행 그리기
        ctx.font = '10px Arial, "Malgun Gothic", "맑은 고딕"';
        for (let row = 1; row <= rows; row++) {
            const y = headerSize + row * cellHeight;

            // 행 레이블 (세로 - 숫자)
            ctx.fillStyle = '#f5f5f5';
            ctx.fillRect(0, y, cellWidth, cellHeight);
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, y, cellWidth, cellHeight);

            ctx.fillStyle = 'black';
            ctx.font = 'bold 12px Arial';
            ctx.fillText(String(row), cellWidth / 2, y + cellHeight / 2);

            // 셀 그리기
            for (let col = 0; col < cols; col++) {
                const x = (col + 1) * cellWidth;
                const posX = colLabels[col];
                const posY = row;
                const locationCode = `${posX}-${posY}`;
                const parts = csvCabinetData[locationCode];

                if (parts && parts.length > 0) {
                    // CSV에서 입력한 부품이 있는 셀 - 연한 노란 배경에 검정 글자
                    ctx.fillStyle = '#fff9c4';
                    ctx.fillRect(x, y, cellWidth, cellHeight);
                    ctx.strokeStyle = '#f9a825';
                    ctx.lineWidth = 2.5;
                    ctx.strokeRect(x, y, cellWidth, cellHeight);

                    // 부품번호 리스트 표시 (여러 줄)
                    const uniqueParts = [...new Set(parts)];
                    ctx.fillStyle = '#333';
                    ctx.font = 'bold 9px Arial, "Malgun Gothic", "맑은 고딕"';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    // 줄 간격 계산
                    const lineHeight = 10;
                    const totalHeight = uniqueParts.length * lineHeight;
                    const startY = y + (cellHeight - totalHeight) / 2 + lineHeight / 2;

                    uniqueParts.forEach((part, index) => {
                        ctx.fillText(part, x + cellWidth / 2, startY + index * lineHeight);
                    });
                } else {
                    // 빈 셀
                    ctx.fillStyle = 'white';
                    ctx.fillRect(x, y, cellWidth, cellHeight);
                    ctx.strokeStyle = '#999';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x, y, cellWidth, cellHeight);
                }
            }
        }

        // 찾지 못한 부품 목록 추가 (PDF 하단)
        if (notFoundParts.length > 0) {
            const footerY = headerSize + (rows + 1) * cellHeight + 15;

            ctx.fillStyle = '#856404';
            ctx.font = 'bold 11px Arial, "Malgun Gothic", "맑은 고딕"';
            ctx.textAlign = 'left';
            ctx.fillText('⚠️ 찾지 못한 부품:', 10, footerY);

            ctx.font = '9px Arial, "Malgun Gothic", "맑은 고딕"';
            const partsText = notFoundParts.join(', ');
            const maxWidth = (cols + 1) * cellWidth - 20;

            // 텍스트가 너무 길면 여러 줄로 나누기
            const words = partsText.split(', ');
            let currentLine = '';
            let lineY = footerY + 15;

            words.forEach((word, index) => {
                const testLine = currentLine + (currentLine ? ', ' : '') + word;
                const metrics = ctx.measureText(testLine);

                if (metrics.width > maxWidth && currentLine) {
                    ctx.fillText(currentLine, 10, lineY);
                    currentLine = word;
                    lineY += 12;
                } else {
                    currentLine = testLine;
                }
            });

            if (currentLine) {
                ctx.fillText(currentLine, 10, lineY);
            }
        }

        // 캔버스를 이미지로 변환하여 PDF에 추가 (가로 방향, 한 페이지, 공백 없음)
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const imgData = canvas.toDataURL('image/png');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // 여백 없이 전체 페이지 사용
        const margin = 2;
        const imgWidth = pageWidth - (margin * 2);
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // 이미지가 페이지 높이를 초과하면 높이 기준으로 맞춤
        if (imgHeight > pageHeight - (margin * 2)) {
            const adjustedHeight = pageHeight - (margin * 2);
            const adjustedWidth = (canvas.width * adjustedHeight) / canvas.height;
            doc.addImage(imgData, 'PNG', (pageWidth - adjustedWidth) / 2, margin, adjustedWidth, adjustedHeight);
        } else {
            doc.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
        }

        doc.save('캐비넷_배치도.pdf');
        showMessage('PDF 파일이 다운로드되었습니다.', 'success');

    } catch (error) {
        console.error('PDF 생성 오류:', error);
        showMessage('PDF 생성 중 오류가 발생했습니다.', 'error');
    }
}

// 이미지 출력 (PNG)
async function exportCabinetToImage() {
    if (!csvCabinetData) {
        showMessage('CSV 파일을 먼저 업로드해주세요.', 'info');
        return;
    }

    try {
        const canvas = document.getElementById('cabinetCanvas');
        const ctx = canvas.getContext('2d');

        const rows = 32;
        const cols = 27;
        const cellWidth = 45;
        const cellHeight = 28;
        const headerSize = 50;
        const scale = 3;  // 고해상도를 위한 스케일

        // 캔버스 크기 설정 (고해상도)
        canvas.width = (cols + 1) * cellWidth * scale;
        canvas.height = ((rows + 1) * cellHeight + headerSize) * scale;

        // 스케일 적용
        ctx.scale(scale, scale);

        // 배경 흰색
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, (cols + 1) * cellWidth, (rows + 1) * cellHeight + headerSize);

        // 제목
        ctx.fillStyle = 'black';
        ctx.font = 'bold 20px Arial, "Malgun Gothic", "맑은 고딕"';
        ctx.textAlign = 'center';
        ctx.fillText('캐비넷 배치도', ((cols + 1) * cellWidth) / 2, 28);

        // 가로 레이블 생성
        const colLabels = [];
        for (let i = 0; i < cols; i++) {
            if (i < 26) {
                colLabels.push(String.fromCharCode(65 + i));
            } else {
                colLabels.push('A' + String.fromCharCode(65 + (i - 26)));
            }
        }

        // 헤더 (가로 - 영어)
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, headerSize, (cols + 1) * cellWidth, cellHeight);

        ctx.fillStyle = 'black';
        ctx.font = 'bold 11px Arial, "Malgun Gothic", "맑은 고딕"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let col = 0; col < cols; col++) {
            const x = (col + 1) * cellWidth;
            const y = headerSize;
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, cellWidth, cellHeight);
            ctx.fillText(colLabels[col], x + cellWidth / 2, y + cellHeight / 2);
        }

        // 좌측 헤더 (세로 - 숫자)
        for (let row = 1; row <= rows; row++) {
            const x = 0;
            const y = headerSize + row * cellHeight;

            ctx.fillStyle = '#f5f5f5';
            ctx.fillRect(x, y, cellWidth, cellHeight);

            ctx.strokeStyle = '#666';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, cellWidth, cellHeight);

            ctx.fillStyle = 'black';
            ctx.fillText(row.toString(), x + cellWidth / 2, y + cellHeight / 2);
        }

        // 데이터 셀
        for (let row = 1; row <= rows; row++) {
            for (let col = 0; col < cols; col++) {
                const posX = colLabels[col];
                const posY = row;
                const locationCode = `${posX}-${posY}`;
                const parts = csvCabinetData[locationCode];

                const x = (col + 1) * cellWidth;
                const y = headerSize + row * cellHeight;

                if (parts && parts.length > 0) {
                    const uniqueParts = [...new Set(parts)];

                    ctx.fillStyle = '#fff9c4';
                    ctx.fillRect(x, y, cellWidth, cellHeight);
                    ctx.strokeStyle = '#f9a825';
                    ctx.lineWidth = 2.5;
                    ctx.strokeRect(x, y, cellWidth, cellHeight);

                    // 부품번호 리스트 표시 (여러 줄)
                    ctx.fillStyle = '#333';
                    ctx.font = 'bold 9px Arial, "Malgun Gothic", "맑은 고딕"';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    // 줄 간격 계산
                    const lineHeight = 10;
                    const totalHeight = uniqueParts.length * lineHeight;
                    const startY = y + (cellHeight - totalHeight) / 2 + lineHeight / 2;

                    uniqueParts.forEach((part, index) => {
                        ctx.fillText(part, x + cellWidth / 2, startY + index * lineHeight);
                    });
                } else {
                    ctx.fillStyle = 'white';
                    ctx.fillRect(x, y, cellWidth, cellHeight);
                    ctx.strokeStyle = '#999';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(x, y, cellWidth, cellHeight);
                }
            }
        }

        // 캔버스를 이미지로 변환하여 다운로드
        const imgData = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = imgData;
        link.download = '캐비넷_배치도.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showMessage('이미지 파일이 다운로드되었습니다.', 'success');

    } catch (error) {
        console.error('이미지 생성 오류:', error);
        showMessage('이미지 생성 중 오류가 발생했습니다.', 'error');
    }
}

// 도면 위치 뷰 로드
let currentMapImages = []; // 현재 로드된 도면 이미지 목록
let currentMapSpots = {}; // 도면별 좌표 정보 (imageId -> spots[])
let currentMapLocations = []; // 도면 위치 정보

async function loadMapLayout() {
    const container = document.getElementById('mapListContainer');

    try {
        // 도면 이미지 조회 (general_images)
        const imagesResponse = await fetch('/livewalk/library');
        if (!imagesResponse.ok) throw new Error('도면 이미지 조회 실패');
        currentMapImages = await imagesResponse.json();

        // 도면 위치 정보 조회
        const locationsResponse = await fetch('/livewalk/part-locations');
        if (!locationsResponse.ok) throw new Error('위치 정보 조회 실패');
        const allLocations = await locationsResponse.json();

        // 도면 위치만 필터링 (locationCode가 있고 posX, posY가 없는 것)
        currentMapLocations = allLocations.filter(loc => loc.locationCode && !loc.posX && !loc.posY);

        let html = '<div style="display: flex; flex-direction: column; gap: 20px;">';

        if (currentMapImages.length === 0) {
            html += '<p style="text-align: center; color: #666;">등록된 도면 이미지가 없습니다.</p>';
        } else {
            // 각 도면 이미지별로 표시
            for (const image of currentMapImages) {
                // 도면에 등록된 좌표 조회
                const spotsResponse = await fetch(`/livewalk/map-spot/image/${image.imageId}`);
                let spots = [];
                if (spotsResponse.ok) {
                    spots = await spotsResponse.json();
                    currentMapSpots[image.imageId] = spots;
                }

                html += `
                    <div style="border: 1px solid #ddd; border-radius: 8px; padding: 20px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <h3 style="margin-top: 0; color: #007bff; margin-bottom: 15px; font-size: 20px; font-weight: bold;">
                            🗺️ ${image.title || '제목 없음'}
                        </h3>
                        <div style="position: relative; display: inline-block; border: 2px solid #e0e0e0; border-radius: 5px; overflow: hidden;">
                            <canvas id="mapCanvas_${image.imageId}"
                                style="display: block; max-width: 100%; height: auto; cursor: pointer;">
                            </canvas>
                        </div>
                    </div>
                `;
            }
        }

        html += '</div>';
        container.innerHTML = html;

        // 각 도면 이미지 렌더링
        for (const image of currentMapImages) {
            await renderMapLayoutImage(image);
        }

    } catch (error) {
        console.error('도면 레이아웃 로드 오류:', error);
        container.innerHTML = `<p style="color: red; text-align: center;">도면 정보를 불러오는 중 오류가 발생했습니다.</p>`;
    }
}

// 도면 이미지 렌더링
async function renderMapLayoutImage(image) {
    const canvas = document.getElementById(`mapCanvas_${image.imageId}`);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    try {
        if (image.fileType && image.fileType.toLowerCase() === 'pdf') {
            await renderMapLayoutPdf(image.fileName, canvas, image.imageId);
        } else {
            await renderMapLayoutImageFile(image.fileName, canvas, image.imageId);
        }

        // 클릭 이벤트 추가
        canvas.onclick = (e) => handleMapLayoutClick(e, canvas, image.imageId);
    } catch (error) {
        console.error('도면 렌더링 오류:', error);
        ctx.fillStyle = 'red';
        ctx.font = '14px Arial';
        ctx.fillText('이미지를 불러올 수 없습니다.', 20, 30);
    }
}

// 이미지 파일 렌더링
function renderMapLayoutImageFile(fileName, canvas, imageId) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            // 최대 너비 1000px로 제한
            const maxWidth = 1000;
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = (maxWidth / width) * height;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // 마커 그리기
            drawMapLayoutMarkers(canvas, imageId);
            resolve();
        };
        img.onerror = reject;
        img.src = `/uploads/images/${fileName}`;
    });
}

// PDF 렌더링
async function renderMapLayoutPdf(fileName, canvas, imageId) {
    try {
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        if (!pdfjsLib) {
            throw new Error('PDF.js 라이브러리가 로드되지 않았습니다.');
        }

        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        const pdfUrl = `/uploads/images/${fileName}`;
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        const maxWidth = 1000;
        const viewport = page.getViewport({ scale: 1.0 });
        const scale = maxWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;

        const renderContext = {
            canvasContext: canvas.getContext('2d'),
            viewport: scaledViewport
        };
        await page.render(renderContext).promise;

        // 마커 그리기
        drawMapLayoutMarkers(canvas, imageId);
    } catch (error) {
        console.error('PDF 렌더링 실패:', error);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'red';
        ctx.font = '14px Arial';
        ctx.fillText('PDF를 불러올 수 없습니다.', 20, 30);
    }
}

// 마커 그리기
function drawMapLayoutMarkers(canvas, imageId) {
    const spots = currentMapSpots[imageId] || [];
    const ctx = canvas.getContext('2d');

    // 이미지 제목에서 층 정보 추출
    const currentImage = currentMapImages.find(img => img.imageId === imageId);
    let floorNumber = null;
    if (currentImage && currentImage.title) {
        const match = currentImage.title.match(/(\d+)층/);
        if (match) {
            floorNumber = match[1]; // "8층" -> "8"
        }
    }

    spots.forEach(spot => {
        const radius = spot.radius || 12;

        // 마커 원 그리기 (흰색 배경에 빨간 테두리)
        ctx.beginPath();
        ctx.arc(spot.posX, spot.posY, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3;
        ctx.stroke();

        // 구역명과 수량 표시
        if (spot.spotName) {
            // 해당 구역의 부품 수량 계산
            // locationCode 형식: "8-F", "8-A" 등 (층-구역)
            // spot.spotName은 "F", "A" 등의 구역명
            const partsInSpot = currentMapLocations.filter(loc => {
                if (!loc.locationCode) return false;

                // locationCode를 '-'로 분리 (예: "8-F" -> ["8", "F"])
                const parts = loc.locationCode.split('-');
                if (parts.length < 2) return false;

                const floor = parts[0]; // 층 번호
                const zoneName = parts[1]; // 구역명

                // 층과 구역 모두 일치해야 함
                const floorMatch = !floorNumber || floor === floorNumber;
                const zoneMatch = zoneName === spot.spotName;

                return floorMatch && zoneMatch;
            });

            // 고유한 부품번호만 카운트 (중복 제거)
            const uniquePartNumbers = new Set();
            partsInSpot.forEach(part => {
                if (part.partNumber) {
                    uniquePartNumbers.add(part.partNumber);
                }
            });
            const count = uniquePartNumbers.size;

            // 표시 텍스트: 구역명 (고유 부품 종류 수)
            const displayText = count > 0 ? `${spot.spotName} (${count})` : spot.spotName;

            ctx.fillStyle = 'black';
            ctx.font = 'bold 12px Arial, "Malgun Gothic", "맑은 고딕"';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(displayText, spot.posX, spot.posY);
        }
    });
}

// 마커 클릭 처리
function handleMapLayoutClick(event, canvas, imageId) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    const spots = currentMapSpots[imageId] || [];

    // 클릭한 위치에 가장 가까운 마커 찾기
    let closestSpot = null;
    let minDistance = Infinity;

    spots.forEach(spot => {
        const distance = Math.sqrt(Math.pow(spot.posX - x, 2) + Math.pow(spot.posY - y, 2));
        const radius = spot.radius || 12;

        if (distance <= radius && distance < minDistance) {
            minDistance = distance;
            closestSpot = spot;
        }
    });

    if (closestSpot) {
        // 이미지 제목에서 층 정보 추출
        const currentImage = currentMapImages.find(img => img.imageId === imageId);
        let floorNumber = null;
        if (currentImage && currentImage.title) {
            const match = currentImage.title.match(/(\d+)층/);
            if (match) {
                floorNumber = match[1];
            }
        }
        showMapSpotDetail(closestSpot, floorNumber);
    }
}

// 마커 상세 정보 표시
function showMapSpotDetail(spot, floorNumber) {
    // 해당 좌표(spotName)에 등록된 부품 찾기
    // locationCode 형식: "8-F", "8-A" 등 (층-구역)
    // spot.spotName은 "F", "A" 등의 구역명
    const parts = currentMapLocations.filter(loc => {
        if (!loc.locationCode) return false;

        // locationCode를 '-'로 분리 (예: "8-F" -> ["8", "F"])
        const parts = loc.locationCode.split('-');
        if (parts.length < 2) return false;

        const floor = parts[0]; // 층 번호
        const zoneName = parts[1]; // 구역명

        // 층과 구역 모두 일치해야 함
        const floorMatch = !floorNumber || floor === floorNumber;
        const zoneMatch = zoneName === spot.spotName;

        return floorMatch && zoneMatch;
    });

    // 부품번호별로 그룹화 (같은 부품번호는 하나로 통합, 수량 계산)
    const partNumberGroups = {};
    parts.forEach(part => {
        const pn = part.partNumber || '미지정';
        if (!partNumberGroups[pn]) {
            partNumberGroups[pn] = {
                partNumber: part.partNumber,
                partName: part.partName,
                locationCode: part.locationCode,
                note: part.note,
                count: 0
            };
        }
        partNumberGroups[pn].count++;
    });

    const uniqueParts = Object.values(partNumberGroups);
    const totalCount = parts.length;

    // 모달 제목 설정 (층 정보 포함)
    const titlePrefix = floorNumber ? `${floorNumber}층 ` : '';
    document.getElementById('cabinetDetailTitle').textContent = `🗺️ ${titlePrefix}${spot.spotName} 구역 부품 정보`;

    let contentHtml = `
        <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <div style="font-size: 16px; font-weight: bold; color: #1565c0; margin-bottom: 10px;">
                📍 ${spot.description || spot.spotName}
            </div>
            <div style="font-size: 14px; color: #666;">
                등록된 부품: ${uniqueParts.length}종 (총 ${totalCount}건)
            </div>
        </div>
    `;

    if (uniqueParts.length === 0) {
        contentHtml += `
            <div style="text-align: center; padding: 30px; color: #999;">
                이 구역에 등록된 부품이 없습니다.
            </div>
        `;
    } else {
        uniqueParts.forEach(part => {
            contentHtml += `
                <div style="border: 1px solid #e0e0e0; border-radius: 5px; padding: 15px; margin-bottom: 15px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                        <div style="font-weight: bold; font-size: 15px; color: #333;">
                            ${part.partNumber || '미지정'}
                        </div>
                        <div style="background: #007bff; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                            ${part.count}건
                        </div>
                    </div>
                    <div style="color: #666; font-size: 14px; margin-bottom: 5px;">
                        📦 부품명: ${part.partName || '미지정'}
                    </div>
                    <div style="color: #999; font-size: 12px; margin-bottom: 5px;">
                        📍 위치: ${part.locationCode || '미지정'}
                    </div>
                    ${part.note ? `<div style="color: #999; font-size: 12px;">💬 비고: ${part.note}</div>` : ''}
                </div>
            `;
        });
    }

    document.getElementById('cabinetDetailContent').innerHTML = contentHtml;
    document.getElementById('cabinetDetailModal').style.display = 'block';
}

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

async function displayLibraryImages(images) {
    const container = document.getElementById('libraryListContainer');

    if (!images || images.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999;">등록된 자료가 없습니다.</p>';
        return;
    }

    // 현재 사용자 정보 조회
    let currentUser = null;
    try {
        const userResponse = await fetch('/livewalk/auth/current-user');
        if (userResponse.ok) {
            currentUser = await userResponse.json();
        }
    } catch (error) {
        console.error('사용자 정보 조회 실패:', error);
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

        // 삭제 권한 체크: 본인 또는 관리자만 삭제 가능
        const canDelete = currentUser && (
            currentUser.userId === img.uploadedBy ||
            currentUser.userRole === 'ADMIN'
        );

        const deleteButtonHtml = canDelete
            ? `<button onclick="deleteLibraryImage(${img.imageId}, '${img.title}')" class="btn" style="flex: 1; padding: 5px; font-size: 12px; background-color: #dc3545; color: white; border-color: #dc3545;">🗑 삭제</button>`
            : ``;

        return `
                    <div style="border: 1px solid #ddd; border-radius: 5px; padding: 10px; background: #f9f9f9;">
                        ${previewHtml}
                        <h4 style="margin: 10px 0 5px 0; font-size: 14px;">${img.title} ${isPdf ? '[PDF]' : ''}</h4>
                        <p style="margin: 0 0 10px 0; font-size: 12px; color: #666;">${img.description || ''}</p>
                        <div style="font-size: 11px; color: #999; margin-bottom: 10px;">
                            업로드: ${formatDateTime(img.uploadedAt)}${img.uploaderName ? '<br>업로더: ' + img.uploaderName : ''}
                        </div>
                        <div style="display: flex; gap: 5px;">
                            <button onclick="downloadLibraryFile('${img.fileName}', '${img.originalName || img.title}')" class="btn" style="${canDelete ? 'flex: 1;' : 'width: 100%;'} padding: 5px; font-size: 12px;">📥 다운로드</button>
                            ${deleteButtonHtml}
                        </div>
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

// 자료실 파일 다운로드
function downloadLibraryFile(fileName, originalName) {
    try {
        const link = document.createElement('a');
        link.href = `/uploads/images/${fileName}`;
        link.download = originalName || fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showMessage('다운로드를 시작합니다.', 'success');
    } catch (error) {
        showMessage('다운로드 실패: ' + error.message, 'error');
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
