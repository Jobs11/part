package com.example.part.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.example.part.dto.CategoryDTO;
import com.example.part.dto.PartIncomingDTO;
import com.example.part.dto.PartLocationDTO;
import com.example.part.mapper.PartIncomingMapper;

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

    @Override

    @Transactional

    public void registerIncoming(PartIncomingDTO partIncomingDTO) {

        // 1. 카테고리 처리

        if (partIncomingDTO.getCategoryName() != null && !partIncomingDTO.getCategoryName().isEmpty()) {

            // 카테고리 이름이 제공된 경우 - 이름으로 찾거나 생성

            CategoryDTO category = categoryService.findOrCreateCategoryByName(partIncomingDTO.getCategoryName());

            partIncomingDTO.setCategoryId(category.getCategoryId());

            log.info("카테고리 설정: {} (ID: {})", category.getCategoryName(), category.getCategoryId());

        } else if (partIncomingDTO.getCategoryId() == null) {

            throw new RuntimeException("카테고리 정보가 제공되지 않았습니다.");

        }

        // 2. 부품번호 검증 - 사용자가 직접 입력한 부품번호 사용

        String partNumber = partIncomingDTO.getPartNumber();

        if (partNumber == null || partNumber.trim().isEmpty()) {

            throw new RuntimeException("부품번호는 필수 입력 항목입니다.");

        }

        log.info("부품번호: {}", partNumber);

        // 3. 환율 계산

        calculateExchangeRate(partIncomingDTO);

        // 4. 입고 등록

        int result = partIncomingMapper.insertIncoming(partIncomingDTO);

        if (result == 0) {

            throw new RuntimeException("입고 등록에 실패했습니다.");

        }

        // 5. 부품 위치 정보 저장

        String cabinetLoc = partIncomingDTO.getCabinetLocation();

        String mapLoc = partIncomingDTO.getMapLocation();

        String oldLoc = partIncomingDTO.getLocation(); // 이전 방식 호환

        if ((cabinetLoc != null && !cabinetLoc.trim().isEmpty()) ||

                (mapLoc != null && !mapLoc.trim().isEmpty()) ||

                (oldLoc != null && !oldLoc.trim().isEmpty())) {

            savePartLocation(partNumber, partIncomingDTO.getPartName(), cabinetLoc, mapLoc, oldLoc);

        }

        log.info("입고 등록 완료: 부품번호 {}, 수량 {}", partNumber, partIncomingDTO.getIncomingQuantity());

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

    private void savePartLocation(String partNumber, String partName, String cabinetLocation, String mapLocation,
            String oldLocation) {

        PartLocationDTO locationDTO = new PartLocationDTO();

        locationDTO.setPartNumber(partNumber);

        locationDTO.setPartName(partName);

        // ??? ?? ?? (A-1 ?? -> x="A", y="1")

        if (StringUtils.hasText(cabinetLocation)) {

            String normalized = normalizeCabinetLocation(cabinetLocation.trim());

            if (normalized == null) {

                throw new IllegalArgumentException("??? ??? A~AA, 1~32 ??? A-1 ???? ?????. ???: " + cabinetLocation);

            }

            String[] parts = normalized.split("-");

            locationDTO.setPosX(parts[0]);

            locationDTO.setPosY(Integer.parseInt(parts[1]));

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

        // 이미 동일한 부품번호와 이름으로 위치가 등록되어 있는지 확인
        PartLocationDTO existingLocation = partLocationService.getLocationByPartNumber(partNumber);
        if (existingLocation != null &&
            StringUtils.hasText(existingLocation.getPartName()) &&
            existingLocation.getPartName().equals(partName)) {
            log.info("동일한 부품번호({})와 이름({})으로 이미 위치가 등록되어 있어 위치 저장을 건너뜁니다.", partNumber, partName);
            return;
        }

        partLocationService.saveOrUpdate(locationDTO);

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

        // 환율 재계산

        calculateExchangeRate(partIncomingDTO);

        int result = partIncomingMapper.updateIncoming(partIncomingDTO);

        if (result == 0) {

            throw new RuntimeException("입고 정보 수정에 실패했습니다.");

        }

        log.info("입고 정보 수정 완료: ID {}", partIncomingDTO.getIncomingId());

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

            case "purchase_date":

                return "pi.purchase_date";

            case "created_at":

                return "pi.created_at";

            default:

                return column;

        }

    }
}
