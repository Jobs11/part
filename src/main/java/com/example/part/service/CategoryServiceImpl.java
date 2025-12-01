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
        // 중복 체크: 같은 이름과 설명을 가진 카테고리가 이미 있는지 확인
        CategoryDTO existingCategory = categoryMapper.findByNameAndDescription(
                categoryDTO.getCategoryName(),
                categoryDTO.getDescription()
        );

        if (existingCategory != null) {
            throw new RuntimeException("이미 동일한 이름과 설명을 가진 카테고리가 존재합니다.");
        }

        int result = categoryMapper.insertCategory(categoryDTO);
        if (result == 0) {
            throw new RuntimeException("카테고리 등록에 실패했습니다.");
        }
        log.info("카테고리 등록 완료: {}", categoryDTO.getCategoryName());

        auditLogger.log("category",
                categoryDTO.getCategoryId() != null ? categoryDTO.getCategoryId().longValue() : null,
                "CREATE",
                "카테고리 등록: " + categoryDTO.getCategoryName(),
                null,
                null);
    }

    @Override
    @Transactional
    public void updateCategory(CategoryDTO categoryDTO) {
        // 기존 데이터 조회
        CategoryDTO before = categoryMapper.findById(categoryDTO.getCategoryId());

        // 중복 체크: 다른 카테고리가 같은 이름과 설명을 가지고 있는지 확인
        CategoryDTO existingCategory = categoryMapper.findByNameAndDescription(
                categoryDTO.getCategoryName(),
                categoryDTO.getDescription()
        );

        // 자기 자신이 아닌 다른 카테고리가 이미 있다면 오류
        if (existingCategory != null && !existingCategory.getCategoryId().equals(categoryDTO.getCategoryId())) {
            throw new RuntimeException("이미 동일한 이름과 설명을 가진 카테고리가 존재합니다.");
        }

        int result = categoryMapper.updateCategory(categoryDTO);
        if (result == 0) {
            throw new RuntimeException("카테고리 수정에 실패했습니다.");
        }
        log.info("카테고리 수정 완료: ID {}", categoryDTO.getCategoryId());

        // 변경 필드 추적
        StringBuilder changedFields = new StringBuilder("{");
        boolean hasChanges = false;

        if (!before.getCategoryName().equals(categoryDTO.getCategoryName())) {
            changedFields.append(String.format("\"%s\": {\"변경전\": \"%s\", \"변경후\": \"%s\"}",
                    auditLogger.translateFieldName("category", "categoryName"),
                    before.getCategoryName(),
                    categoryDTO.getCategoryName()));
            hasChanges = true;
        }

        if (!before.getDescription().equals(categoryDTO.getDescription())) {
            if (hasChanges) changedFields.append(", ");
            changedFields.append(String.format("\"%s\": {\"변경전\": \"%s\", \"변경후\": \"%s\"}",
                    auditLogger.translateFieldName("category", "description"),
                    before.getDescription(),
                    categoryDTO.getDescription()));
            hasChanges = true;
        }

        if (before.getIsActive() != null && categoryDTO.getIsActive() != null
                && !before.getIsActive().equals(categoryDTO.getIsActive())) {
            if (hasChanges) changedFields.append(", ");
            changedFields.append(String.format("\"%s\": {\"변경전\": %s, \"변경후\": %s}",
                    auditLogger.translateFieldName("category", "isActive"),
                    before.getIsActive(),
                    categoryDTO.getIsActive()));
            hasChanges = true;
        }

        changedFields.append("}");

        auditLogger.log("category",
                categoryDTO.getCategoryId() != null ? categoryDTO.getCategoryId().longValue() : null,
                "UPDATE",
                "카테고리 수정: " + categoryDTO.getCategoryName(),
                hasChanges ? changedFields.toString() : null,
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
                "카테고리 비활성화: " + categoryId,
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
                "카테고리 삭제: " + categoryId,
                null,
                null);
    }
}
