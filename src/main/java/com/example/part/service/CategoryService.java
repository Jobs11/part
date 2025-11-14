package com.example.part.service;

import java.util.List;

import com.example.part.dto.CategoryDTO;

public interface CategoryService {

    // 전체 카테고리 조회
    List<CategoryDTO> getAllCategories();

    // 단일 카테고리 조회
    CategoryDTO getCategoryById(int categoryId);

    // 카테고리 코드로 조회
    CategoryDTO getCategoryByCode(String categoryCode);

    // 카테고리 등록
    void createCategory(CategoryDTO categoryDTO);

    // 카테고리 수정
    void updateCategory(CategoryDTO categoryDTO);

    // 부품번호 자동 생성 (카테고리별)
    String generatePartNumber(int categoryId);

    // 카테고리 비활성화
    void deactivateCategory(int categoryId);

    // 카테고리 삭제
    void deleteCategory(int categoryId);
}
