package com.example.part.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

        // 2. 부품번호 처리
        String partNumber = partIncomingDTO.getPartNumber();

        if (partNumber == null || partNumber.isEmpty()) {
            // 부품번호가 제공되지 않은 경우 - 같은 카테고리 + 같은 부품명이 있는지 확인
            PartIncomingDTO existing = partIncomingMapper.findByPartNameAndCategory(
                    partIncomingDTO.getCategoryId(),
                    partIncomingDTO.getPartName());

            if (existing != null) {
                // 기존 부품이 있으면 같은 번호 사용
                partNumber = existing.getPartNumber();
                log.info("기존 부품 발견: {} ({})", existing.getPartName(), partNumber);
            } else {
                // 새 부품이면 번호 생성
                partNumber = categoryService.generatePartNumber(partIncomingDTO.getCategoryId());
                log.info("신규 부품 번호 생성: {}", partNumber);
            }
            partIncomingDTO.setPartNumber(partNumber);
        } else {
            log.info("부품번호 직접 제공됨: {}", partNumber);
        }

        // 3. 환율 계산
        calculateExchangeRate(partIncomingDTO);

        // 4. 입고 등록
        int result = partIncomingMapper.insertIncoming(partIncomingDTO);
        if (result == 0) {
            throw new RuntimeException("입고 등록에 실패했습니다.");
        }

        // 5. 부품 위치 정보 저장 (있는 경우)
        if (partIncomingDTO.getLocation() != null && !partIncomingDTO.getLocation().trim().isEmpty()) {
            savePartLocation(partNumber, partIncomingDTO.getPartName(), partIncomingDTO.getLocation());
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
     * 환율 계산 (외화 → 원화)
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
     * 부품 위치 정보 저장
     */
    private void savePartLocation(String partNumber, String partName, String locationCode) {
        try {
            PartLocationDTO locationDTO = new PartLocationDTO();
            locationDTO.setLocationCode(locationCode);
            locationDTO.setPartNumber(partNumber);
            locationDTO.setPartName(partName);

            // locationCode를 파싱하여 posX, posY 분리 (예: "A-1" -> posX="A", posY=1)
            if (locationCode.contains("-")) {
                String[] parts = locationCode.split("-");
                if (parts.length == 2) {
                    locationDTO.setPosX(parts[0].trim());
                    try {
                        locationDTO.setPosY(Integer.parseInt(parts[1].trim()));
                    } catch (NumberFormatException e) {
                        log.warn("위치 코드의 숫자 부분 파싱 실패: {}", parts[1]);
                    }
                }
            }

            partLocationService.saveOrUpdate(locationDTO);
            log.info("부품 위치 저장 완료: {} -> {}", partNumber, locationCode);
        } catch (Exception e) {
            log.error("부품 위치 저장 실패: {} -> {}", partNumber, locationCode, e);
            // 위치 저장 실패는 입고 등록을 막지 않음
        }
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
            case "note":
                return "pi.note";
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
