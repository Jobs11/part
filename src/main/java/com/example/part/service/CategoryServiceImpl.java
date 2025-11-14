package com.example.part.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.part.dto.CategoryDTO;
import com.example.part.dto.PartIncomingDTO;
import com.example.part.mapper.CategoryMapper;
import com.example.part.mapper.PartIncomingMapper;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class CategoryServiceImpl implements CategoryService {

    private final CategoryMapper categoryMapper;
    private final PartIncomingMapper partIncomingMapper;

    /**
     * 애플리케이션 시작 시 카테고리 last_number 자동 동기화
     */
    @PostConstruct
    @Transactional
    public void syncLastNumbers() {
        log.info("========================================");
        log.info("카테고리 last_number 동기화 시작...");
        log.info("========================================");

        try {
            List<CategoryDTO> categories = categoryMapper.selectAllCategories();
            int syncCount = 0;

            for (CategoryDTO category : categories) {
                // 해당 카테고리의 입고 내역 조회
                List<PartIncomingDTO> incomingList = partIncomingMapper
                        .selectIncomingByCategory(category.getCategoryId());

                if (incomingList.isEmpty()) {
                    log.debug("카테고리 [{}] - 입고 내역 없음, last_number 유지: {}",
                            category.getCategoryCode(), category.getLastNumber());
                    continue;
                }

                // 최대 부품번호 찾기
                int maxNumber = 0;
                for (PartIncomingDTO incoming : incomingList) {
                    String partNumber = incoming.getPartNumber();
                    if (partNumber != null && partNumber.contains("-")) {
                        String[] parts = partNumber.split("-");
                        if (parts.length == 2) {
                            try {
                                int number = Integer.parseInt(parts[1]);
                                maxNumber = Math.max(maxNumber, number);
                            } catch (NumberFormatException e) {
                                log.warn("부품번호 파싱 실패: {}", partNumber);
                            }
                        }
                    }
                }

                // last_number 업데이트 필요 여부 확인
                if (maxNumber > category.getLastNumber()) {
                    categoryMapper.updateLastNumber(category.getCategoryId(), maxNumber);
                    log.info("✅ 카테고리 [{}] last_number 동기화: {} → {}",
                            category.getCategoryCode(), category.getLastNumber(), maxNumber);
                    syncCount++;
                } else {
                    log.debug("카테고리 [{}] - last_number 이미 최신: {}",
                            category.getCategoryCode(), category.getLastNumber());
                }
            }

            log.info("========================================");
            log.info("카테고리 last_number 동기화 완료! ({}개 업데이트)", syncCount);
            log.info("========================================");

        } catch (Exception e) {
            log.error("카테고리 last_number 동기화 중 오류 발생", e);
            // 오류가 발생해도 애플리케이션은 정상 시작되도록 함
        }
    }

    @Override
    public List<CategoryDTO> getAllCategories() {
        return categoryMapper.selectAllCategories();
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
    public CategoryDTO getCategoryByCode(String categoryCode) {
        CategoryDTO category = categoryMapper.findByCode(categoryCode);
        if (category == null) {
            throw new RuntimeException("카테고리를 찾을 수 없습니다. 코드: " + categoryCode);
        }
        return category;
    }

    @Override
    @Transactional
    public void createCategory(CategoryDTO categoryDTO) {
        // 중복 체크
        CategoryDTO existing = categoryMapper.findByCode(categoryDTO.getCategoryCode());
        if (existing != null) {
            throw new RuntimeException("이미 존재하는 카테고리 코드입니다: " + categoryDTO.getCategoryCode());
        }

        int result = categoryMapper.insertCategory(categoryDTO);
        if (result == 0) {
            throw new RuntimeException("카테고리 등록에 실패했습니다.");
        }
        log.info("카테고리 등록 완료: {}", categoryDTO.getCategoryName());
    }

    @Override
    @Transactional
    public void updateCategory(CategoryDTO categoryDTO) {
        int result = categoryMapper.updateCategory(categoryDTO);
        if (result == 0) {
            throw new RuntimeException("카테고리 수정에 실패했습니다.");
        }
        log.info("카테고리 수정 완료: ID {}", categoryDTO.getCategoryId());
    }

    @Override
    @Transactional
    public String generatePartNumber(int categoryId) {
        // 1. 카테고리 조회
        CategoryDTO category = getCategoryById(categoryId);

        // 2. 다음 번호 계산
        int nextNumber = category.getLastNumber() + 1;

        // 3. 부품번호 생성 (예: E-0001)
        String partNumber = String.format("%s-%04d", category.getCategoryCode(), nextNumber);

        // 4. last_number 업데이트
        int result = categoryMapper.updateLastNumber(categoryId, nextNumber);
        if (result == 0) {
            throw new RuntimeException("부품번호 생성에 실패했습니다.");
        }

        log.info("부품번호 생성: {}", partNumber);
        return partNumber;
    }

    @Override
    @Transactional
    public void deactivateCategory(int categoryId) {
        int result = categoryMapper.deactivateCategory(categoryId);
        if (result == 0) {
            throw new RuntimeException("카테고리 비활성화에 실패했습니다.");
        }
        log.info("카테고리 비활성화 완료: ID {}", categoryId);
    }

    @Override
    @Transactional
    public void deleteCategory(int categoryId) {
        int result = categoryMapper.deleteCategory(categoryId);
        if (result == 0) {
            throw new RuntimeException("카테고리 삭제에 실패했습니다.");
        }
        log.info("카테고리 삭제 완료: ID {}", categoryId);
    }
}
