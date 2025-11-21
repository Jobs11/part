CREATE DATABASE livewalk;

-- ==========================================
-- 1. 카테고리 테이블
-- ==========================================
CREATE TABLE category (
    category_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '카테고리 ID',
    category_code VARCHAR(10) NOT NULL UNIQUE COMMENT '카테고리 코드 (E, M, C 등)',
    category_name VARCHAR(50) NOT NULL COMMENT '카테고리명',
    description VARCHAR(255) COMMENT '설명',
    last_number INT DEFAULT 0 COMMENT '마지막 발급 번호 (자동증가용)',
    is_active TINYINT(1) DEFAULT 1 COMMENT '활성화 여부',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='카테고리';



-- ==========================================
-- 2. 입고 테이블 (메인 테이블)
-- ==========================================
CREATE TABLE part_incoming (
    incoming_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '입고 ID',
    
    -- 부품 정보
    part_number VARCHAR(20) NOT NULL COMMENT '부품번호 (예: E-0001)',
    category_id INT NOT NULL COMMENT '카테고리 ID',
    part_name VARCHAR(100) NOT NULL COMMENT '부품명 (중복 허용)',
    description TEXT NOT NULL COMMENT '설명 (필수)',
    unit VARCHAR(20) DEFAULT 'EA' COMMENT '단위',
    
    -- 입고 수량
    incoming_quantity INT NOT NULL COMMENT '입고 수량',
    
    -- 금액 정보 (필수)
    purchase_price DECIMAL(15,2) NOT NULL COMMENT '구매 금액 (원화 환산 후)',
    currency VARCHAR(10) DEFAULT 'KRW' COMMENT '통화 (KRW, USD, JPY, EUR, CNY)',
    exchange_rate DECIMAL(10,4) DEFAULT 1.0000 COMMENT '환율 (외화→원화)',
    original_price DECIMAL(15,2) COMMENT '원래 금액 (외화인 경우)',
    
    -- 구매 정보
    purchase_date DATE NOT NULL COMMENT '구매일자 (필수)',
    supplier VARCHAR(100) COMMENT '공급업체',
    invoice_number VARCHAR(50) COMMENT '송장번호',
    
    -- 기타
    note TEXT COMMENT '비고',
    created_by VARCHAR(50) DEFAULT 'system' COMMENT '등록자',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '등록일시',
    
    FOREIGN KEY (category_id) REFERENCES category(category_id),
    INDEX idx_part_number (part_number),
    INDEX idx_category (category_id),
    INDEX idx_part_name (part_name),
    INDEX idx_purchase_date (purchase_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='부품 입고 이력 (메인)';


-- ==========================================
-- 3. 부품 사진 테이블 (여러 장 저장 가능)
-- ==========================================
CREATE TABLE part_images (
    image_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '이미지 ID',
    
    -- 연결 정보 (입고 ID로 연결)
    incoming_id INT NOT NULL COMMENT '입고 ID',
    
    -- 이미지 정보
    image_type VARCHAR(20) NOT NULL COMMENT '이미지 타입 (delivery:택배, part:부품, etc:기타)',
    image_url VARCHAR(500) NOT NULL COMMENT '이미지 경로 또는 URL',
    storage_type VARCHAR(20) DEFAULT 'local' COMMENT '저장소 타입 (local, cloudinary, s3)',
    
    -- 파일 정보
    file_name VARCHAR(255) COMMENT '원본 파일명',
    file_size BIGINT COMMENT '파일 크기 (bytes)',
    mime_type VARCHAR(50) COMMENT 'MIME 타입 (image/jpeg, image/png)',
    
    -- 정렬/관리
    display_order INT DEFAULT 0 COMMENT '표시 순서',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '등록일시',
    
    FOREIGN KEY (incoming_id) REFERENCES part_incoming(incoming_id) ON DELETE CASCADE,
    INDEX idx_incoming_id (incoming_id),
    INDEX idx_image_type (image_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='부품 사진 (여러 장 가능)';


-- ==========================================
-- 4. 출고(사용) 테이블
-- ==========================================
CREATE TABLE part_usage (
    usage_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '사용 ID',
    
    -- 연결 정보
    incoming_id INT NOT NULL COMMENT '입고 ID (어느 입고 건에서 출고했는지)',
    part_number VARCHAR(20) NOT NULL COMMENT '부품번호',
    
    -- 사용 수량
    quantity_used INT NOT NULL COMMENT '사용 수량',
    
    -- 사용 정보
    usage_location VARCHAR(100) NOT NULL COMMENT '사용처',
    used_date DATE NOT NULL COMMENT '사용일',
    
    -- 기타
    note TEXT COMMENT '비고',
    created_by VARCHAR(50) DEFAULT 'system' COMMENT '등록자',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '등록일시',
    
    FOREIGN KEY (incoming_id) REFERENCES part_incoming(incoming_id) ON DELETE CASCADE,
    INDEX idx_incoming_id (incoming_id),
    INDEX idx_part_number (part_number),
    INDEX idx_used_date (used_date),
    INDEX idx_usage_location (usage_location)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='부품 사용(출고) 이력';

-- ==========================================
-- 5. 부품 위치 테이블
-- ==========================================
CREATE TABLE part_location (
    location_id INT AUTO_INCREMENT PRIMARY KEY COMMENT '위치 ID',

    -- 위치 (칸, 좌표 등)
    location_code VARCHAR(50) NOT NULL UNIQUE COMMENT '위치 코드 (예: A-1, B-3, C-2)',
    
    -- 부품 정보
    part_number VARCHAR(20) COMMENT '부품번호',
    part_name VARCHAR(100) COMMENT '부품명',

    -- UI 관련 (좌표형 배치일 경우)
    pos_x VARCHAR(5) COMMENT '가로 좌표 (A~AA 등)',
    pos_y INT COMMENT '세로 좌표 (1~32 등)',

    -- 기타
    note VARCHAR(255) COMMENT '비고 또는 추가 정보',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '최근 수정일'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='부품 배치도 위치 테이블 (위치-부품 매핑)';

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    user_role VARCHAR(20) DEFAULT 'USER',
    full_name VARCHAR(100),
    email VARCHAR(100),
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE user_access_logs (
    log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    username VARCHAR(50),
    login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    logout_time DATETIME NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);



