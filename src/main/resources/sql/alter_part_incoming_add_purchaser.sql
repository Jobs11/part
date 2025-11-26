-- 구매업체 컬럼 추가
ALTER TABLE part_incoming
ADD COLUMN purchaser VARCHAR(100) COMMENT '구매업체' AFTER supplier;
