-- add_action_audit_log.sql
-- Purpose: store CRUD audit logs for key entities
CREATE TABLE IF NOT EXISTS action_audit (
    audit_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    entity_type VARCHAR(100) NOT NULL COMMENT '대상 엔티티 타입 (예: part_incoming, user 등)',
    entity_id BIGINT NULL COMMENT '대상 PK (없으면 NULL)',
    action VARCHAR(20) NOT NULL COMMENT 'CREATE/UPDATE/DELETE/READ 등',
    summary VARCHAR(255) NULL COMMENT '요약 메시지',
    changed_fields JSON NULL COMMENT '필드 변경 상세 (선택)',
    performed_by VARCHAR(100) NOT NULL COMMENT '실행자 ID/username',
    performed_ip VARCHAR(64) NULL COMMENT '요청 IP',
    user_agent VARCHAR(255) NULL COMMENT 'User-Agent',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_action_audit_entity (entity_type, entity_id),
    INDEX idx_action_audit_created_at (created_at),
    INDEX idx_action_audit_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
