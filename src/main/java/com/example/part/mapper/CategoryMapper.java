package com.example.part.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.example.part.dto.CategoryDTO;

@Mapper
public interface CategoryMapper {

    // 전체 카테고리 조회
    List<CategoryDTO> selectAllCategories();

    // 단일 카테고리 조회
    CategoryDTO findById(@Param("categoryId") int categoryId);

    // 카테고리 코드로 조회
    CategoryDTO findByCode(@Param("categoryCode") String categoryCode);

    // 카테고리 이름으로 조회
    CategoryDTO findByName(@Param("categoryName") String categoryName);

    // 카테고리 등록
    int insertCategory(CategoryDTO categoryDTO);

    // 카테고리 정보 수정
    int updateCategory(CategoryDTO categoryDTO);

    // 부품번호 자동 발급용: last_number 조회
    Integer getLastNumber(@Param("categoryId") int categoryId);

    // 부품번호 자동 발급용: last_number 증가
    int updateLastNumber(@Param("categoryId") int categoryId, @Param("lastNumber") int lastNumber);

    // 부품번호 자동 발급용: last_number 원자적 증가
    int incrementAndGetLastNumber(@Param("categoryId") int categoryId);

    // 부품번호 자동 발급용: 증가 후 last_number 조회 (LAST_INSERT_ID 사용)
    int getLastNumberAfterIncrement();

    // 카테고리 비활성화
    int deactivateCategory(@Param("categoryId") int categoryId);

    // 카테고리 삭제
    int deleteCategory(@Param("categoryId") int categoryId);
}
