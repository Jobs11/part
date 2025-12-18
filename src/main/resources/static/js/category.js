// ==================== 전역 변수 ====================
// 상수는 constants.js에서 선언됨
let categoriesData = [];
let paymentMethodsData = [];
let projectsData = [];

// ==================== 카테고리 관련 ====================
async function loadCategories() {
    try {
        const response = await fetch(CATEGORY_API);
        if (!response.ok) throw new Error('카테고리 조회 실패');

        categoriesData = await response.json();

        // 입고 등록 드롭다운
        const select = document.getElementById('categoryId');
        if (select) {
            select.innerHTML = '<option value="">선택하세요</option>';

            categoriesData.forEach(category => {
                const option = document.createElement('option');
                option.value = category.categoryId;
                option.textContent = category.categoryName;
                select.appendChild(option);
            });
        }

        // 재고 현황 필터 드롭다운 (재고 부족 부품도 함께 필터링)
        const inventoryFilter = document.getElementById('inventoryCategoryFilter');
        console.log('inventoryCategoryFilter element:', inventoryFilter);
        console.log('categoriesData:', categoriesData);
        if (inventoryFilter) {
            inventoryFilter.innerHTML = '<option value="">전체 카테고리</option>';

            categoriesData.forEach(category => {
                const option = document.createElement('option');
                option.value = category.categoryName;
                option.textContent = category.categoryName;
                inventoryFilter.appendChild(option);
            });
            console.log('카테고리 필터 드롭다운 채움 완료, 항목 수:', categoriesData.length);
        } else {
            console.error('inventoryCategoryFilter 요소를 찾을 수 없습니다!');
        }
    } catch (error) {
        showMessage('카테고리 조회 오류: ' + error.message, 'error');
    }
}

async function loadPaymentMethods() {
    try {
        const response = await fetch(PAYMENT_METHOD_API);
        if (!response.ok) throw new Error('결제수단 조회 실패');

        paymentMethodsData = await response.json();

        const select = document.getElementById('paymentMethodId');
        if (select) {
            const previousValue = select.value;
            select.innerHTML = '<option value="">선택해주세요</option>';

            paymentMethodsData.forEach(method => {
                const option = document.createElement('option');
                option.value = method.categoryId;
                option.textContent = method.categoryName;
                select.appendChild(option);
            });

            if (previousValue && select.querySelector(`option[value="${previousValue}"]`)) {
                select.value = previousValue;
            }
        }
    } catch (error) {
        showMessage('결제수단 조회 오류: ' + error.message, 'error');
    }
}

// 프로젝트 로드
async function loadProjects() {
    try {
        const response = await fetch(PROJECT_API);
        if (!response.ok) throw new Error('프로젝트 조회 실패');

        projectsData = await response.json();
    } catch (error) {
        showMessage('프로젝트 조회 오류: ' + error.message, 'error');
    }
}

// filterInventoryByCategory는 inventory.js에 정의되어 있음

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
    const bulkProjectName = document.getElementById('bulkProjectSelect').value;

    if (!bulkProjectName) {
        return; // "개별 선택"인 경우 아무것도 하지 않음
    }

    // 모든 행의 프로젝트를 선택된 값으로 변경
    document.querySelectorAll('.bulk-project-name').forEach(select => {
        select.value = bulkProjectName;
    });

    showMessage('모든 행에 프로젝트가 일괄 적용되었습니다.', 'success');
}

function openBulkCabinetPicker() {
    // 일괄 캐비넷 위치 입력 필드를 대상으로 설정
    cabinetPickerTargetInput = document.getElementById('bulkCabinetLocationInput');

    // 입력 모드로 설정 (일괄 적용 모드)
    currentPartLocationMode = 'bulk'; // 일괄 적용 모드 플래그
    currentPartLocationPartNumber = null;
    currentPartLocationPartName = null;

    // 캐비넷 피커 모달 열기
    document.getElementById('cabinetPickerModal').style.display = 'block';

    // 그리드 생성 (선택 모드)
    createCabinetPickerGrid();
}

function applyBulkCabinetLocation() {
    const bulkCabinetLocation = document.getElementById('bulkCabinetLocationInput').value.trim();

    if (!bulkCabinetLocation) {
        showMessage('캐비넷 위치를 입력하세요.', 'error');
        return;
    }

    // 위치 코드 정규화 (대문자 변환, 하이픈 자동 삽입)
    // normalizeCabinetLocationValue 함수가 location.js에 정의되어 있음
    const normalized = typeof normalizeCabinetLocationValue === 'function'
        ? normalizeCabinetLocationValue(bulkCabinetLocation)
        : bulkCabinetLocation.trim().toUpperCase();

    // 유효성 검증 (A-1, AA-32 형식)
    if (!/^[A-Z]{1,2}-\d+$/.test(normalized)) {
        showMessage('캐비넷 위치 형식이 올바르지 않습니다. (예: A-1, AA-32)', 'error');
        return;
    }

    // 모든 행의 캐비넷 위치를 선택된 값으로 변경
    const inputs = document.querySelectorAll('.bulk-cabinet-location');
    console.log('찾은 입력 필드 개수:', inputs.length);

    inputs.forEach(input => {
        input.value = normalized;
    });

    // 입력 필드 초기화
    document.getElementById('bulkCabinetLocationInput').value = '';

    showMessage(`모든 행에 캐비넷 위치 "${normalized}"가 일괄 적용되었습니다.`, 'success');
}

// ==================== 카테고리 모달 관련 ====================
async function openCategoryModal() {
    document.getElementById('categoryModal').style.display = 'block';
    document.getElementById('categoryForm').reset();
    await loadCategoryList();
}

async function closeCategoryModal() {
    document.getElementById('categoryModal').style.display = 'none';
    document.getElementById('categoryForm').reset();

    // 모달 닫을 때 전체 데이터 새로고침
    await loadCategories(); // 전체 카테고리 새로고침
    await loadPaymentMethods(); // 결제수단 새로고침
    await loadProjects(); // 프로젝트 새로고침
    loadCategoriesForBulk(); // 입고 등록 드롭다운 새로고침
    loadPaymentMethodsForBulk(); // 입고 등록 결제수단 드롭다운 새로고침
    loadProjectsForBulk(); // 입고 등록 프로젝트 드롭다운 새로고침
    loadAllIncoming(); // 입고 내역 새로고침
    loadInventory(); // 재고 현황 새로고침
}

async function loadCategoryList() {
    try {
        const response = await fetch(`${CATEGORY_API}/management`);
        const categories = await response.json();

        // 설명(description) 기준으로 한글 역순(ㅎ~ㄱ) 정렬
        categories.sort((a, b) => {
            const descA = (a.description || '').trim();
            const descB = (b.description || '').trim();

            // 빈 값은 맨 뒤로 보내기
            if (!descA && descB) return 1;
            if (descA && !descB) return -1;
            if (!descA && !descB) return 0;

            // 한글 역순 정렬 (ㅎ~ㄱ)
            return descB.localeCompare(descA, 'ko-KR');
        });

        const tbody = document.getElementById('categoryListBody');
        tbody.innerHTML = '';

        categories.forEach(category => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${category.categoryName}</td>
                <td>${category.description || '-'}</td>
                <td>
                    <button class="btn-small" onclick="deleteCategory(${category.categoryId}, '${escapeHtml(category.categoryName)}')" style="background-color: #dc3545; color: white; border: none; padding: 4px 8px; cursor: pointer; border-radius: 3px;">삭제</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        showMessage('카테고리 목록 조회 오류: ' + error.message, 'error');
    }
}

async function deleteCategory(categoryId, categoryName) {
    if (!confirm(`카테고리 "${categoryName}"을(를) 삭제하시겠습니까?`)) {
        return;
    }

    try {
        const response = await fetch(`${CATEGORY_API}/${categoryId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showMessage('카테고리 삭제 완료', 'success');
            await loadCategoryList(); // 목록 새로고침
            await loadCategories(); // 전체 카테고리 새로고침
            loadCategoriesForBulk(); // 입고 등록 드롭다운 새로고침
        } else {
            const errorMessage = await response.text();
            showMessage('카테고리 삭제 실패: ' + errorMessage, 'error');
        }
    } catch (error) {
        showMessage('서버 연결 오류: ' + error.message, 'error');
    }
}

async function submitCategory(event) {
    event.preventDefault();

    const categoryData = {
        categoryName: document.getElementById('categoryName').value.trim(),
        description: document.getElementById('categoryDescription').value.trim() || null
    };

    try {
        const response = await fetch(CATEGORY_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(categoryData)
        });

        if (response.ok) {
            const message = await response.text();
            showMessage(message, 'success');
            document.getElementById('categoryForm').reset();
            await loadCategoryList(); // 목록 새로고침
            await loadCategories(); // 전체 카테고리 새로고침
            loadCategoriesForBulk(); // 입고 등록 드롭다운 새로고침
        } else {
            const errorMessage = await response.text();
            showMessage('카테고리 등록 실패: ' + errorMessage, 'error');
        }
    } catch (error) {
        showMessage('서버 연결 오류: ' + error.message, 'error');
    }
}

// ==================== 카테고리 전환 ====================

let currentCategory = 'parts'; // 기본값: 부품

// 카테고리 전환
function switchCategory(category) {
    currentCategory = category;

    const partsSections = document.querySelectorAll('.parts-section');
    const docsSections = document.querySelectorAll('.docs-section');
    const partsBtn = document.getElementById('categoryBtnParts');
    const docsBtn = document.getElementById('categoryBtnDocs');

    if (category === 'parts') {
        // 부품 섹션 보이기
        partsSections.forEach(section => section.style.display = 'block');
        docsSections.forEach(section => section.style.display = 'none');

        // 버튼 스타일 변경
        partsBtn.style.background = '#007bff';
        partsBtn.style.color = 'white';
        docsBtn.style.background = 'white';
        docsBtn.style.color = '#007bff';
    } else {
        // 문서 섹션 보이기
        partsSections.forEach(section => section.style.display = 'none');
        docsSections.forEach(section => section.style.display = 'block');

        // 버튼 스타일 변경
        docsBtn.style.background = '#007bff';
        docsBtn.style.color = 'white';
        partsBtn.style.background = 'white';
        partsBtn.style.color = '#007bff';

        // 문서 목록 로드
        loadAllDocuments();

        // 템플릿 목록 로드
        if (typeof loadTemplateList === 'function') {
            loadTemplateList();
        }

        // 생성된 문서 목록 로드
        if (typeof loadGeneratedDocuments === 'function') {
            loadGeneratedDocuments();
        }
    }
}

// 모든 문서 목록 로드 (입고 ID 없이)
async function loadAllDocuments() {
    try {
        // 서버에서 모든 문서 가져오는 API가 필요함
        // 임시로 빈 목록 표시
        const container = document.getElementById('documentsListContainer');
        container.innerHTML = '<p style="color: #999;">문서 목록을 불러오는 중...</p>';

        // TODO: 서버에서 모든 문서 목록 가져오기
        // const response = await fetch('/livewalk/documents/all');
        // if (response.ok) {
        //     const documents = await response.json();
        //     displayDocumentsList(documents);
        // }
    } catch (error) {
        console.error('문서 목록 로딩 오류:', error);
    }
}
