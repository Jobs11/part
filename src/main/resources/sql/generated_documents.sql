-- 생성된 문서 테이블
CREATE TABLE IF NOT EXISTS generated_documents (
    document_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    incoming_id INT NOT NULL,
    template_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,

    -- 문서 데이터 필드
    item_name VARCHAR(255),
    spec VARCHAR(255),
    quantity INT,
    unit_price DECIMAL(15, 2),
    supply_price DECIMAL(15, 2),
    tax DECIMAL(15, 2),
    notes TEXT,

    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active TINYINT(1) DEFAULT 1,

    FOREIGN KEY (incoming_id) REFERENCES part_incoming(incoming_id),
    FOREIGN KEY (template_id) REFERENCES general_images(image_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);
