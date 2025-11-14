package com.example.part.mapper;

import java.util.List;
import java.util.Map;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.example.part.dto.PartIncomingDTO;

@Mapper
public interface PartIncomingMapper {

    // 입고 등록
    int insertIncoming(PartIncomingDTO partIncomingDTO);

    // 전체 입고 내역 조회
    List<PartIncomingDTO> selectAllIncoming();

    // incoming_id로 단건 조회
    PartIncomingDTO findById(@Param("incomingId") int incomingId);

    // 특정 부품번호로 조회
    List<PartIncomingDTO> findByPartNumber(@Param("partNumber") String partNumber);

    // 부품명으로 검색
    List<PartIncomingDTO> searchByPartName(@Param("partName") String partName);

    // 카테고리별 입고 내역
    List<PartIncomingDTO> selectIncomingByCategory(@Param("categoryId") int categoryId);

    // 부품별 현재 재고 집계
    List<Map<String, Object>> getCurrentInventory();

    // 재고 부족 조회
    List<Map<String, Object>> selectLowStock(@Param("threshold") int threshold);

    // 입고 정보 수정
    int updateIncoming(PartIncomingDTO partIncomingDTO);

    // 정렬 (동적)
    List<PartIncomingDTO> getIncomingOrderBy(@Param("column") String column, @Param("order") String order);

    // 카테고리 + 부품명으로 기존 부품 찾기
    PartIncomingDTO findByPartNameAndCategory(@Param("categoryId") int categoryId,
            @Param("partName") String partName);

    // 검색 + 정렬 (동적)
    List<PartIncomingDTO> searchWithSort(@Param("keyword") String keyword,
            @Param("column") String column,
            @Param("order") String order);
}
