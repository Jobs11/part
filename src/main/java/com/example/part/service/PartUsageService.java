package com.example.part.service;

import java.util.List;

import com.example.part.dto.PartUsageDTO;

public interface PartUsageService {

    // 부품 사용 내역 등록
    void insertPartUsage(PartUsageDTO partUsageDTO);

    // 부품 수정
    void updatePartUsage(PartUsageDTO partUsageDTO);

    // 전체 사용 내역 조회
    List<PartUsageDTO> getAllPartUsage();

    // 특정 부품의 사용 내역 조회
    List<PartUsageDTO> getPartUsageByPartNumber(String partNumber);

    // 특정 사용처의 사용 내역 조회
    List<PartUsageDTO> getPartUsageByLocation(String usageLocation);

    List<PartUsageDTO> getPartUsageDescSorted(String column);

    List<PartUsageDTO> getPartUsageAscSorted(String column);

    void softDeletePartUsage(int id);
}
