// ==================== 자료실 ====================
// NOTE: 이 파일은 main.js에서 분리된 자료실 관련 기능입니다.
// 필요한 전역 함수들 (showMessage, formatDateTime)은 utils.js에서 제공됩니다.
// LIBRARY_API 상수는 constants.js에서 선언됩니다.

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
