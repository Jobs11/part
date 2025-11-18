package com.example.part.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.part.dto.PartIncomingDTO;
import com.example.part.service.PartIncomingService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/livewalk/incoming")
@RequiredArgsConstructor
public class PartIncomingController {

    private final PartIncomingService partIncomingService;

    /**
     * 입고 등록 (부품번호 자동 생성)
     * POST /livewalk/incoming
     */
    @PostMapping
    public ResponseEntity<String> registerIncoming(@RequestBody PartIncomingDTO partIncomingDTO) {
        partIncomingService.registerIncoming(partIncomingDTO);
        return ResponseEntity.ok("입고 등록 완료: " + partIncomingDTO.getPartNumber());
    }

    /**
     * 입고 등록 (부품번호 수동 입력 - 같은 부품 추가 입고)
     * POST /livewalk/incoming/with-number
     */
    @PostMapping("/with-number")
    public ResponseEntity<String> registerIncomingWithPartNumber(@RequestBody PartIncomingDTO partIncomingDTO) {
        partIncomingService.registerIncomingWithPartNumber(partIncomingDTO);
        return ResponseEntity.ok("입고 등록 완료: " + partIncomingDTO.getPartNumber());
    }

    /**
     * 전체 입고 내역 조회
     * GET /livewalk/incoming
     */
    @GetMapping
    public ResponseEntity<List<PartIncomingDTO>> getAllIncoming() {
        List<PartIncomingDTO> incomingList = partIncomingService.getAllIncoming();
        return ResponseEntity.ok(incomingList);
    }

    /**
     * 단일 입고 내역 조회
     * GET /livewalk/incoming/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<PartIncomingDTO> getIncomingById(@PathVariable("id") int incomingId) {
        PartIncomingDTO incoming = partIncomingService.getIncomingById(incomingId);
        return ResponseEntity.ok(incoming);
    }

    /**
     * 부품번호로 조회
     * GET /livewalk/incoming/part/{partNumber}
     */
    @GetMapping("/part/{partNumber}")
    public ResponseEntity<List<PartIncomingDTO>> getIncomingByPartNumber(
            @PathVariable("partNumber") String partNumber) {
        List<PartIncomingDTO> incomingList = partIncomingService.getIncomingByPartNumber(partNumber);
        return ResponseEntity.ok(incomingList);
    }

    /**
     * 부품명으로 검색
     * GET /livewalk/incoming/search?name=저항
     */
    @GetMapping("/search")
    public ResponseEntity<List<PartIncomingDTO>> searchByPartName(@RequestParam("name") String partName) {
        List<PartIncomingDTO> incomingList = partIncomingService.searchByPartName(partName);
        return ResponseEntity.ok(incomingList);
    }

    /**
     * 고급 검색 (컬럼 검색 + +포함, -제외 + 전체검색)
     * GET /livewalk/incoming/search-advanced
     */
    @GetMapping("/search-advanced")
    public ResponseEntity<List<PartIncomingDTO>> searchAdvanced(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String column,
            @RequestParam(required = false) String sortColumn,
            @RequestParam(required = false) String order) {

        Map<String, Object> params = new HashMap<>();

        // ===== 키워드 전처리 (기본 검색어 / +포함 / -제외 분리) =====
        List<String> includeList = new java.util.ArrayList<>();
        List<String> excludeList = new java.util.ArrayList<>();
        String cleanedKeyword = null;

        if (keyword != null) {
            String trimmedKeyword = keyword.trim();

            if (!trimmedKeyword.isEmpty()) {
                StringBuilder baseKeywordBuilder = new StringBuilder();
                String[] tokens = trimmedKeyword.split("\\s+");

                for (String t : tokens) {
                    if (t.startsWith("+") && t.length() > 1) {
                        includeList.add(t.substring(1)); // +센서 → 센서
                    } else if (t.startsWith("-") && t.length() > 1) {
                        excludeList.add(t.substring(1)); // -불량 → 불량
                    } else if (!t.isEmpty()) {
                        if (baseKeywordBuilder.length() > 0) {
                            baseKeywordBuilder.append(" ");
                        }
                        baseKeywordBuilder.append(t);
                    }
                }

                if (baseKeywordBuilder.length() > 0) {
                    cleanedKeyword = baseKeywordBuilder.toString();
                }
            }
        }

        params.put("keyword", cleanedKeyword);

        params.put("includeList", includeList);
        params.put("excludeList", excludeList);

        // ===== 컬럼 클릭 검색 =====
        params.put("column", column);

        // ===== 정렬 컬럼 (sortColumn이 있으면 우선, 없으면 column 사용) =====
        String orderColumn = (sortColumn != null && !sortColumn.trim().isEmpty()) ? sortColumn : column;
        params.put("sortColumn", orderColumn);

        // ===== 정렬 추가 =====
        if (order == null || (!order.equals("asc") && !order.equals("desc"))) {
            order = "asc"; // 기본값
        }
        params.put("order", order);

        return ResponseEntity.ok(partIncomingService.searchAdvanced(params));
    }

    /**
     * 카테고리별 입고 내역
     * GET /livewalk/incoming/category/{categoryId}
     */
    @GetMapping("/category/{categoryId}")
    public ResponseEntity<List<PartIncomingDTO>> getIncomingByCategory(@PathVariable("categoryId") int categoryId) {
        List<PartIncomingDTO> incomingList = partIncomingService.getIncomingByCategory(categoryId);
        return ResponseEntity.ok(incomingList);
    }

    /**
     * 부품별 현재 재고 집계
     * GET /livewalk/incoming/inventory
     */
    @GetMapping("/inventory")
    public ResponseEntity<List<Map<String, Object>>> getCurrentInventory() {
        List<Map<String, Object>> inventory = partIncomingService.getCurrentInventory();
        return ResponseEntity.ok(inventory);
    }

    /**
     * 현재 재고 고급 검색
     * GET /livewalk/incoming/inventory/search-advanced
     */
    @GetMapping("/inventory/search-advanced")
    public ResponseEntity<List<Map<String, Object>>> searchInventoryAdvanced(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String column,
            @RequestParam(required = false) String order) {

        Map<String, Object> params = new HashMap<>();
        String columnParam = (column != null && !column.trim().isEmpty()) ? column.trim() : null;

        List<String> includeList = new java.util.ArrayList<>();
        List<String> excludeList = new java.util.ArrayList<>();
        String cleanedKeyword = null;

        if (keyword != null) {
            String trimmedKeyword = keyword.trim();

            if (!trimmedKeyword.isEmpty()) {
                StringBuilder baseKeywordBuilder = new StringBuilder();
                String[] tokens = trimmedKeyword.split("\\s+");

                for (String token : tokens) {
                    if (token.startsWith("+") && token.length() > 1) {
                        includeList.add(token.substring(1));
                    } else if (token.startsWith("-") && token.length() > 1) {
                        excludeList.add(token.substring(1));
                    } else if (!token.isEmpty()) {
                        if (baseKeywordBuilder.length() > 0) {
                            baseKeywordBuilder.append(" ");
                        }
                        baseKeywordBuilder.append(token);
                    }
                }

                if (baseKeywordBuilder.length() > 0) {
                    cleanedKeyword = baseKeywordBuilder.toString();
                }
            }
        }

        params.put("keyword", cleanedKeyword);
        params.put("includeList", includeList);
        params.put("excludeList", excludeList);

        String filterColumnKey = (columnParam != null && isInventoryTextColumn(columnParam)) ? columnParam : null;
        params.put("columnKey", filterColumnKey);

        String resolvedOrderColumn = resolveInventoryOrderColumn(columnParam);
        params.put("orderColumn", resolvedOrderColumn);

        if (order == null || (!order.equalsIgnoreCase("asc") && !order.equalsIgnoreCase("desc"))) {
            order = "asc";
        }
        params.put("order", order.toLowerCase());

        return ResponseEntity.ok(partIncomingService.searchInventoryAdvanced(params));
    }

    /**
     * 재고 부족 조회
     * GET /livewalk/incoming/low-stock?threshold=10
     */
    @GetMapping("/low-stock")
    public ResponseEntity<List<Map<String, Object>>> getLowStock(
            @RequestParam(value = "threshold", defaultValue = "10") int threshold) {
        List<Map<String, Object>> lowStock = partIncomingService.getLowStock(threshold);
        return ResponseEntity.ok(lowStock);
    }

    /**
     * 입고 정보 수정
     * PUT /livewalk/incoming/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<String> updateIncoming(
            @PathVariable("id") int incomingId,
            @RequestBody PartIncomingDTO partIncomingDTO) {
        partIncomingDTO.setIncomingId(incomingId);
        partIncomingService.updateIncoming(partIncomingDTO);
        return ResponseEntity.ok("입고 정보 수정 완료");
    }

    /**
     * 정렬 조회
     * GET /livewalk/incoming/sort?column=purchase_date&order=desc
     */
    @GetMapping("/sort")
    public ResponseEntity<List<PartIncomingDTO>> getIncomingSorted(
            @RequestParam("column") String column,
            @RequestParam(value = "order", defaultValue = "desc") String order) {
        List<PartIncomingDTO> incomingList = partIncomingService.getIncomingSorted(column, order);
        return ResponseEntity.ok(incomingList);
    }

    @GetMapping("/search-sort")
    public ResponseEntity<List<PartIncomingDTO>> searchWithSort(
            @RequestParam String keyword,
            @RequestParam String column,
            @RequestParam String order) {
        return ResponseEntity.ok(partIncomingService.searchWithSort(keyword, column, order));
    }

    @PostMapping("/bulk")
    public ResponseEntity<?> bulkInsert(@RequestBody List<PartIncomingDTO> incomingList) {
        int successCount = 0;
        int failCount = 0;

        for (PartIncomingDTO dto : incomingList) {
            try {
                // 입고 등록 (내부에서 기존 부품 체크 후 번호 생성 또는 재사용)
                partIncomingService.registerIncoming(dto);
                successCount++;
            } catch (Exception e) {
                failCount++;
            }
        }

        Map<String, Integer> result = new HashMap<>();
        result.put("success", successCount);
        result.put("fail", failCount);

        return ResponseEntity.ok(result);
    }

    private boolean isInventoryTextColumn(String column) {
        return "part_number".equals(column)
                || "part_name".equals(column)
                || "category_name".equals(column)
                || "current_stock".equals(column)
                || "total_incoming".equals(column)
                || "total_used".equals(column)
                || "incoming_count".equals(column);
    }

    private String resolveInventoryOrderColumn(String column) {
        if (column == null || column.isEmpty()) {
            return null;
        }

        switch (column) {
            case "part_number":
            case "part_name":
            case "category_name":
            case "current_stock":
            case "total_incoming":
            case "total_used":
            case "incoming_count":
                return column;
            default:
                return null;
        }
    }

}
