package com.example.part.service;

import java.util.List;

import com.example.part.dto.CategoryDTO;

public interface CategoryService {

    // 전체 카테고리 조회
    List<CategoryDTO> getAllCategories();

    // 관리용 전체 카테고리 조회 (필터 없음)
    List<CategoryDTO> getAllCategoriesForManagement();

    // 단일 카테고리 조회
    CategoryDTO getCategoryById(int categoryId);

    // description으로 카테고리 조회
    List<CategoryDTO> getCategoriesByDescription(String description);

    // 카테고리 이름으로 조회 또는 생성
    CategoryDTO findOrCreateCategoryByName(String categoryName);

    // 카테고리 등록
    void createCategory(CategoryDTO categoryDTO);

    // 카테고리 수정
    void updateCategory(CategoryDTO categoryDTO);

    // 카테고리 비활성화
    void deactivateCategory(int categoryId);

    // 카테고리 삭제
    void deleteCategory(int categoryId);
}
