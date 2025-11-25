-- part_incoming 테이블에 project_name 컬럼 추가

ALTER TABLE part_incoming
ADD COLUMN project_name VARCHAR(200) NULL COMMENT '프로젝트명' AFTER description;
