package com.example.part.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.part.dto.CategoryDTO;
import com.example.part.service.CategoryService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/livewalk/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    /**
     * 전체 카테고리 조회
     */
    @GetMapping
    public ResponseEntity<List<CategoryDTO>> getAllCategories() {
        List<CategoryDTO> categories = categoryService.getAllCategories();
        return ResponseEntity.ok(categories);
    }

    /**
     * 단일 카테고리 조회
     */
    @GetMapping("/{id}")
    public ResponseEntity<CategoryDTO> getCategoryById(@PathVariable("id") int categoryId) {
        CategoryDTO category = categoryService.getCategoryById(categoryId);
        return ResponseEntity.ok(category);
    }

    // 카테고리 코드로 조회 엔드포인트 제거됨 - 더 이상 카테고리 코드를 사용하지 않음

    /**
     * 결제수단 카테고리 조회
     */
    @GetMapping("/payment-methods")
    public ResponseEntity<List<CategoryDTO>> getPaymentMethods() {
        List<CategoryDTO> paymentMethods = categoryService.getCategoriesByDescription("결제수단");
        return ResponseEntity.ok(paymentMethods);
    }

    /**
     * 카테고리 등록
     */
    @PostMapping
    public ResponseEntity<String> createCategory(@RequestBody CategoryDTO categoryDTO) {
        categoryService.createCategory(categoryDTO);
        return ResponseEntity.ok("카테고리 등록 완료");
    }

    /**
     * 카테고리 수정
     */
    @PutMapping("/{id}")
    public ResponseEntity<String> updateCategory(
            @PathVariable("id") int categoryId,
            @RequestBody CategoryDTO categoryDTO) {
        categoryDTO.setCategoryId(categoryId);
        categoryService.updateCategory(categoryDTO);
        return ResponseEntity.ok("카테고리 수정 완료");
    }

    // 부품번호 자동 생성 및 last_number 동기화 엔드포인트 제거됨 - 부품번호를 사용자가 직접 입력함

    /**
     * 카테고리 비활성화
     */
    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<String> deactivateCategory(@PathVariable("id") int categoryId) {
        categoryService.deactivateCategory(categoryId);
        return ResponseEntity.ok("카테고리 비활성화 완료");
    }

    /**
     * 카테고리 삭제
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteCategory(@PathVariable("id") int categoryId) {
        categoryService.deleteCategory(categoryId);
        return ResponseEntity.ok("카테고리 삭제 완료");
    }
}
