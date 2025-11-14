package com.example.part.mapper;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.example.part.dto.PartUsageDTO;

@Mapper
public interface PartUsageMapper {

    // 출고(사용) 등록
    int insertPartUsage(PartUsageDTO partUsageDTO);

    // 출고 수정
    int updatePartUsage(PartUsageDTO partUsageDTO);

    // usage_id로 단건 조회
    PartUsageDTO findById(@Param("usageId") int usageId);

    // 전체 사용 내역
    List<PartUsageDTO> selectAllUsage();

    // 검색 기능 (부품명, 사용처, 부품번호 동시 검색)
    List<PartUsageDTO> searchUsage(@Param("keyword") String keyword);

    // 사용처별 조회
    List<PartUsageDTO> selectUsageByLocation(@Param("usageLocation") String usageLocation);

    // 부품번호별 조회
    List<PartUsageDTO> selectUsageByPartNumber(@Param("partNumber") String partNumber);

    // 카테고리별 조회
    List<PartUsageDTO> selectUsageByCategory(@Param("categoryId") int categoryId);

    // 기간별 조회
    List<PartUsageDTO> selectUsageByDateRange(@Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    // 정렬 (동적)
    List<PartUsageDTO> sortUsage(@Param("column") String column, @Param("order") String order);

    // 부품별 사용 합계 (통계용)
    List<Map<String, Object>> selectUsageSummaryByPart();

    // 검색 + 정렬 (동적)
    List<PartUsageDTO> searchWithSort(@Param("keyword") String keyword,
            @Param("column") String column,
            @Param("order") String order);
}
