-- 모든 부품의 중복 데이터 확인

-- 현재 재고와 실제 입고 횟수 비교
SELECT
    pi.part_number,
    pi.part_name,
    COUNT(DISTINCT pi.incoming_id) as incoming_count,
    SUM(pi.incoming_quantity) as total_incoming,
    COALESCE(SUM(pu.quantity_used), 0) as total_used,
    (SUM(pi.incoming_quantity) - COALESCE(SUM(pu.quantity_used), 0)) as current_stock
FROM part_incoming pi
LEFT JOIN part_usage pu ON pi.incoming_id = pu.incoming_id
GROUP BY pi.part_number, pi.part_name
ORDER BY incoming_count DESC, part_number;

-- 같은 구매일자로 중복된 데이터 찾기
SELECT
    part_number,
    part_name,
    purchase_datetime,
    COUNT(*) as duplicate_count,
    GROUP_CONCAT(incoming_id ORDER BY incoming_id) as incoming_ids,
    GROUP_CONCAT(incoming_quantity ORDER BY incoming_id) as quantities,
    GROUP_CONCAT(created_at ORDER BY incoming_id) as created_dates
FROM part_incoming
GROUP BY part_number, part_name, purchase_datetime
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, part_number;

-- 모든 중복 데이터 일괄 삭제 (주의: 주석 제거 후 실행)
-- ⚠️ 반드시 백업 후 실행하세요!
/*
DELETE t1 FROM part_incoming t1
INNER JOIN part_incoming t2
WHERE t1.part_number = t2.part_number
  AND t1.purchase_datetime = t2.purchase_datetime
  AND t1.incoming_id < t2.incoming_id;
*/
