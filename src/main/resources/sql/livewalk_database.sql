CREATE TABLE `category` (
   `category_id` int NOT NULL AUTO_INCREMENT COMMENT '카테고리 ID',
   `category_code` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '카테고리 코드 (E, M, C 등)',
   `category_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '카테고리명',
   `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '설명',
   `last_number` int DEFAULT '0' COMMENT '마지막 발급 번호 (자동증가용)',
   `is_active` tinyint(1) DEFAULT '1' COMMENT '활성화 여부',
   `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
   `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
   PRIMARY KEY (`category_id`),
   UNIQUE KEY `uniq_category_name_desc` (`category_name`,`description`)
 ) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='카테고리';

CREATE TABLE `part_incoming` (
   `incoming_id` int NOT NULL AUTO_INCREMENT COMMENT '입고 ID',

   `part_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '부품번호 (예: E-0001)',
   `category_id` int NOT NULL COMMENT '카테고리 ID',
   `part_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '부품명 (중복 허용)',
   `description` text COLLATE utf8mb4_unicode_ci COMMENT '설명 (필수)',

   `project_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '프로젝트명',
   `unit` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'EA' COMMENT '단위',

   `payment_method_id` int DEFAULT NULL COMMENT '결제수단 ID',

   `incoming_quantity` int NOT NULL COMMENT '입고 수량',

   `purchase_price` decimal(15,2) NOT NULL COMMENT '구매 금액 (원화 환산 후)',
   `currency` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT 'KRW' COMMENT '통화 (KRW, USD, JPY, EUR, CNY)',
   `exchange_rate` decimal(10,4) DEFAULT '1.0000' COMMENT '환율 (외화→원화)',
   `original_price` decimal(15,2) DEFAULT NULL COMMENT '원래 금액 (외화인 경우)',

   `purchase_datetime` date NOT NULL COMMENT '구매일시',

   `supplier` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '공급업체',
   `purchaser` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '구매업체',
   `invoice_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '송장번호',

   `note` text COLLATE utf8mb4_unicode_ci COMMENT '비고',
   `created_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'system' COMMENT '등록자',
   `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '등록일시',

   -- 🔥 PK: 원래대로 incoming_id 유지
   PRIMARY KEY (`incoming_id`),

   -- 🔥 UNIQUE: part_number + purchase_datetime
   UNIQUE KEY `uniq_part_purchase` (`part_number`, `purchase_datetime`),

   -- INDEX들
   KEY `idx_part_number` (`part_number`),
   KEY `idx_category` (`category_id`),
   KEY `idx_part_name` (`part_name`),
   KEY `idx_purchase_date` (`purchase_datetime`),
   KEY `fk_part_incoming_payment_method` (`payment_method_id`),

   -- FK
   CONSTRAINT `fk_part_incoming_payment_method`
       FOREIGN KEY (`payment_method_id`) REFERENCES `category` (`category_id`),

   CONSTRAINT `part_incoming_ibfk_1`
       FOREIGN KEY (`category_id`) REFERENCES `category` (`category_id`)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='부품 입고 이력 (메인)';



CREATE TABLE `part_location` (
   `location_id` INT NOT NULL AUTO_INCREMENT COMMENT '위치 ID',
   `incoming_id` INT NOT NULL COMMENT '입고 ID (FK)',
   `location_code` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '위치 코드 (예: A-1, B-3, C-2)',
   `part_number` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '부품번호 (참고용)',
   `part_name` VARCHAR(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '부품명',
   `pos_x` VARCHAR(5) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '가로 좌표 (A~AA 등)',
   `pos_y` INT DEFAULT NULL COMMENT '세로 좌표 (1~32 등)',
   `note` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '비고 또는 추가 정보',
   `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '최근 수정일',

   PRIMARY KEY (`location_id`),

   -- 입고ID당 하나의 위치만 허용
   UNIQUE KEY `uniq_location_per_incoming` (`incoming_id`),

--    -- 캐비닛 좌표 중복 방지 (유지)
--    UNIQUE KEY `uniq_part_location_pos` (`pos_x`, `pos_y`),

   -- FK 연결
   CONSTRAINT `fk_location_incoming`
       FOREIGN KEY (`incoming_id`) REFERENCES `part_incoming` (`incoming_id`)
       ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='입고별 부품 위치 테이블';


CREATE TABLE `part_usage` (
   `usage_id` int NOT NULL AUTO_INCREMENT COMMENT '사용 ID',
   `incoming_id` int NOT NULL COMMENT '입고 ID (어느 입고 건에서 출고했는지)',
   `part_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '부품번호',
   `quantity_used` int NOT NULL COMMENT '사용 수량',
   `usage_location` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '사용처',

   -- 여기 변경됨
   `used_datetime` date NOT NULL COMMENT '사용일시',

   `note` text COLLATE utf8mb4_unicode_ci COMMENT '비고',
   `created_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'system' COMMENT '등록자',
   `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '등록일시',
   PRIMARY KEY (`usage_id`),
   KEY `idx_incoming_id` (`incoming_id`),
   KEY `idx_part_number` (`part_number`),
   KEY `idx_used_date` (`used_datetime`),
   KEY `idx_usage_location` (`usage_location`),
   CONSTRAINT `part_usage_ibfk_1` FOREIGN KEY (`incoming_id`) REFERENCES `part_incoming` (`incoming_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='부품 사용(출고) 이력';


CREATE TABLE `part_images` (
   `image_id` int NOT NULL AUTO_INCREMENT COMMENT '이미지 ID',
   `incoming_id` int NOT NULL COMMENT '입고 ID',
   `image_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '이미지 타입 (delivery:택배, part:부품, etc:기타)',
   `image_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '이미지 경로 또는 URL',
   `storage_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'local' COMMENT '저장소 타입 (local, s3)',
   `file_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '원본 파일명',
   `file_size` bigint DEFAULT NULL COMMENT '파일 크기 (bytes)',
   `mime_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'MIME 타입 (image/jpeg, image/png)',
   `display_order` int DEFAULT '0' COMMENT '표시 순서',
   `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '등록일시',
   PRIMARY KEY (`image_id`),
   KEY `idx_incoming_id` (`incoming_id`),
   KEY `idx_image_type` (`image_type`),
   CONSTRAINT `part_images_ibfk_1` FOREIGN KEY (`incoming_id`) REFERENCES `part_incoming` (`incoming_id`) ON DELETE CASCADE
 ) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='부품 사진 (여러 장 가능)';

CREATE TABLE `users` (
   `user_id` int NOT NULL AUTO_INCREMENT,
   `username` varchar(50) NOT NULL,
   `password` varchar(255) NOT NULL,
   `user_role` varchar(20) DEFAULT 'USER',
   `full_name` varchar(100) DEFAULT NULL,
   `email` varchar(100) DEFAULT NULL,
   `is_active` tinyint(1) DEFAULT '1',
   `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
   `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
   PRIMARY KEY (`user_id`),
   UNIQUE KEY `username` (`username`)
 ) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `user_access_logs` (
   `log_id` bigint NOT NULL AUTO_INCREMENT,
   `user_id` int DEFAULT NULL,
   `username` varchar(50) DEFAULT NULL,
   `login_time` datetime DEFAULT CURRENT_TIMESTAMP,
   `logout_time` datetime DEFAULT NULL,
   `logout_ip` varchar(45) DEFAULT NULL,
   `ip_address` varchar(45) DEFAULT NULL,
   `user_agent` text,
   `session_id` varchar(255) DEFAULT NULL,
   PRIMARY KEY (`log_id`),
   KEY `user_id` (`user_id`),
   CONSTRAINT `user_access_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
 ) ENGINE=InnoDB AUTO_INCREMENT=250 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `general_images` (
   `image_id` bigint NOT NULL AUTO_INCREMENT,
   `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '사진 제목',
   `description` text COLLATE utf8mb4_unicode_ci COMMENT '사진 설명',
   `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '파일명 (UUID)',
   `original_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '원본 파일명',
   `file_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '파일 저장 경로',
   `file_size` bigint DEFAULT NULL COMMENT '파일 크기 (bytes)',
   `file_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'image',
   `field_coordinates` text COLLATE utf8mb4_unicode_ci,
   `uploaded_by` int DEFAULT NULL COMMENT '업로드한 사용자 ID',
   `uploaded_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '업로드 일시',
   `is_active` tinyint(1) DEFAULT '1' COMMENT '활성 상태',
   PRIMARY KEY (`image_id`),
   KEY `uploaded_by` (`uploaded_by`),
   KEY `idx_uploaded_at` (`uploaded_at`),
   KEY `idx_title` (`title`),
   KEY `idx_is_active` (`is_active`),
   CONSTRAINT `general_images_ibfk_1` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`user_id`)
 ) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='일반 사진 갤러리';

CREATE TABLE `map_spot` (
   `spot_id` int NOT NULL AUTO_INCREMENT,
   `image_id` bigint NOT NULL COMMENT 'general_images.image_id = 도면 ID',
   `spot_name` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '구역 이름 (A, B, C, D ...)',
   `pos_x` int NOT NULL COMMENT '도면 이미지 내 X 좌표(px)',
   `pos_y` int NOT NULL COMMENT '도면 이미지 내 Y 좌표(px)',
   `radius` int DEFAULT '12' COMMENT '원 크기(px)',
   `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
   `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
   PRIMARY KEY (`spot_id`),
   KEY `image_id` (`image_id`),
   CONSTRAINT `map_spot_ibfk_1` FOREIGN KEY (`image_id`) REFERENCES `general_images` (`image_id`)
 ) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='도면 상의 포인트 좌표';

CREATE TABLE `document_template` (
   `template_id` int NOT NULL AUTO_INCREMENT,
   `template_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '양식명 (예: 견적서, 발주서)',
   `background_image_id` int DEFAULT NULL COMMENT '배경 이미지 ID (general_images 테이블 참조)',
   `table_config` json DEFAULT NULL COMMENT '표 설정: {x, y, width, height, columns: [{name, width}], rowHeight}',
   `fixed_texts` json DEFAULT NULL COMMENT '고정 텍스트들: [{text, x, y, fontSize, fontWeight}]',
   `created_by` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
   `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
   `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
   PRIMARY KEY (`template_id`),
   KEY `idx_template_name` (`template_name`)
 ) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='문서 양식 템플릿';

CREATE TABLE `generated_document` (
   `document_id` int NOT NULL AUTO_INCREMENT,
   `template_id` int NOT NULL,
   `document_name` varchar(200) NOT NULL,
   `table_data` json DEFAULT NULL,
   `generated_by` varchar(50) DEFAULT NULL,
   `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
   PRIMARY KEY (`document_id`),
   KEY `template_id` (`template_id`),
   CONSTRAINT `generated_document_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `document_template` (`template_id`) ON DELETE CASCADE
 ) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `action_audit` (
   `audit_id` bigint NOT NULL AUTO_INCREMENT,
   `entity_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '대상 엔티티 타입 (예: part_incoming, user 등)',
   `entity_id` bigint DEFAULT NULL COMMENT '대상 PK (없으면 NULL)',
   `action` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'CREATE/UPDATE/DELETE/READ 등',
   `summary` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '요약 메시지',
   `changed_fields` json DEFAULT NULL COMMENT '필드 변경 상세 (선택)',
   `performed_by` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '실행자 ID/username',
   `performed_ip` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '요청 IP',
   `user_agent` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'User-Agent',
   `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
   PRIMARY KEY (`audit_id`),
   KEY `idx_action_audit_entity` (`entity_type`,`entity_id`),
   KEY `idx_action_audit_created_at` (`created_at`),
   KEY `idx_action_audit_action` (`action`)
 ) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 회원 정보에 직위와 부서 필드 추가
ALTER TABLE `users` ADD COLUMN `position` varchar(100) DEFAULT NULL COMMENT '직위' AFTER `full_name`;
ALTER TABLE `users` ADD COLUMN `department` varchar(100) DEFAULT NULL COMMENT '부서' AFTER `position`;
