-- general_images 테이블에 field_coordinates 컬럼 추가
ALTER TABLE general_images
ADD COLUMN field_coordinates TEXT AFTER file_type;

-- field_coordinates는 JSON 형식으로 템플릿의 필드 좌표 정보를 저장
-- 예: [{"label":"공급자명","x":100,"y":700,"fontSize":10},{"label":"날짜","x":450,"y":700,"fontSize":10}]
