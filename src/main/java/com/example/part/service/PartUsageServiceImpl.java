package com.example.part.service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.part.dto.PartIncomingDTO;
import com.example.part.dto.PartUsageDTO;
import com.example.part.mapper.PartUsageMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class PartUsageServiceImpl implements PartUsageService {

    private final PartUsageMapper partUsageMapper;
    private final PartIncomingService partIncomingService;

    @Override
    @Transactional
    public void registerUsage(PartUsageDTO partUsageDTO) {
        // 1. incoming_id 유효성 검증
        PartIncomingDTO incoming = partIncomingService.getIncomingById(partUsageDTO.getIncomingId());

        // 2. 재고 확인 (현재 재고 계산)
        List<Map<String, Object>> inventory = partIncomingService.getCurrentInventory();
        boolean hasStock = false;
        int currentStock = 0;

        for (Map<String, Object> item : inventory) {
            if (incoming.getPartNumber().equals(item.get("part_number"))) {
                currentStock = ((Number) item.get("current_stock")).intValue();
                if (currentStock >= partUsageDTO.getQuantityUsed()) {
                    hasStock = true;
                }
                break;
            }
        }

        if (!hasStock) {
            throw new RuntimeException(
                    String.format("재고가 부족합니다. (현재 재고: %d, 요청 수량: %d)",
                            currentStock, partUsageDTO.getQuantityUsed()));
        }

        // 3. 출고 등록
        int result = partUsageMapper.insertPartUsage(partUsageDTO);
        if (result == 0) {
            throw new RuntimeException("출고 등록에 실패했습니다.");
        }

        log.info("출고 등록 완료: 부품번호 {}, 수량 {}, 사용처 {}",
                partUsageDTO.getPartNumber(),
                partUsageDTO.getQuantityUsed(),
                partUsageDTO.getUsageLocation());
    }

    @Override
    @Transactional
    public void updateUsage(PartUsageDTO partUsageDTO) {
        // 기존 출고 내역 조회
        PartUsageDTO existing = getUsageById(partUsageDTO.getUsageId());

        // 수량 변경 시 재고 확인
        if (!existing.getQuantityUsed().equals(partUsageDTO.getQuantityUsed())) {
            int difference = partUsageDTO.getQuantityUsed() - existing.getQuantityUsed();

            if (difference > 0) {
                // 수량 증가: 재고 확인 필요
                List<Map<String, Object>> inventory = partIncomingService.getCurrentInventory();
                for (Map<String, Object> item : inventory) {
                    if (existing.getPartNumber().equals(item.get("part_number"))) {
                        int currentStock = ((Number) item.get("current_stock")).intValue();
                        if (currentStock < difference) {
                            throw new RuntimeException("재고가 부족하여 수량을 증가시킬 수 없습니다.");
                        }
                        break;
                    }
                }
            }
        }

        int result = partUsageMapper.updatePartUsage(partUsageDTO);
        if (result == 0) {
            throw new RuntimeException("출고 정보 수정에 실패했습니다.");
        }

        log.info("출고 정보 수정 완료: ID {}", partUsageDTO.getUsageId());
    }

    @Override
    public PartUsageDTO getUsageById(int usageId) {
        PartUsageDTO usage = partUsageMapper.findById(usageId);
        if (usage == null) {
            throw new RuntimeException("출고 내역을 찾을 수 없습니다. ID: " + usageId);
        }
        return usage;
    }

    @Override
    public List<PartUsageDTO> getAllUsage() {
        return partUsageMapper.selectAllUsage();
    }

    @Override
    public List<PartUsageDTO> searchUsage(String keyword) {
        return partUsageMapper.searchUsage(keyword);
    }

    @Override
    public List<PartUsageDTO> getUsageByLocation(String usageLocation) {
        return partUsageMapper.selectUsageByLocation(usageLocation);
    }

    @Override
    public List<PartUsageDTO> getUsageByPartNumber(String partNumber) {
        return partUsageMapper.selectUsageByPartNumber(partNumber);
    }

    @Override
    public List<PartUsageDTO> getUsageByCategory(int categoryId) {
        return partUsageMapper.selectUsageByCategory(categoryId);
    }

    @Override
    public List<PartUsageDTO> getUsageByDateRange(LocalDate startDate, LocalDate endDate) {
        return partUsageMapper.selectUsageByDateRange(startDate, endDate);
    }

    @Override
    public List<PartUsageDTO> getUsageSorted(String column, String order) {
        return partUsageMapper.sortUsage(column, order);
    }

    @Override
    public List<Map<String, Object>> getUsageSummaryByPart() {
        return partUsageMapper.selectUsageSummaryByPart();
    }

    @Override
    public List<PartUsageDTO> searchWithSort(String keyword, String column, String order) {
        return partUsageMapper.searchWithSort(keyword, column, order);
    }
}
