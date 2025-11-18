package com.example.part.service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import com.example.part.dto.PartUsageDTO;

public interface PartUsageService {

    // 출고 등록
    void registerUsage(PartUsageDTO partUsageDTO);

    // 출고 수정
    void updateUsage(PartUsageDTO partUsageDTO);

    // 단건 조회
    PartUsageDTO getUsageById(int usageId);

    // 전체 사용 내역
    List<PartUsageDTO> getAllUsage();

    // 검색 (부품명, 사용처, 부품번호)
    List<PartUsageDTO> searchUsage(String keyword);

    // 사용처별 조회
    List<PartUsageDTO> getUsageByLocation(String usageLocation);

    // 부품번호별 조회
    List<PartUsageDTO> getUsageByPartNumber(String partNumber);

    // 카테고리별 조회
    List<PartUsageDTO> getUsageByCategory(int categoryId);

    // 기간별 조회
    List<PartUsageDTO> getUsageByDateRange(LocalDate startDate, LocalDate endDate);

    // 정렬 조회
    List<PartUsageDTO> getUsageSorted(String column, String order);

    // 부품별 사용 합계
    List<Map<String, Object>> getUsageSummaryByPart();

    // 검색 정렬 조회
    List<PartUsageDTO> searchWithSort(String keyword, String column, String order);

    // 고급 검??
    List<PartUsageDTO> searchAdvanced(Map<String, Object> params);
}
