-- 문서 양식 템플릿 테이블
CREATE TABLE IF NOT EXISTS document_template (
    template_id INT AUTO_INCREMENT PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL COMMENT '양식명 (예: 견적서, 발주서)',
    background_image_id INT NULL COMMENT '배경 이미지 ID (general_images 테이블 참조)',

    -- 표 설정 (JSON)
    table_config JSON NULL COMMENT '표 설정: {x, y, width, height, columns: [{name, width}], rowHeight}',

    -- 고정 텍스트 설정 (JSON)
    fixed_texts JSON NULL COMMENT '고정 텍스트들: [{text, x, y, fontSize, fontWeight}]',

    -- 메타 정보
    created_by VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_template_name (template_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='문서 양식 템플릿';

-- 예시 데이터
-- INSERT INTO document_template (template_name, table_config, fixed_texts) VALUES
-- ('기본 견적서',
--  '{"x": 50, "y": 400, "width": 700, "height": 400, "columns": [{"name": "항목", "width": 200}, {"name": "규격", "width": 100}, {"name": "수량", "width": 80}, {"name": "단가", "width": 120}, {"name": "금액", "width": 120}, {"name": "비고", "width": 80}], "rowHeight": 30}',
--  '[{"text": "견적서", "x": 350, "y": 50, "fontSize": 28, "fontWeight": "bold"}, {"text": "㈜라이브워크", "x": 50, "y": 100, "fontSize": 16, "fontWeight": "normal"}]'
-- );
