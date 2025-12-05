-- 중복된 입고 데이터 확인 (같은 부품번호 + 구매일자)
SELECT
    part_number,
    purchase_datetime,
    COUNT(*) as count,
    GROUP_CONCAT(incoming_id) as incoming_ids,
    SUM(incoming_quantity) as total_quantity
FROM part_incoming
GROUP BY part_number, purchase_datetime
HAVING COUNT(*) > 1
ORDER BY count DESC, part_number;

-- 특정 부품번호의 모든 입고 내역 확인
-- SELECT * FROM part_incoming WHERE part_number = 'YOUR_PART_NUMBER' ORDER BY purchase_datetime, incoming_id;
