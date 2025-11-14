package com.example.part.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.part.dto.PartIncomingDTO;
import com.example.part.mapper.PartIncomingMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class PartIncomingServiceImpl implements PartIncomingService {

    private final PartIncomingMapper partIncomingMapper;
    private final CategoryService categoryService;

    @Override
    @Transactional
    public void registerIncoming(PartIncomingDTO partIncomingDTO) {
        // 1. 같은 카테고리 + 같은 부품명이 있는지 확인
        PartIncomingDTO existing = partIncomingMapper.findByPartNameAndCategory(
                partIncomingDTO.getCategoryId(),
                partIncomingDTO.getPartName());

        String partNumber;

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

        // 2. 환율 계산
        calculateExchangeRate(partIncomingDTO);

        // 3. 입고 등록
        int result = partIncomingMapper.insertIncoming(partIncomingDTO);
        if (result == 0) {
            throw new RuntimeException("입고 등록에 실패했습니다.");
        }

        log.info("입고 등록 완료: 부품번호 {}, 수량 {}", partNumber, partIncomingDTO.getIncomingQuantity());
    }

    @Override
    @Transactional
    public void registerIncomingWithPartNumber(PartIncomingDTO partIncomingDTO) {
        String partNumber;

        // 1. 같은 카테고리 + 같은 부품명이 있는지 확인
        PartIncomingDTO existing = partIncomingMapper.findByPartNameAndCategory(
                partIncomingDTO.getCategoryId(),
                partIncomingDTO.getPartName());

        if (existing != null) {
            // 기존 부품이 있으면 같은 번호 사용
            partNumber = existing.getPartNumber();
            log.info("✅ 기존 부품 발견: {} ({})", existing.getPartName(), partNumber);
        } else {
            // 새 부품이면 번호 생성
            partNumber = categoryService.generatePartNumber(partIncomingDTO.getCategoryId());
            log.info("🆕 신규 부품 번호 생성: {}", partNumber);
        }

        partIncomingDTO.setPartNumber(partNumber);

        // 2. 환율 계산
        calculateExchangeRate(partIncomingDTO);

        // 3. 입고 등록
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
}
