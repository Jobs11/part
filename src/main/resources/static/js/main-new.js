// ==================== Main.js 진입점 ====================
// 모든 모듈이 로드된 후 실행되는 초기화 코드

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', async function () {
    // 폼 이벤트 리스너 등록
    const incomingForm = document.getElementById('incomingForm');
    const usageForm = document.getElementById('usageForm');
    const purchaseDateEl = document.getElementById('purchaseDate');
    const usedDateEl = document.getElementById('usedDate');
    const categoryIdEl = document.getElementById('categoryId');

    if (incomingForm) incomingForm.addEventListener('submit', registerIncoming);
    if (usageForm) usageForm.addEventListener('submit', registerUsage);

    // 날짜 기본값 설정
    if (purchaseDateEl) purchaseDateEl.value = new Date().toISOString().split('T')[0];
    if (usedDateEl) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        usedDateEl.value = `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    if (categoryIdEl) categoryIdEl.addEventListener('change', onCategoryChange);

    // 관리자/일반 유저 버튼 표시 여부 확인 및 사용자 이름 표시
    try {
        const response = await fetch('/livewalk/auth/current-user');
        if (response.ok) {
            const data = await response.json();
            const adminBtn = document.getElementById('adminBtn');
            const myProfileBtn = document.getElementById('myProfileBtn');
            const mapSpotButton = document.getElementById('mapSpotButton');
            const currentUserDisplay = document.getElementById('currentUserDisplay');

            // 현재 로그인한 사용자 이름 표시
            if (currentUserDisplay) {
                currentUserDisplay.textContent = `👤 ${data.fullName || data.username || '사용자'}`;
            }

            if (data.isAdmin) {
                if (adminBtn) adminBtn.style.display = 'block';
                if (mapSpotButton) mapSpotButton.style.display = 'inline-block';
            } else {
                if (myProfileBtn) myProfileBtn.style.display = 'block';
                if (mapSpotButton) mapSpotButton.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('사용자 정보 조회 오류:', error);
        const currentUserDisplay = document.getElementById('currentUserDisplay');
        if (currentUserDisplay) {
            currentUserDisplay.textContent = '사용자';
        }
    }

    // 환율 자동 계산 이벤트 리스너
    const originalPriceEl = document.getElementById('originalPrice');
    const exchangeRateEl = document.getElementById('exchangeRate');
    if (originalPriceEl) originalPriceEl.addEventListener('input', calculateKRW);
    if (exchangeRateEl) exchangeRateEl.addEventListener('input', calculateKRW);

    // 통화 변경 시 입력 UI 표시 여부만 제어
    const currencyEl = document.getElementById('currency');
    if (currencyEl) {
        currencyEl.addEventListener('change', function () {
            const currency = this.value;
            const exchangeRateGroup = document.getElementById('exchangeRateGroup');
            const originalPriceGroup = document.getElementById('originalPriceGroup');

            if (currency === 'KRW') {
                if (exchangeRateGroup) exchangeRateGroup.style.display = 'none';
                if (originalPriceGroup) originalPriceGroup.style.display = 'none';
            } else {
                if (exchangeRateGroup) exchangeRateGroup.style.display = 'flex';
                if (originalPriceGroup) originalPriceGroup.style.display = 'flex';
            }
        });
    }

    // 데이터 로드
    Promise.all([loadCategories(), loadPaymentMethods(), loadProjects()])
        .then(() => {
            loadUsageProjects();

            // 카테고리 필터 수동 채우기 (DOM 로드 후 실행 보장)
            const inventoryFilter = document.getElementById('inventoryCategoryFilter');
            if (inventoryFilter && categoriesData.length > 0) {
                inventoryFilter.innerHTML = '<option value="">전체 카테고리</option>';
                categoriesData.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.categoryName;
                    option.textContent = category.categoryName;
                    inventoryFilter.appendChild(option);
                });
                inventoryFilter.value = 'PCB';
            }
        })
        .catch(() => {
            // 데이터 로드 중 오류 무시됨
        })
        .finally(() => {
            addBulkRow();
        });

    loadAllIncoming();
    loadInventory();
    loadLowStock();
    loadAllUsage();

    enableEnterKeySearch('incomingSearchInput', searchIncoming);
    enableEnterKeySearch('usageSearchInput', searchUsage);
    enableEnterKeySearch('inventorySearchInput', searchInventory);
    enableEnterKeySearch('gridSearchInput', searchGrid);
    enableEnterKeySearch('lowStockThreshold', loadLowStock);

    // 초기 카테고리 설정
    switchCategory('parts');
});

// 수량 입력 시 음수(-) 방지
['incomingQuantity', 'quantityUsed', 'lowStockThreshold'].forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('keypress', (e) => {
        if (e.key === '-' || e.key === 'e') {
            e.preventDefault();
        }
    });
    input.addEventListener('input', () => {
        if (input.value < 0) {
            input.value = Math.abs(input.value);
        }
    });
});

// ==================== 내 정보 ====================
let currentUserInfo = null;

function openMyProfileModal() {
    fetch('/livewalk/auth/current-user')
        .then(response => response.json())
        .then(user => {
            currentUserInfo = user;
            document.getElementById('myUsername').value = user.username || '';
            document.getElementById('myFullName').value = user.fullName || user.name || '';
            document.getElementById('myPosition').value = user.position || '';
            document.getElementById('myDepartment').value = user.department || '';
            document.getElementById('myProfileModal').style.display = 'block';
        })
        .catch(error => {
            console.error('사용자 정보 조회 실패:', error);
            alert('사용자 정보를 불러오는데 실패했습니다.');
        });
}

function closeMyProfileModal() {
    document.getElementById('myProfileModal').style.display = 'none';
    currentUserInfo = null;
}

async function updateMyProfile() {
    const fullName = document.getElementById('myFullName').value;
    const currentPassword = document.getElementById('myCurrentPassword').value;
    const newPassword = document.getElementById('myNewPassword').value;
    const newPasswordConfirm = document.getElementById('myNewPasswordConfirm').value;

    if (!fullName) {
        alert('이름을 입력해주세요.');
        return;
    }

    // 비밀번호 변경 검증
    if (newPassword || newPasswordConfirm || currentPassword) {
        if (!currentPassword) {
            alert('비밀번호를 변경하려면 현재 비밀번호를 입력해주세요.');
            return;
        }
        if (!newPassword) {
            alert('새 비밀번호를 입력해주세요.');
            return;
        }
        if (newPassword !== newPasswordConfirm) {
            alert('새 비밀번호가 일치하지 않습니다.');
            return;
        }
        if (newPassword.length < 4) {
            alert('비밀번호는 최소 4자 이상이어야 합니다.');
            return;
        }
    }

    const updateData = {
        userId: currentUserInfo.userId,
        fullName: fullName
    };

    // 비밀번호 변경이 있는 경우에만 추가
    if (currentPassword && newPassword) {
        updateData.currentPassword = currentPassword;
        updateData.password = newPassword;
    }

    try {
        const response = await fetch(`/livewalk/users/${currentUserInfo.userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        if (response.ok) {
            showMessage('정보가 수정되었습니다.', 'success');

            // 비밀번호 필드 초기화
            document.getElementById('myCurrentPassword').value = '';
            document.getElementById('myNewPassword').value = '';
            document.getElementById('myNewPasswordConfirm').value = '';

            closeMyProfileModal();

            // 화면에 표시된 사용자 이름도 업데이트
            const currentUserDisplay = document.getElementById('currentUserDisplay');
            if (currentUserDisplay) {
                currentUserDisplay.textContent = `👤 ${fullName}`;
            }
        } else {
            const errorText = await response.text();
            showMessage('정보 수정 실패: ' + errorText, 'error');
        }
    } catch (error) {
        showMessage('정보 수정 오류: ' + error.message, 'error');
    }
}

function openChangePasswordModal() {
    document.getElementById('myProfileModal').style.display = 'none';
    document.getElementById('changePasswordModal').style.display = 'block';
    document.getElementById('changePasswordForm').reset();
}

function closeChangePasswordModal() {
    document.getElementById('changePasswordModal').style.display = 'none';
    document.getElementById('changePasswordForm').reset();
    if (currentUserInfo) {
        document.getElementById('myProfileModal').style.display = 'block';
    }
}

function submitPasswordChange() {
    const form = document.getElementById('changePasswordForm');
    const currentPassword = form.currentPassword.value;
    const newPassword = form.newPassword.value;
    const confirmPassword = form.confirmPassword.value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        alert('모든 필드를 입력해주세요.');
        return;
    }

    if (newPassword !== confirmPassword) {
        alert('새 비밀번호가 일치하지 않습니다.');
        return;
    }

    if (newPassword.length < 4) {
        alert('비밀번호는 최소 4자 이상이어야 합니다.');
        return;
    }

    fetch('/livewalk/auth/change-password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            currentPassword: currentPassword,
            newPassword: newPassword
        })
    })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(text || '비밀번호 변경 실패');
                });
            }
            return response.text();
        })
        .then(message => {
            alert(message || '비밀번호가 성공적으로 변경되었습니다.');
            closeChangePasswordModal();
        })
        .catch(error => {
            console.error('비밀번호 변경 실패:', error);
            alert(error.message || '비밀번호 변경에 실패했습니다.');
        });
}
