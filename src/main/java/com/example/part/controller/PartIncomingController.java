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

}
