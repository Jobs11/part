CREATE TABLE IF NOT EXISTS generated_document (
    document_id INT AUTO_INCREMENT PRIMARY KEY,
    template_id INT NOT NULL,
    document_name VARCHAR(200) NOT NULL,
    table_data JSON NULL,  -- 표에 입력된 데이터 [{row1: [...], row2: [...]}]
    generated_by VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES document_template(template_id) ON DELETE CASCADE
);
