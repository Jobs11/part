-- ⚠️ 주의: 이 스크립트는 중복된 입고 데이터를 삭제합니다.
-- 반드시 백업 후 실행하세요!

-- 1단계: 중복 확인 (실행 전 확인용)
SELECT
    part_number,
    purchase_datetime,
    COUNT(*) as count,
    GROUP_CONCAT(incoming_id ORDER BY incoming_id) as incoming_ids
FROM part_incoming
GROUP BY part_number, purchase_datetime
HAVING COUNT(*) > 1;

-- 2단계: 중복 데이터 중 가장 최근 것만 남기고 삭제
-- (part_number + purchase_datetime가 같은 경우, incoming_id가 가장 큰 것만 유지)
DELETE t1 FROM part_incoming t1
INNER JOIN part_incoming t2
WHERE t1.part_number = t2.part_number
  AND t1.purchase_datetime = t2.purchase_datetime
  AND t1.incoming_id < t2.incoming_id;

-- 3단계: 삭제 결과 확인
SELECT
    part_number,
    purchase_datetime,
    COUNT(*) as count
FROM part_incoming
GROUP BY part_number, purchase_datetime
HAVING COUNT(*) > 1;

-- 결과가 0건이면 중복이 모두 제거됨
