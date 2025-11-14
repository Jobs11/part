package com.example.part.controller;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.part.dto.PartUsageDTO;
import com.example.part.service.PartUsageService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/livewalk/part-usage")
@RequiredArgsConstructor
public class PartUsageController {

    private final PartUsageService partUsageService;

    /**
     * 출고 등록
     * POST /livewalk/part-usage
     */
    @PostMapping
    public ResponseEntity<String> registerUsage(@RequestBody PartUsageDTO partUsageDTO) {
        partUsageService.registerUsage(partUsageDTO);
        return ResponseEntity.ok("출고 등록 완료");
    }

    /**
     * 출고 수정
     * PUT /livewalk/part-usage/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<String> updateUsage(
            @PathVariable("id") int usageId,
            @RequestBody PartUsageDTO partUsageDTO) {
        partUsageDTO.setUsageId(usageId);
        partUsageService.updateUsage(partUsageDTO);
        return ResponseEntity.ok("출고 정보 수정 완료");
    }

    /**
     * 단건 조회
     * GET /livewalk/part-usage/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<PartUsageDTO> getUsageById(@PathVariable("id") int usageId) {
        PartUsageDTO usage = partUsageService.getUsageById(usageId);
        return ResponseEntity.ok(usage);
    }

    /**
     * 전체 사용 내역
     * GET /livewalk/part-usage
     */
    @GetMapping
    public ResponseEntity<List<PartUsageDTO>> getAllUsage() {
        List<PartUsageDTO> usageList = partUsageService.getAllUsage();
        return ResponseEntity.ok(usageList);
    }

    /**
     * 통합 검색 (부품명, 사용처, 부품번호)
     * GET /livewalk/part-usage/search?keyword=저항
     */
    @GetMapping("/search")
    public ResponseEntity<List<PartUsageDTO>> searchUsage(@RequestParam("keyword") String keyword) {
        List<PartUsageDTO> usageList = partUsageService.searchUsage(keyword);
        return ResponseEntity.ok(usageList);
    }

    /**
     * 사용처별 조회
     * GET /livewalk/part-usage/location?name=창고
     */
    @GetMapping("/location")
    public ResponseEntity<List<PartUsageDTO>> getUsageByLocation(@RequestParam("name") String usageLocation) {
        List<PartUsageDTO> usageList = partUsageService.getUsageByLocation(usageLocation);
        return ResponseEntity.ok(usageList);
    }

    /**
     * 부품번호별 조회
     * GET /livewalk/part-usage/part/{partNumber}
     */
    @GetMapping("/part/{partNumber}")
    public ResponseEntity<List<PartUsageDTO>> getUsageByPartNumber(@PathVariable("partNumber") String partNumber) {
        List<PartUsageDTO> usageList = partUsageService.getUsageByPartNumber(partNumber);
        return ResponseEntity.ok(usageList);
    }

    /**
     * 카테고리별 조회
     * GET /livewalk/part-usage/category/{categoryId}
     */
    @GetMapping("/category/{categoryId}")
    public ResponseEntity<List<PartUsageDTO>> getUsageByCategory(@PathVariable("categoryId") int categoryId) {
        List<PartUsageDTO> usageList = partUsageService.getUsageByCategory(categoryId);
        return ResponseEntity.ok(usageList);
    }

    /**
     * 기간별 조회
     * GET /livewalk/part-usage/date-range?startDate=2024-01-01&endDate=2024-12-31
     */
    @GetMapping("/date-range")
    public ResponseEntity<List<PartUsageDTO>> getUsageByDateRange(
            @RequestParam("startDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam("endDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        List<PartUsageDTO> usageList = partUsageService.getUsageByDateRange(startDate, endDate);
        return ResponseEntity.ok(usageList);
    }

    /**
     * 정렬 조회
     * GET /livewalk/part-usage/sort?column=used_date&order=desc
     */
    @GetMapping("/sort")
    public ResponseEntity<List<PartUsageDTO>> getUsageSorted(
            @RequestParam("column") String column,
            @RequestParam(value = "order", defaultValue = "desc") String order) {
        List<PartUsageDTO> usageList = partUsageService.getUsageSorted(column, order);
        return ResponseEntity.ok(usageList);
    }

    /**
     * 부품별 사용 합계 (통계)
     * GET /livewalk/part-usage/summary
     */
    @GetMapping("/summary")
    public ResponseEntity<List<Map<String, Object>>> getUsageSummaryByPart() {
        List<Map<String, Object>> summary = partUsageService.getUsageSummaryByPart();
        return ResponseEntity.ok(summary);
    }

    @GetMapping("/search-sort")
    public ResponseEntity<List<PartUsageDTO>> searchWithSort(
            @RequestParam String keyword,
            @RequestParam String column,
            @RequestParam String order) {
        return ResponseEntity.ok(partUsageService.searchWithSort(keyword, column, order));
    }
}
