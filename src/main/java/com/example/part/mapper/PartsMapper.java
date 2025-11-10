package com.example.part.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.example.part.dto.PartsDTO;

@Mapper
public interface PartsMapper {

    // 부품 입력
    int insertPart(PartsDTO partsDto);

    // 부품 수정 (수량 포함)
    int updatePart(PartsDTO partsDto);

    // 수량이 10개 이하인 부품 리스트 조회
    List<PartsDTO> selectLowStockParts(@Param("threshold") int threshold);

    // 전체 부품 리스트 조회
    List<PartsDTO> selectAllParts();

    // 부품 재고 차감
    int decreaseQuantity(@Param("partNumber") String partNumber, @Param("quantity") int quantity);

    // 부품 재고 증가
    int increaseQuantity(@Param("partNumber") String partNumber, @Param("quantity") int quantity);

    List<PartsDTO> getPartsOrderByDesc(@Param("column") String column);

    List<PartsDTO> getPartsOrderByAsc(@Param("column") String column);

    PartsDTO findByPartNumber(String partNumber);

    int updateQuantityAbsolute(@Param("partNumber") String partNumber,
            @Param("quantity") int quantity);

    int softDeletePart(@Param("partNumber") String partNumber);
}
