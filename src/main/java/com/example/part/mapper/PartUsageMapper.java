package com.example.part.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.example.part.dto.PartUsageDTO;

@Mapper
public interface PartUsageMapper {

    // 부품 사용 내역 등록
    int insertPartUsage(PartUsageDTO partUsageDTO);

    // 부품 사용 내역 수정 (수량 포함)
    int updatePartUsage(PartUsageDTO partUsageDTO);

    // 전체 사용 내역 조회 (부품 정보 조인)
    List<PartUsageDTO> selectAllPartUsage();

    // 특정 부품의 사용 내역 조회
    List<PartUsageDTO> selectPartUsageByPartNumber(String partNumber);

    // 특정 사용처의 사용 내역 조회
    List<PartUsageDTO> selectPartUsageByLocation(String usageLocation);

    List<PartUsageDTO> getPartUsageOrderByDesc(@Param("column") String column);

    List<PartUsageDTO> getPartUsageOrderByAsc(@Param("column") String column);

    PartUsageDTO findById(Long id);

    int softDeletePartUsage(@Param("id") int id);
}
