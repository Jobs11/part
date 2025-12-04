# JavaScript 모듈 구조

main.js 파일(308KB)을 기능별로 13개의 모듈로 분리했습니다.

## 📦 모듈 목록

### 1. **constants.js** (497 bytes)
- API 엔드포인트 상수
- 정규식 패턴
- 모든 모듈에서 공유되는 상수 정의

### 2. **utils.js** (6.7KB)
- 공통 유틸리티 함수들
- 포맷팅 함수 (날짜, 숫자, 파일크기)
- 검증 함수 (위치 코드)
- UI 헬퍼 함수 (메시지 표시, 패널 토글)

### 3. **category.js** (17KB)
- 카테고리 관리
- 결제수단 관리
- 프로젝트 관리
- 카테고리 모달 기능

### 4. **grid.js** (19KB)
- 부품 배치도 그리드 생성 및 관리
- 위치 기반 부품 등록
- 배치도 검색 기능
- 위치 모달 그리드

### 5. **inventory.js** (15KB)
- 재고 현황 조회
- 재고 부족 조회
- 재고 검색 및 정렬
- 카테고리별 필터링

### 6. **incoming.js** (45KB)
- 입고 등록
- 입고 리스트 조회 및 검색
- 입고 데이터 편집
- 이미지/문서 관리
- 위치 선택 기능

### 7. **usage.js** (20KB)
- 출고 등록
- 출고 내역 조회 및 검색
- 출고 데이터 편집
- 프로젝트 연동

### 8. **document.js** (92KB)
- 이미지 모달 관리
- 문서 모달 관리
- 문서 생성 및 편집
- 일괄 등록 기능
- Canvas 기반 문서 편집
- 에디터 전역 변수 선언

### 9. **library.js** (8.4KB)
- 자료실 관리
- 파일 업로드/다운로드
- PDF 미리보기

### 10. **location.js** (84KB)
- 도면 좌표 마킹
- 위치 선택 (도면/캐비넷)
- 부품 배치도 보기
- 캐비넷 그리드 관리

### 11. **template-editor.js** (56KB)
- 템플릿 에디터
- Canvas 편집 기능
- PDF 생성
- 템플릿 필드 설정 저장/불러오기

### 12. **csv.js** (9.2KB)
- CSV 다운로드 기능
- 컬럼 선택 모달
- CSV 변환 및 생성

### 13. **main-new.js** (4KB)
- 애플리케이션 진입점
- 초기화 코드
- 사용자 프로필 관리
- 비밀번호 변경

## 🔗 의존성 순서

HTML에서 다음 순서대로 스크립트를 로드해야 합니다:

```html
<!-- 1. 상수 정의 -->
<script src="js/constants.js"></script>

<!-- 2. 유틸리티 함수 -->
<script src="js/utils.js"></script>

<!-- 3. 기능 모듈들 (순서 중요) -->
<script src="js/category.js"></script>
<script src="js/grid.js"></script>
<script src="js/inventory.js"></script>
<script src="js/incoming.js"></script>
<script src="js/usage.js"></script>
<script src="js/document.js"></script>
<script src="js/library.js"></script>
<script src="js/location.js"></script>
<script src="js/template-editor.js"></script>
<script src="js/csv.js"></script>

<!-- 4. 진입점 -->
<script src="js/main-new.js"></script>
```

## 📝 주요 전역 변수

### constants.js
- `INCOMING_API`, `USAGE_API`, `CATEGORY_API`, `PAYMENT_METHOD_API`, `PROJECT_API`, `LIBRARY_API`
- `LOCATION_CODE_REGEX`

### category.js (공유 데이터)
- `categoriesData[]` - 모든 모듈에서 공유
- `paymentMethodsData[]` - 모든 모듈에서 공유
- `projectsData[]` - 모든 모듈에서 공유

### grid.js
- `gridInitialized`

### inventory.js
- `inventoryData[]`, `lowStockData[]`
- `currentInventorySearchKeyword`, `currentInventorySearchColumn`
- `currentInventorySortColumn`, `currentInventorySortOrder`

### incoming.js
- `currentIncomingSortColumn`, `currentIncomingSortOrder`
- `currentIncomingSearchKeyword`, `currentIncomingSearchColumn`
- `currentIncomingIdForImage`, `currentIncomingIdForDocument`

### usage.js
- `selectedPart`
- `currentUsageSortColumn`, `currentUsageSortOrder`
- `currentUsageSearchKeyword`, `currentUsageSearchColumn`

### document.js
- 에디터 관련: `editorZoom`, `editorSnapEnabled`, `editorSnapSize`, `editorDragMode`, `editorTableMode`, `editorEditMode`
- 템플릿 관련: `currentTemplateImage`, `currentTemplatePdf`

### location.js
- `mapSpotImagesCache[]`, `mapSpotMarkers[]`
- `locationPickerImagesCache[]`, `locationPickerMarkers[]`

### csv.js
- `currentCsvType`, `currentCsvData`, `currentCsvColumns[]`

## 🔧 백업 파일

- **main.js.backup** - 최초 백업 파일 (원본)
- **main-old.js** - 분리 전 main.js 파일

## ⚠️ 주의사항

1. **로드 순서 엄수**: constants.js와 utils.js는 반드시 다른 모듈보다 먼저 로드되어야 합니다.
2. **전역 변수 충돌 방지**: 각 모듈에서 중복 선언을 제거했으므로 순서대로 로드해야 합니다.
3. **의존성 관계**:
   - template-editor.js는 document.js에 의존합니다 (에디터 변수 선언)
   - 대부분의 모듈이 utils.js의 유틸리티 함수들에 의존합니다

## 🎯 장점

- **모듈화**: 기능별로 파일이 분리되어 유지보수가 쉽습니다
- **재사용성**: 각 모듈을 독립적으로 수정할 수 있습니다
- **가독성**: 코드가 논리적으로 구조화되어 있습니다
- **디버깅**: 문제 발생 시 해당 모듈만 확인하면 됩니다
