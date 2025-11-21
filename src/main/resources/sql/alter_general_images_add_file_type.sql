-- general_images 테이블에 file_type 컬럼 추가
ALTER TABLE general_images
ADD COLUMN file_type VARCHAR(20) DEFAULT 'image' AFTER file_size;

-- 기존 데이터는 모두 image로 설정
UPDATE general_images SET file_type = 'image' WHERE file_type IS NULL;
