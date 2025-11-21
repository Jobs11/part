-- 일반 사진 테이블 생성
CREATE TABLE IF NOT EXISTS general_images (
    image_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL COMMENT '사진 제목',
    description TEXT COMMENT '사진 설명',
    file_name VARCHAR(255) NOT NULL COMMENT '파일명 (UUID)',
    original_name VARCHAR(255) NOT NULL COMMENT '원본 파일명',
    file_path VARCHAR(500) NOT NULL COMMENT '파일 저장 경로',
    file_size BIGINT COMMENT '파일 크기 (bytes)',
    uploaded_by INT COMMENT '업로드한 사용자 ID',
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '업로드 일시',
    is_active TINYINT(1) DEFAULT 1 COMMENT '활성 상태',
    FOREIGN KEY (uploaded_by) REFERENCES users(user_id),
    INDEX idx_uploaded_at (uploaded_at),
    INDEX idx_title (title),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='일반 사진 갤러리';
