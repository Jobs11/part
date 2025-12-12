package com.example.part.service;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.example.part.dto.CategoryDTO;
import com.example.part.dto.PartIncomingDTO;
import com.example.part.dto.PartLocationDTO;
import com.example.part.mapper.PartIncomingMapper;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j

@Service

@RequiredArgsConstructor

public class PartIncomingServiceImpl implements PartIncomingService {

    private static final Pattern CABINET_LOC_PATTERN = Pattern.compile("^([A-Z]{1,2})-(\\d{1,2})$");

    private final PartIncomingMapper partIncomingMapper;

    private final CategoryService categoryService;

    private final PartLocationService partLocationService;

    private final AuditLogger auditLogger;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override

    @Transactional

    public void registerIncoming(PartIncomingDTO partIncomingDTO) {
        log.info("========== 입고 등록 시작 ==========");
        log.info("받은 데이터: {}", partIncomingDTO);

        try {
            // 1. 카테고리 처리
            log.info("1단계: 카테고리 처리 시작");
            if (partIncomingDTO.getCategoryName() != null && !partIncomingDTO.getCategoryName().isEmpty()) {

                // 카테고리 이름이 제공된 경우 - 이름으로 찾거나 생성
                log.info("카테고리 이름으로 처리: {}", partIncomingDTO.getCategoryName());
                CategoryDTO category = categoryService.findOrCreateCategoryByName(partIncomingDTO.getCategoryName());

                partIncomingDTO.setCategoryId(category.getCategoryId());

                log.info("카테고리 설정: {} (ID: {})", category.getCategoryName(), category.getCategoryId());

            } else if (partIncomingDTO.getCategoryId() == null) {
                log.error("카테고리 정보 없음!");
                throw new RuntimeException("카테고리 정보가 제공되지 않았습니다.");

            } else {
                log.info("카테고리 ID로 처리: {}", partIncomingDTO.getCategoryId());
            }

            // 2. 부품번호 검증 - 사용자가 직접 입력한 부품번호 사용
            log.info("2단계: 부품번호 검증 시작");
            String partNumber = partIncomingDTO.getPartNumber();
            log.info("입력된 부품번호: [{}], 길이: {}", partNumber, partNumber != null ? partNumber.length() : 0);

            if (partNumber == null || partNumber.trim().isEmpty()) {
                log.error("부품번호가 비어있음!");
                throw new RuntimeException("부품번호는 필수 입력 항목입니다.");

            }

            log.info("부품번호 검증 완료: {}", partNumber);

            // 3. 환율 계산
            log.info("3단계: 환율 계산 시작");
            calculateExchangeRate(partIncomingDTO);
            log.info("환율 계산 완료 - 구매금액: {}, 통화: {}", partIncomingDTO.getPurchasePrice(), partIncomingDTO.getCurrency());

            // 4. 입고 등록
            log.info("4단계: DB 입고 등록 시작");
            log.info("DB 저장 전 DTO 상태: partNumber={}, categoryId={}, partName={}, quantity={}",
                    partIncomingDTO.getPartNumber(),
                    partIncomingDTO.getCategoryId(),
                    partIncomingDTO.getPartName(),
                    partIncomingDTO.getIncomingQuantity());

            int result = partIncomingMapper.insertIncoming(partIncomingDTO);
            log.info("DB 입고 등록 결과: {}", result);

            if (result == 0) {
                log.error("DB 입고 등록 실패! result = 0");
                throw new RuntimeException("입고 등록에 실패했습니다.");

            }

            // 5. 부품 위치 정보 저장
            log.info("5단계: 부품 위치 정보 저장 시작");
            String cabinetLoc = partIncomingDTO.getCabinetLocation();

            String mapLoc = partIncomingDTO.getMapLocation();

            String oldLoc = partIncomingDTO.getLocation(); // 이전 방식 호환
            boolean overrideCabinet = Boolean.TRUE.equals(partIncomingDTO.getOverrideCabinet());
            log.info("Location info - cabinet: [{}], map: [{}], legacy: [{}], override: {}", cabinetLoc, mapLoc, oldLoc,
                    overrideCabinet);

            if ((cabinetLoc != null && !cabinetLoc.trim().isEmpty()) ||

                    (mapLoc != null && !mapLoc.trim().isEmpty()) ||

                    (oldLoc != null && !oldLoc.trim().isEmpty())) {

                savePartLocation(partIncomingDTO.getIncomingId(), partNumber, partIncomingDTO.getPartName(),
                        cabinetLoc, mapLoc, oldLoc, overrideCabinet);

            } else {
                log.info("위치 정보 없음 - 위치 저장 건너뜀");
            }

            log.info("입고 등록 완료: 부품번호 {}, 수량 {}", partNumber, partIncomingDTO.getIncomingQuantity());
            log.info("========== 입고 등록 성공 ==========");

        } catch (Exception e) {
            log.error("========== 입고 등록 실패 ==========");
            log.error("에러 타입: {}", e.getClass().getName());
            log.error("에러 메시지: {}", e.getMessage());
            log.error("스택 트레이스:", e);
            throw e;
        }

    }

    @Override

    @Transactional

    public void registerIncomingWithPartNumber(PartIncomingDTO partIncomingDTO) {

        // 부품번호가 이미 세팅되어 있어야 함

        String partNumber = partIncomingDTO.getPartNumber();

        if (partNumber == null || partNumber.isEmpty()) {

            throw new RuntimeException("부품번호가 제공되지 않았습니다.");

        }

        log.info("부품번호로 입고 등록: {}", partNumber);

        // 1. 환율 계산

        calculateExchangeRate(partIncomingDTO);

        // 2. 입고 등록

        int result = partIncomingMapper.insertIncoming(partIncomingDTO);

        if (result == 0) {

            throw new RuntimeException("입고 등록에 실패했습니다.");

        }

        log.info("입고 등록 완료: 부품번호 {}, 수량 {}", partNumber, partIncomingDTO.getIncomingQuantity());

        logAudit("CREATE",
                partIncomingDTO.getIncomingId() != null ? partIncomingDTO.getIncomingId().longValue() : null,
                "part_incoming 등록: " + partNumber,
                null,
                resolveActor(partIncomingDTO));

    }

    /**
     *
     *
     *
     * 환율 계산 (외화 → 원화)
     *
     *
     *
     */

    private void calculateExchangeRate(PartIncomingDTO dto) {

        if (!"KRW".equals(dto.getCurrency()) && dto.getOriginalPrice() != null && dto.getExchangeRate() != null) {

            // 외화인 경우: 원화 환산

            BigDecimal calculatedPrice = dto.getOriginalPrice().multiply(dto.getExchangeRate());

            dto.setPurchasePrice(calculatedPrice);

            log.info("환율 계산: {} {} x {} = {} KRW",

                    dto.getOriginalPrice(), dto.getCurrency(), dto.getExchangeRate(), calculatedPrice);

        } else {

            // KRW인 경우

            if (dto.getPurchasePrice() != null) {

                dto.setOriginalPrice(dto.getPurchasePrice());

                dto.setExchangeRate(BigDecimal.ONE);

            }

        }

    }

    /**
     *
     *
     *
     * 부품 위치 정보 저장
     *
     *
     *
     */

    private String normalizeCabinetLocation(String value) {

        if (!org.springframework.util.StringUtils.hasText(value)) {

            return null;

        }

        String normalized = value.trim().toUpperCase();

        // A2 같은 입력을 A-2로 보정

        if (normalized.matches("^[A-Z]\\d+$")) {

            normalized = normalized.charAt(0) + "-" + normalized.substring(1);

        }

        java.util.regex.Matcher matcher = CABINET_LOC_PATTERN.matcher(normalized);

        if (!matcher.matches()) {

            return null;

        }

        String col = matcher.group(1);

        int row = Integer.parseInt(matcher.group(2));

        // 허용 범위: 열 A~AA, 행 1~32

        if (col.length() == 0 || col.length() > 2 || row < 1 || row > 32) {

            return null;

        }

        return normalized;

    }

    private void savePartLocation(Integer incomingId, String partNumber, String partName, String cabinetLocation,
            String mapLocation, String oldLocation, boolean overrideCabinet) {

        PartLocationDTO locationDTO = new PartLocationDTO();

        locationDTO.setIncomingId(incomingId); // FK 설정
        locationDTO.setPartNumber(partNumber);
        locationDTO.setPartName(partName);

        // ??? ?? ?? (A-1 ?? -> x="A", y="1")

        if (StringUtils.hasText(cabinetLocation)) {

            String normalized = normalizeCabinetLocation(cabinetLocation.trim());

            if (normalized == null) {

                throw new IllegalArgumentException("??? ??? A~AA, 1~32 ??? A-1 ???? ?????. ???: " + cabinetLocation);

            }

            String[] parts = normalized.split("-");

            String posX = parts[0];
            Integer posY = Integer.parseInt(parts[1]);

            // 캐비넷 중복 허용 - 체크 로직 비활성화
            // PartLocationDTO occupied = partLocationService.getLocationByCabinet(posX, posY);
            // if (occupied != null && !partNumber.equals(occupied.getPartNumber())) {
            //     if (!overrideCabinet) {
            //         throw new IllegalArgumentException(
            //                 String.format("캐비닛 위치 %s-%s는 이미 다른 부품 '%s' (%s)이 사용 중입니다.",
            //                         posX, posY, occupied.getPartNumber(), occupied.getPartName()));
            //     }
            //     log.warn("캐비닛 위치 {}-{} 기존 데이터(부품 {})를 덮어쓰기 합니다.", posX, posY, occupied.getPartNumber());
            //     if (StringUtils.hasText(occupied.getLocationCode())) {
            //         partLocationService.deleteByCode(occupied.getLocationCode());
            //     }
            // }

            locationDTO.setPosX(posX);

            locationDTO.setPosY(posY);

        }

        // ?? ?? (8-A ??)

        if (StringUtils.hasText(mapLocation)) {

            locationDTO.setLocationCode(mapLocation.trim());

        } else if (StringUtils.hasText(oldLocation)) {

            // ?? ?? ??

            locationDTO.setLocationCode(oldLocation.trim());

        }

        // location_code 또는 posX/posY 중 하나라도 있으면 저장
        if (!StringUtils.hasText(locationDTO.getLocationCode()) &&
                (locationDTO.getPosX() == null || locationDTO.getPosY() == null)) {
            log.warn("위치 정보가 없어 위치 저장을 건너뜁니다. partNumber={}, cabinet={}, map={}", partNumber, cabinetLocation,
                    mapLocation);
            return;
        }

        // 🔥 입고 등록 시에는 INSERT만 수행
        partLocationService.insertByIncomingId(locationDTO);

        log.info("부품 위치 저장 완료: {} -> 캐비넷:{}, 도면:{}", partNumber, cabinetLocation, mapLocation);

    }

    @Override

    public List<PartIncomingDTO> getAllIncoming() {

        return partIncomingMapper.selectAllIncoming();

    }

    @Override

    public PartIncomingDTO getIncomingById(int incomingId) {

        PartIncomingDTO incoming = partIncomingMapper.findById(incomingId);

        if (incoming == null) {

            throw new RuntimeException("입고 내역을 찾을 수 없습니다. ID: " + incomingId);

        }

        return incoming;

    }

    @Override

    public List<PartIncomingDTO> getIncomingByPartNumber(String partNumber) {

        return partIncomingMapper.findByPartNumber(partNumber);

    }

    @Override

    public List<PartIncomingDTO> searchByPartName(String partName) {

        return partIncomingMapper.searchByPartName(partName);

    }

    @Override

    public List<PartIncomingDTO> getIncomingByCategory(int categoryId) {

        return partIncomingMapper.selectIncomingByCategory(categoryId);

    }

    @Override

    public List<Map<String, Object>> getCurrentInventory() {

        return partIncomingMapper.getCurrentInventory();

    }

    @Override

    public List<Map<String, Object>> searchInventoryAdvanced(Map<String, Object> params) {

        return partIncomingMapper.searchInventoryAdvanced(params);

    }

    @Override

    public List<Map<String, Object>> getLowStock(int threshold) {

        return partIncomingMapper.selectLowStock(threshold);

    }

    @Override

    @Transactional

    public void updateIncoming(PartIncomingDTO partIncomingDTO) {

        PartIncomingDTO before = partIncomingMapper.findById(partIncomingDTO.getIncomingId());

        // ??? ????

        calculateExchangeRate(partIncomingDTO);

        int result = partIncomingMapper.updateIncoming(partIncomingDTO);

        if (result == 0) {

            throw new RuntimeException("??? ???? ?????? ??????????.");

        }

        log.info("??? ???? ???? ???: ID {}", partIncomingDTO.getIncomingId());

        // 🔥 부품번호 또는 부품명이 변경되었으면 part_location도 업데이트
        if (!before.getPartNumber().equals(partIncomingDTO.getPartNumber()) ||
                !before.getPartName().equals(partIncomingDTO.getPartName())) {
            updatePartLocationInfo(partIncomingDTO.getIncomingId(),
                    partIncomingDTO.getPartNumber(),
                    partIncomingDTO.getPartName());
        }

        PartIncomingDTO after = partIncomingMapper.findById(partIncomingDTO.getIncomingId());
        String changedFieldsJson = buildChangedFields(before, after);

        // 변경 사항이 있을 때만 감사 로그 적재 (빈 수정 요청 시 중복 로그 방지)
        if (changedFieldsJson != null) {
            logAudit("UPDATE",
                    partIncomingDTO.getIncomingId() != null ? partIncomingDTO.getIncomingId().longValue() : null,
                    "part_incoming 수정: " + partIncomingDTO.getPartNumber(),
                    changedFieldsJson,
                    resolveActor(partIncomingDTO));
        }

    }

    @Override

    public List<PartIncomingDTO> getIncomingSorted(String column, String order) {

        return partIncomingMapper.getIncomingOrderBy(column, order);

    }

    @Override

    public List<PartIncomingDTO> searchWithSort(String keyword, String column, String order) {

        return partIncomingMapper.searchWithSort(keyword, column, order);

    }

    public List<PartIncomingDTO> searchAdvanced(Map<String, Object> params) {

        // 컬럼명 매핑 (테이블 alias 추가)

        if (params.get("column") != null && !params.get("column").toString().isEmpty()) {

            String column = params.get("column").toString();

            params.put("column", mapColumnName(column));

        }

        return partIncomingMapper.searchAdvanced(params);

    }

    private String mapColumnName(String column) {

        switch (column) {

            case "category_name":

                return "c.category_name";

            case "part_number":

                return "pi.part_number";

            case "part_name":

                return "pi.part_name";

            case "description":

                return "pi.description";

            case "project_name":

                return "pi.project_name";

            case "note":

                return "pi.note";

            case "payment_method_name":

                return "pm.category_name";

            case "incoming_quantity":

                return "pi.incoming_quantity";

            case "purchase_price":

                return "pi.purchase_price";

            case "purchase_datetime":

                return "pi.purchase_datetime";

            case "supplier":

                return "pi.supplier";

            case "purchaser":

                return "pi.purchaser";

            case "created_at":

                return "pi.created_at";

            default:

                return column;

        }

    }

    private void logAudit(String action, Long entityId, String summary, String changedFields, String performedBy) {
        auditLogger.log("part_incoming", entityId, action, summary, changedFields, performedBy);
    }

    private String buildChangedFields(PartIncomingDTO before, PartIncomingDTO after) {
        if (before == null || after == null) {
            return null;
        }

        Map<String, Map<String, Object>> diff = new LinkedHashMap<>();

        compare(diff, "partNumber", before.getPartNumber(), after.getPartNumber());
        compare(diff, "categoryId", before.getCategoryId(), after.getCategoryId());
        compare(diff, "partName", before.getPartName(), after.getPartName());
        compare(diff, "description", before.getDescription(), after.getDescription());
        compare(diff, "projectName", before.getProjectName(), after.getProjectName());
        compare(diff, "unit", before.getUnit(), after.getUnit());
        compare(diff, "paymentMethodId", before.getPaymentMethodId(), after.getPaymentMethodId());
        compare(diff, "cabinetLocation", before.getCabinetLocation(), after.getCabinetLocation());
        compare(diff, "mapLocation", before.getMapLocation(), after.getMapLocation());
        compare(diff, "location", before.getLocation(), after.getLocation());
        compare(diff, "overrideCabinet", before.getOverrideCabinet(), after.getOverrideCabinet());
        compare(diff, "incomingQuantity", before.getIncomingQuantity(), after.getIncomingQuantity());
        compare(diff, "purchasePrice", before.getPurchasePrice(), after.getPurchasePrice());
        compare(diff, "currency", before.getCurrency(), after.getCurrency());
        compare(diff, "exchangeRate", before.getExchangeRate(), after.getExchangeRate());
        compare(diff, "originalPrice", before.getOriginalPrice(), after.getOriginalPrice());
        compare(diff, "purchaseDatetime", before.getPurchaseDatetime(), after.getPurchaseDatetime());
        compare(diff, "supplier", before.getSupplier(), after.getSupplier());
        compare(diff, "purchaser", before.getPurchaser(), after.getPurchaser());
        compare(diff, "invoiceNumber", before.getInvoiceNumber(), after.getInvoiceNumber());
        compare(diff, "note", before.getNote(), after.getNote());

        if (diff.isEmpty()) {
            return null;
        }

        try {
            return objectMapper.writeValueAsString(diff);
        } catch (Exception e) {
            log.warn("changed_fields 직렬화 실패: {}", e.getMessage(), e);
            return null;
        }
    }

    private void compare(Map<String, Map<String, Object>> diff, String field, Object before, Object after) {
        if (before == null && after == null) {
            return;
        }
        if (before != null && before.equals(after)) {
            return;
        }
        Map<String, Object> changes = new LinkedHashMap<>();
        changes.put("변경전", before);
        changes.put("변경후", after);
        // 필드명을 한글로 변환
        String koreanFieldName = auditLogger.translateFieldName("part_incoming", field);
        diff.put(koreanFieldName, changes);
    }

    private String resolveActor(PartIncomingDTO dto) {
        // 1) 명시 값 우선
        if (StringUtils.hasText(dto.getCreatedBy())) {
            return dto.getCreatedBy();
        }
        // 2) 현재 인증 사용자
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getName() != null) {
                return auth.getName();
            }
        } catch (Exception ignored) {
        }
        // 3) AuditLogger fallback
        return auditLogger.currentUserOrSystem();
    }

    /**
     * 입고 정보 수정 시 part_location 테이블의 부품번호/부품명도 함께 업데이트
     */
    private void updatePartLocationInfo(Integer incomingId, String newPartNumber, String newPartName) {
        try {
            // incoming_id로 위치 정보 조회
            PartLocationDTO location = partLocationService.getLocationByIncomingId(incomingId);

            if (location != null) {
                // 부품번호와 부품명 업데이트
                location.setPartNumber(newPartNumber);
                location.setPartName(newPartName);
                // incoming_id는 유지
                location.setIncomingId(incomingId);

                // incoming_id 기준으로 업데이트
                partLocationService.updateByIncomingId(location);
                log.info("part_location 업데이트 완료: incomingId={}, partNumber={}, partName={}",
                        incomingId, newPartNumber, newPartName);
            } else {
                log.info("해당 입고ID에 연결된 위치 정보가 없습니다: incomingId={}", incomingId);
            }
        } catch (Exception e) {
            log.warn("part_location 업데이트 중 오류 발생: incomingId={}, 오류={}", incomingId, e.getMessage());
        }
    }
}
