package com.example.part.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.part.dto.PartUsageDTO;
import com.example.part.mapper.PartUsageMapper;
import com.example.part.mapper.PartsMapper;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class PartUsageServiceImpl implements PartUsageService {

    private final PartUsageMapper partUsageMapper;
    private final PartsMapper partsMapper;

    @Override
    public void insertPartUsage(PartUsageDTO partUsageDTO) {
        // 1. 부품 재고 차감
        int decreaseResult = partsMapper.decreaseQuantity(
                partUsageDTO.getPartNumber(),
                partUsageDTO.getQuantityUsed());

        if (decreaseResult == 0) {
            throw new RuntimeException("재고가 부족하거나 부품번호가 존재하지 않습니다.");
        }

        // 2. 부품 사용 내역 등록
        int insertResult = partUsageMapper.insertPartUsage(partUsageDTO);
        if (insertResult == 0) {
            throw new RuntimeException("부품 사용 내역 등록에 실패했습니다.");
        }
    }

    @Override
    @Transactional
    public void updatePartUsage(PartUsageDTO dto) {
        // 기존 데이터 조회
        PartUsageDTO existing = partUsageMapper.findById(dto.getId());
        if (existing == null)
            throw new RuntimeException("기존 사용 내역을 찾을 수 없습니다.");

        // null 항목은 기존 값 유지
        if (dto.getUsageLocation() == null)
            dto.setUsageLocation(existing.getUsageLocation());
        if (dto.getUsedDate() == null)
            dto.setUsedDate(existing.getUsedDate());
        if (dto.getNote() == null)
            dto.setNote(existing.getNote());
        if (dto.getQuantityUsed() == null || dto.getQuantityUsed() == 0) {
            dto.setQuantityUsed(existing.getQuantityUsed());
        }

        // 재고 조정 로직 그대로 수행
        int currentStock = partsMapper.findByPartNumber(existing.getPartNumber()).getQuantity();
        int adjustedStock = currentStock + existing.getQuantityUsed() - dto.getQuantityUsed();
        if (adjustedStock < 0)
            throw new RuntimeException("수정 후 재고 부족");

        partsMapper.updateQuantityAbsolute(existing.getPartNumber(), adjustedStock);

        // 최종 업데이트
        int result = partUsageMapper.updatePartUsage(dto);
        if (result == 0)
            throw new RuntimeException("사용내역 수정 실패");
    }

    @Override
    @Transactional(readOnly = true)
    public List<PartUsageDTO> getAllPartUsage() {
        return partUsageMapper.selectAllPartUsage();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PartUsageDTO> getPartUsageByPartNumber(String partNumber) {
        return partUsageMapper.selectPartUsageByPartNumber(partNumber);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PartUsageDTO> getPartUsageByLocation(String usageLocation) {
        return partUsageMapper.selectPartUsageByLocation(usageLocation);
    }

    @Override
    public List<PartUsageDTO> getPartUsageDescSorted(String column) {
        return partUsageMapper.getPartUsageOrderByDesc(column);
    }

    @Override
    public List<PartUsageDTO> getPartUsageAscSorted(String column) {
        return partUsageMapper.getPartUsageOrderByAsc(column);
    }

    @Override
    public void softDeletePartUsage(int id) {
        int result = partUsageMapper.softDeletePartUsage(id);
        if (result == 0) {
            throw new RuntimeException("사용 내역을 찾을 수 없거나 비공개 처리에 실패했습니다.");
        }
    }
}
