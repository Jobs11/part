-- general_images 테이블에 field_coordinates 컬럼 추가
ALTER TABLE general_images
ADD COLUMN field_coordinates JSON COMMENT '양식 필드 설정 (JSON 배열)';

-- 기존 데이터에 NULL 허용
-- JSON 예시:
-- [
--   {"label":"공급자명","x":100,"y":700,"width":200,"height":30,"fontSize":14,"type":"text"},
--   {"label":"날짜","x":350,"y":700,"width":150,"height":30,"fontSize":14,"type":"text"},
--   {"label":"품목표","x":50,"y":500,"width":500,"height":200,"fontSize":10,"type":"table","columns":3}
-- ]
