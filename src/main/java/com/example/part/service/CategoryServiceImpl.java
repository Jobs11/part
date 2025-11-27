package com.example.part.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.part.dto.CategoryDTO;
import com.example.part.mapper.CategoryMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class CategoryServiceImpl implements CategoryService {

    private final CategoryMapper categoryMapper;
    private final AuditLogger auditLogger;

    // last_number 동기화 로직 제거됨 - 부품번호가 더 이상 카테고리별로 생성되지 않음

    @Override
    public List<CategoryDTO> getAllCategories() {
        return categoryMapper.selectAllCategories();
    }

    @Override
    public List<CategoryDTO> getAllCategoriesForManagement() {
        return categoryMapper.selectAllCategoriesForManagement();
    }

    @Override
    public CategoryDTO getCategoryById(int categoryId) {
        CategoryDTO category = categoryMapper.findById(categoryId);
        if (category == null) {
            throw new RuntimeException("카테고리를 찾을 수 없습니다. ID: " + categoryId);
        }
        return category;
    }

    @Override
    public List<CategoryDTO> getCategoriesByDescription(String description) {
        return categoryMapper.findByDescription(description);
    }

    // getCategoryByCode 메서드 제거됨 - 더 이상 카테고리 코드를 사용하지 않음

    @Override
    @Transactional
    public CategoryDTO findOrCreateCategoryByName(String categoryName) {
        // 1. 이름으로 카테고리 조회
        CategoryDTO category = categoryMapper.findByName(categoryName);

        if (category != null) {
            return category;
        }

        // 2. 없으면 새로 생성
        CategoryDTO newCategory = new CategoryDTO();
        newCategory.setCategoryName(categoryName);
        newCategory.setDescription("자동 생성된 카테고리");

        categoryMapper.insertCategory(newCategory);
        log.info("새 카테고리 자동 생성: {}", categoryName);

        // 생성된 카테고리 반환
        return categoryMapper.findByName(categoryName);
    }

    @Override
    @Transactional
    public void createCategory(CategoryDTO categoryDTO) {
        int result = categoryMapper.insertCategory(categoryDTO);
        if (result == 0) {
            throw new RuntimeException("카테고리 등록에 실패했습니다.");
        }
        log.info("카테고리 등록 완료: {}", categoryDTO.getCategoryName());

        auditLogger.log("category",
                categoryDTO.getCategoryId() != null ? categoryDTO.getCategoryId().longValue() : null,
                "CREATE",
                "category 등록: " + categoryDTO.getCategoryName(),
                null,
                null);
    }

    @Override
    @Transactional
    public void updateCategory(CategoryDTO categoryDTO) {
        int result = categoryMapper.updateCategory(categoryDTO);
        if (result == 0) {
            throw new RuntimeException("카테고리 수정에 실패했습니다.");
        }
        log.info("카테고리 수정 완료: ID {}", categoryDTO.getCategoryId());

        auditLogger.log("category",
                categoryDTO.getCategoryId() != null ? categoryDTO.getCategoryId().longValue() : null,
                "UPDATE",
                "category 수정: " + categoryDTO.getCategoryName(),
                null,
                null);
    }

    // generatePartNumber 메서드 제거됨 - 부품번호를 사용자가 직접 입력함

    @Override
    @Transactional
    public void deactivateCategory(int categoryId) {
        int result = categoryMapper.deactivateCategory(categoryId);
        if (result == 0) {
            throw new RuntimeException("카테고리 비활성화에 실패했습니다.");
        }
        log.info("카테고리 비활성화 완료: ID {}", categoryId);

        auditLogger.log("category",
                (long) categoryId,
                "UPDATE",
                "category 비활성화: " + categoryId,
                null,
                null);
    }

    @Override
    @Transactional
    public void deleteCategory(int categoryId) {
        int result = categoryMapper.deleteCategory(categoryId);
        if (result == 0) {
            throw new RuntimeException("카테고리 삭제에 실패했습니다.");
        }
        log.info("카테고리 삭제 완료: ID {}", categoryId);

        auditLogger.log("category",
                (long) categoryId,
                "DELETE",
                "category 삭제: " + categoryId,
                null,
                null);
    }
}
