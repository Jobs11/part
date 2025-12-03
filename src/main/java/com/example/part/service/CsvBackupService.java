package com.example.part.service;

import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.example.part.dto.PartIncomingDTO;
import com.example.part.dto.PartLocationDTO;
import com.example.part.dto.PartUsageDTO;
import com.example.part.mapper.PartIncomingMapper;
import com.example.part.mapper.PartLocationMapper;
import com.example.part.mapper.PartUsageMapper;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CsvBackupService {

    private static final Logger logger = LoggerFactory.getLogger(CsvBackupService.class);

    private final PartIncomingMapper incomingMapper;
    private final PartUsageMapper usageMapper;
    private final PartLocationMapper locationMapper;

    @Value("${file.backup-dir:/var/livewalk/backups/csv}")
    private String backupDir;

    @PostConstruct
    public void init() {
        try {
            Path backupPath = Paths.get(backupDir);
            if (!Files.exists(backupPath)) {
                Files.createDirectories(backupPath);
                logger.info("CSV 백업 디렉토리 생성: {}", backupDir);
            }
        } catch (IOException e) {
            logger.error("CSV 백업 디렉토리 생성 실패: {}", backupDir, e);
            throw new RuntimeException("CSV 백업 디렉토리 생성 실패", e);
        }
    }

    /**
     * 매일 오전 9시에 CSV 백업 실행
     * cron: 초 분 시 일 월 요일
     */
    @Scheduled(cron = "0 0 0 * * *")
    public void dailyBackup() {
        logger.info("=== CSV 자동 백업 시작 ===");

        try {
            backupIncoming();
            backupUsage();
            backupInventory();
            backupLocation();

            logger.info("=== CSV 자동 백업 완료 ===");
        } catch (Exception e) {
            logger.error("CSV 자동 백업 중 오류 발생", e);
        }
    }

    /**
     * 입고목록 백업 - 모든 컬럼 포함
     */
    private void backupIncoming() {
        try {
            List<PartIncomingDTO> dtoList = incomingMapper.selectAllIncoming();
            List<Map<String, Object>> data = dtoList.stream()
                    .map(dto -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("incoming_id", dto.getIncomingId());
                        map.put("part_number", dto.getPartNumber());
                        map.put("category_id", dto.getCategoryId());
                        map.put("category_name", dto.getCategoryName());
                        map.put("part_name", dto.getPartName());
                        map.put("cabinet_location", dto.getCabinetLocation());
                        map.put("map_location", dto.getMapLocation());
                        map.put("description", dto.getDescription());
                        map.put("project_name", dto.getProjectName());
                        map.put("unit", dto.getUnit());
                        map.put("payment_method_id", dto.getPaymentMethodId());
                        map.put("payment_method_name", dto.getPaymentMethodName());
                        map.put("incoming_quantity", dto.getIncomingQuantity());
                        map.put("purchase_price", dto.getPurchasePrice());
                        map.put("currency", dto.getCurrency());
                        map.put("exchange_rate", dto.getExchangeRate());
                        map.put("original_price", dto.getOriginalPrice());
                        map.put("purchase_datetime", dto.getPurchaseDatetime());
                        map.put("supplier", dto.getSupplier());
                        map.put("purchaser", dto.getPurchaser());
                        map.put("invoice_number", dto.getInvoiceNumber());
                        map.put("note", dto.getNote());
                        map.put("created_by", dto.getCreatedBy());
                        map.put("created_at", dto.getCreatedAt());
                        return map;
                    })
                    .collect(Collectors.toList());

            String fileName = generateFileName("입고목록");
            writeCsvFile(fileName, data, new String[] {
                    "입고번호", "부품번호", "카테고리ID", "카테고리명", "부품명", "캐비넷위치", "도면위치",
                    "설명", "프로젝트명", "단위", "결제방법ID", "결제방법명", "입고수량",
                    "구매단가", "통화", "환율", "원화금액", "구매일시", "공급업체", "구매자",
                    "송장번호", "비고", "등록자", "등록일시"
            }, new String[] {
                    "incoming_id", "part_number", "category_id", "category_name", "part_name",
                    "cabinet_location", "map_location", "description", "project_name", "unit",
                    "payment_method_id", "payment_method_name", "incoming_quantity", "purchase_price",
                    "currency", "exchange_rate", "original_price", "purchase_datetime", "supplier",
                    "purchaser", "invoice_number", "note", "created_by", "created_at"
            });
            logger.info("입고목록 백업 완료: {}", fileName);
        } catch (Exception e) {
            logger.error("입고목록 백업 실패", e);
        }
    }

    /**
     * 출고목록 백업 - 모든 컬럼 포함
     */
    private void backupUsage() {
        try {
            List<PartUsageDTO> dtoList = usageMapper.selectAllUsage();
            List<Map<String, Object>> data = dtoList.stream()
                    .map(dto -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("usage_id", dto.getUsageId());
                        map.put("incoming_id", dto.getIncomingId());
                        map.put("part_number", dto.getPartNumber());
                        map.put("part_name", dto.getPartName());
                        map.put("category_name", dto.getCategoryName());
                        map.put("unit", dto.getUnit());
                        map.put("quantity_used", dto.getQuantityUsed());
                        map.put("usage_location", dto.getUsageLocation());
                        map.put("used_datetime", dto.getUsedDatetime());
                        map.put("note", dto.getNote());
                        map.put("created_by", dto.getCreatedBy());
                        map.put("created_at", dto.getCreatedAt());
                        return map;
                    })
                    .collect(Collectors.toList());

            String fileName = generateFileName("출고목록");
            writeCsvFile(fileName, data, new String[] {
                    "출고번호", "입고번호", "부품번호", "부품명", "카테고리", "단위",
                    "출고수량", "사용위치", "사용일시", "비고", "등록자", "등록일시"
            }, new String[] {
                    "usage_id", "incoming_id", "part_number", "part_name", "category_name", "unit",
                    "quantity_used", "usage_location", "used_datetime", "note", "created_by", "created_at"
            });
            logger.info("출고목록 백업 완료: {}", fileName);
        } catch (Exception e) {
            logger.error("출고목록 백업 실패", e);
        }
    }

    /**
     * 재고목록 백업
     */
    private void backupInventory() {
        try {
            List<Map<String, Object>> data = incomingMapper.getCurrentInventory();
            String fileName = generateFileName("재고목록");
            writeCsvFile(fileName, data, new String[] {
                    "부품번호", "부품명", "카테고리", "현재재고", "단위", "총입고",
                    "총출고", "입고횟수"
            }, new String[] {
                    "part_number", "part_name", "category_name", "current_stock", "unit",
                    "total_incoming", "total_used", "incoming_count"
            });
            logger.info("재고목록 백업 완료: {}", fileName);
        } catch (Exception e) {
            logger.error("재고목록 백업 실패", e);
        }
    }

    /**
     * 위치정보 백업
     */
    private void backupLocation() {
        try {
            List<PartLocationDTO> dtoList = locationMapper.selectAllLocations();
            List<Map<String, Object>> data = dtoList.stream()
                    .map(dto -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("location_id", dto.getLocationId());
                        map.put("incoming_id", dto.getIncomingId());
                        map.put("location_code", dto.getLocationCode());
                        map.put("part_number", dto.getPartNumber());
                        map.put("part_name", dto.getPartName());
                        map.put("pos_x", dto.getPosX());
                        map.put("pos_y", dto.getPosY());
                        map.put("note", dto.getNote());
                        map.put("updated_at", dto.getUpdatedAt());
                        return map;
                    })
                    .collect(Collectors.toList());

            String fileName = generateFileName("위치정보");
            writeCsvFile(fileName, data, new String[] {
                    "위치ID", "입고번호", "위치코드", "부품번호", "부품명", "위치X", "위치Y", "비고", "수정일시"
            }, new String[] {
                    "location_id", "incoming_id", "location_code", "part_number", "part_name",
                    "pos_x", "pos_y", "note", "updated_at"
            });
            logger.info("위치정보 백업 완료: {}", fileName);
        } catch (Exception e) {
            logger.error("위치정보 백업 실패", e);
        }
    }

    /**
     * 파일명 생성: [리스트이름]_YYYY-MM-DD_backup.csv
     */
    private String generateFileName(String listName) {
        String date = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        return listName + "_" + date + "_backup.csv";
    }

    /**
     * CSV 파일 작성
     */
    private void writeCsvFile(String fileName, List<Map<String, Object>> data,
            String[] headers, String[] fields) throws IOException {
        Path filePath = Paths.get(backupDir, fileName);

        try (BufferedWriter writer = Files.newBufferedWriter(filePath)) {
            // UTF-8 BOM 추가 (Excel에서 한글 깨짐 방지)
            writer.write('\ufeff');

            // 헤더 작성
            writer.write(String.join(",", headers));
            writer.newLine();

            // 데이터 작성
            for (Map<String, Object> row : data) {
                StringBuilder line = new StringBuilder();
                for (int i = 0; i < fields.length; i++) {
                    if (i > 0) {
                        line.append(",");
                    }
                    Object value = row.get(fields[i]);
                    String cellValue = value != null ? escapeCsv(value.toString()) : "";
                    line.append(cellValue);
                }
                writer.write(line.toString());
                writer.newLine();
            }
        }
    }

    /**
     * CSV 특수문자 이스케이프
     */
    private String escapeCsv(String value) {
        if (value == null) {
            return "";
        }

        // 쉼표, 따옴표, 줄바꿈이 포함되어 있으면 따옴표로 감싸기
        if (value.contains(",") || value.contains("\"") || value.contains("\n") || value.contains("\r")) {
            value = value.replace("\"", "\"\""); // 따옴표 이스케이프
            return "\"" + value + "\"";
        }

        return value;
    }
}
