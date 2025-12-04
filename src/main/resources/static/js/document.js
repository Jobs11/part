// ==================== 이미지/문서 관련 전역 변수 ====================
// currentIncomingIdForImage, currentIncomingIdForDocument는 incoming.js에서 선언됨

// ==================== 이미지 모달 함수들 ====================

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

// ==================== 문서 모달 함수들 ====================

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

// ==================== 문서 생성 모달 함수들 ====================

// 전역 변수로 현재 PDF 정보 저장
let currentTemplatePdf = null;
let currentTemplateFileType = null;
let currentTemplateFileName = null;
let currentTemplateImage = null;

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

    // Canvas 초기화 (A4 크기)
    const canvas = document.getElementById('documentCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 794;  // A4 가로
    canvas.height = 1123; // A4 세로
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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

// ==================== 문서 작업 관련 함수들 ====================

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

// ==================== PDF 관련 함수들 ====================

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

// ==================== Canvas 관련 함수들 ====================

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

// ==================== 일괄등록 관련 함수들 ====================

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
        <td><input type="text" class="bulk-input bulk-description" placeholder="설명"></td>
        <td><input type="number" class="bulk-input bulk-quantity" placeholder="수량" min="1"></td>
        <td><input type="text" class="bulk-input bulk-unit" value="EA"></td>
        <td>
            <select class="bulk-input bulk-payment-method">
                <option value="">선택</option>
            </select>
        </td>
        <td><input type="number" class="bulk-input bulk-price" placeholder="금액" min="0" step="0.01"></td>
        <td><input type="date" class="bulk-input bulk-date"></td>
        <td><input type="text" class="bulk-input bulk-purchaser" placeholder="구매업체"></td>
        <td><input type="text" class="bulk-input bulk-supplier" placeholder="공급업체"></td>
        <td>
            <select class="bulk-input bulk-project-name">
                <option value="">선택</option>
            </select>
        </td>
        <td style="padding: 2px;">
            <div style="display: flex; gap: 3px; align-items: center;">
                <input type="text" class="bulk-input bulk-cabinet-location" placeholder="예: A-1" maxlength="10" style="flex: 1; min-width: 50px;">
                <button type="button" onclick="openCabinetPicker(this)" class="btn-small" style="padding: 3px 8px; font-size: 11px; white-space: nowrap;">캐비넷</button>
            </div>
        </td>
        <td style="padding: 2px;">
            <div style="display: flex; gap: 3px; align-items: center;">
                <input type="text" class="bulk-input bulk-map-location" placeholder="예: 8-A" maxlength="10" style="flex: 1; min-width: 50px;">
                <button type="button" onclick="openLocationPicker(this)" class="btn-small" style="padding: 3px 8px; font-size: 11px; white-space: nowrap;">배치</button>
            </div>
        </td>
        <td><input type="text" class="bulk-input bulk-note" placeholder="비고(실제 파트넘버)"></td>
    `;
    tbody.appendChild(tr);

    // 날짜 기본값 설정 (날짜만)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    tr.querySelector('.bulk-date').value = `${year}-${month}-${day}`;

    // 캐비닛 위치 입력 정규화 (blur 시 A2 -> A-2)
    attachCabinetNormalizer(tr.querySelector('.bulk-cabinet-location'));

    // 도면 위치 입력 정규화 (blur 시 8A -> 8-A)
    attachMapNormalizer(tr.querySelector('.bulk-map-location'));

    // 카테고리 로드
    loadCategoriesForBulk();
    loadPaymentMethodsForBulk();
    loadProjectsForBulk();

    // 일괄 선택된 값들이 있으면 새 행에 자동 적용
    const bulkCategoryValue = document.getElementById('bulkCategorySelect')?.value;
    const bulkPaymentMethodValue = document.getElementById('bulkPaymentMethodSelect')?.value;
    const bulkProjectValue = document.getElementById('bulkProjectSelect')?.value;

    // 선택 값들을 설정하기 전에 드롭다운이 로드될 때까지 잠시 대기
    setTimeout(() => {
        if (bulkCategoryValue) {
            const categorySelect = tr.querySelector('.bulk-category');
            if (categorySelect) categorySelect.value = bulkCategoryValue;
        }
        if (bulkPaymentMethodValue) {
            const paymentMethodSelect = tr.querySelector('.bulk-payment-method');
            if (paymentMethodSelect) paymentMethodSelect.value = bulkPaymentMethodValue;
        }
        if (bulkProjectValue) {
            const projectSelect = tr.querySelector('.bulk-project-name');
            if (projectSelect) projectSelect.value = bulkProjectValue;
        }
    }, 100);
}

// 행 삭제 (마지막 행)
function removeBulkRow() {
    const tbody = document.getElementById('bulkInsertTableBody');
    if (tbody.children.length > 1) {
        tbody.removeChild(tbody.lastChild);
        // 행 삭제 후 캐비넷 중복 경고 다시 업데이트
        updateCabinetWarningArea();
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

    // 일괄 결제수단 선택 드롭다운 채우기
    const bulkPaymentMethodSelect = document.getElementById('bulkPaymentMethodSelect');
    if (bulkPaymentMethodSelect) {
        const currentValue = bulkPaymentMethodSelect.value;
        // 기존 옵션 제거 (첫 번째 "개별 선택" 제외)
        while (bulkPaymentMethodSelect.children.length > 1) {
            bulkPaymentMethodSelect.removeChild(bulkPaymentMethodSelect.lastChild);
        }
        // 새로운 옵션 추가
        paymentMethodsData.forEach(method => {
            const option = document.createElement('option');
            option.value = method.categoryId;
            option.textContent = method.categoryName;
            bulkPaymentMethodSelect.appendChild(option);
        });
        // 이전 선택 값이 있으면 복원
        if (currentValue && bulkPaymentMethodSelect.querySelector(`option[value="${currentValue}"]`)) {
            bulkPaymentMethodSelect.value = currentValue;
        }
    }
}

async function loadProjectsForBulk() {
    if (projectsData.length === 0) {
        await loadProjects();
    }

    document.querySelectorAll('.bulk-project-name').forEach(select => {
        if (select.children.length <= 1) {
            projectsData.forEach(project => {
                const option = document.createElement('option');
                option.value = project.categoryName;
                option.textContent = project.categoryName;
                select.appendChild(option);
            });
        }
    });

    // 일괄 프로젝트 선택 드롭다운 채우기
    const bulkProjectSelect = document.getElementById('bulkProjectSelect');
    if (bulkProjectSelect) {
        const currentValue = bulkProjectSelect.value;
        // 기존 옵션 제거 (첫 번째 "개별 선택" 제외)
        while (bulkProjectSelect.children.length > 1) {
            bulkProjectSelect.removeChild(bulkProjectSelect.lastChild);
        }
        // 새로운 옵션 추가
        projectsData.forEach(project => {
            const option = document.createElement('option');
            option.value = project.categoryName;
            option.textContent = project.categoryName;
            bulkProjectSelect.appendChild(option);
        });
        // 이전 선택 값이 있으면 복원
        if (currentValue && bulkProjectSelect.querySelector(`option[value="${currentValue}"]`)) {
            bulkProjectSelect.value = currentValue;
        }
    }
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

function applyBulkPaymentMethod() {
    const bulkPaymentMethodId = document.getElementById('bulkPaymentMethodSelect').value;

    if (!bulkPaymentMethodId) {
        return; // "개별 선택"인 경우 아무것도 하지 않음
    }

    // 모든 행의 결제수단을 선택된 값으로 변경
    document.querySelectorAll('.bulk-payment-method').forEach(select => {
        select.value = bulkPaymentMethodId;
    });

    showMessage('모든 행에 결제수단이 일괄 적용되었습니다.', 'success');
}

function applyBulkProject() {
    const bulkProject = document.getElementById('bulkProjectSelect').value;

    if (!bulkProject) {
        return; // "개별 선택"인 경우 아무것도 하지 않음
    }

    // 모든 행의 프로젝트를 선택된 값으로 변경
    document.querySelectorAll('.bulk-project-name').forEach(select => {
        select.value = bulkProject;
    });

    showMessage('모든 행에 프로젝트가 일괄 적용되었습니다.', 'success');
}

// 테이블 초기화
function clearBulkTable() {
    const tbody = document.getElementById('bulkInsertTableBody');
    tbody.innerHTML = '';
    addBulkRow();

    // 경고 영역 초기화
    const warningArea = document.getElementById('cabinetWarningArea');
    const warningList = document.getElementById('cabinetWarningList');
    if (warningArea) warningArea.style.display = 'none';
    if (warningList) warningList.innerHTML = '';
}
