-- Bambu PLA Basic Black 중복 데이터 확인 및 제거

-- 1단계: 해당 부품의 모든 입고 내역 확인
SELECT
    incoming_id,
    part_number,
    part_name,
    incoming_quantity,
    purchase_datetime,
    created_at,
    created_by
FROM part_incoming
WHERE part_number = 'Bambu PLA Basic Black'
ORDER BY incoming_id;

-- 2단계: 중복 데이터 확인 (같은 구매일자)
SELECT
    part_number,
    purchase_datetime,
    COUNT(*) as count,
    GROUP_CONCAT(incoming_id ORDER BY incoming_id) as incoming_ids,
    GROUP_CONCAT(incoming_quantity ORDER BY incoming_id) as quantities
FROM part_incoming
WHERE part_number = 'Bambu PLA Basic Black'
GROUP BY part_number, purchase_datetime
HAVING COUNT(*) > 1;

-- 3단계: 중복 데이터 삭제 (incoming_id가 작은 것 삭제, 큰 것만 유지)
-- ⚠️ 주의: 아래 주석을 제거하고 실행하면 실제로 삭제됩니다!
/*
DELETE t1 FROM part_incoming t1
INNER JOIN part_incoming t2
WHERE t1.part_number = 'Bambu PLA Basic Black'
  AND t1.part_number = t2.part_number
  AND t1.purchase_datetime = t2.purchase_datetime
  AND t1.incoming_id < t2.incoming_id;
*/

-- 4단계: 삭제 후 확인
SELECT
    incoming_id,
    part_number,
    part_name,
    incoming_quantity,
    purchase_datetime,
    created_at
FROM part_incoming
WHERE part_number = 'Bambu PLA Basic Black'
ORDER BY incoming_id;

-- 5단계: 재고 계산 확인
SELECT
    pi.part_number,
    SUM(pi.incoming_quantity) AS total_incoming,
    COALESCE(SUM(pu.quantity_used), 0) AS total_used,
    (SUM(pi.incoming_quantity) - COALESCE(SUM(pu.quantity_used), 0)) AS current_stock
FROM part_incoming pi
LEFT JOIN part_usage pu ON pi.incoming_id = pu.incoming_id
WHERE pi.part_number = 'Bambu PLA Basic Black'
GROUP BY pi.part_number;
