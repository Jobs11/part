package com.example.part.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.part.dto.PartsDTO;
import com.example.part.mapper.PartsMapper;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class PartsServiceimpl implements PartsService {

    private final PartsMapper partsMapper;

    @Override
    public void insertPart(PartsDTO partsDto) {
        // 1. 기존 부품 존재 여부 확인
        PartsDTO existingPart = partsMapper.findByPartNumber(partsDto.getPartNumber());

        if (existingPart != null) {
            // 2-1. 이미 존재하면 수량만 증가
            int newQuantity = existingPart.getQuantity() + partsDto.getQuantity();
            int result = partsMapper.updateQuantityAbsolute(partsDto.getPartNumber(), newQuantity);

            if (result == 0) {
                throw new RuntimeException("부품 수량 추가에 실패했습니다.");
            }
        } else {
            // 2-2. 존재하지 않으면 새로 등록
            int result = partsMapper.insertPart(partsDto);

            if (result == 0) {
                throw new RuntimeException("부품 등록에 실패했습니다.");
            }
        }
    }

    @Override
    public void updatePart(PartsDTO partsDto) {
        int result = partsMapper.updatePart(partsDto);
        if (result == 0) {
            throw new RuntimeException("부품 수정에 실패했습니다. 존재하지 않는 부품번호입니다.");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<PartsDTO> getLowStockParts(Integer threshold) {
        if (threshold == null || threshold <= 0) {
            threshold = 10; // 기본값 10
        }
        return partsMapper.selectLowStockParts(threshold);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PartsDTO> getAllParts() {
        return partsMapper.selectAllParts();
    }

    @Override
    public List<PartsDTO> getPartsDescSorted(String column) {
        return partsMapper.getPartsOrderByDesc(column);
    }

    @Override
    public List<PartsDTO> getPartsAscSorted(String column) {
        return partsMapper.getPartsOrderByAsc(column);
    }

    @Override
    public void softDeletePart(String partNumber) {
        int result = partsMapper.softDeletePart(partNumber);
        if (result == 0) {
            throw new RuntimeException("부품을 찾을 수 없거나 비공개 처리에 실패했습니다.");
        }
    }

}
