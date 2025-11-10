package com.example.part.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
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

@RestController
@RequestMapping("/livewalk/part-usage")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PartUsageController {

    private final PartUsageService partUsageService;

    /**
     * 부품 사용 내역 등록
     * POST /livewalk/part-usage
     */
    @PostMapping
    public ResponseEntity<String> insertPartUsage(@RequestBody PartUsageDTO partUsageDTO) {
        try {
            partUsageService.insertPartUsage(partUsageDTO);
            return ResponseEntity.status(HttpStatus.CREATED).body("부품 사용 내역이 성공적으로 등록되었습니다.");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("부품 사용 내역 등록 실패: " + e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<String> updatePart(
            @PathVariable Long id,
            @RequestBody PartUsageDTO partUsageDTO) {
        try {
            partUsageDTO.setId(id);
            partUsageService.updatePartUsage(partUsageDTO);
            return ResponseEntity.ok("부품이 성공적으로 수정되었습니다.");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("부품 수정 실패: " + e.getMessage());
        }
    }

    /**
     * 전체 사용 내역 조회
     * GET /livewalk/part-usage
     */
    @GetMapping
    public ResponseEntity<List<PartUsageDTO>> getAllPartUsage() {
        try {
            List<PartUsageDTO> usageList = partUsageService.getAllPartUsage();
            return ResponseEntity.ok(usageList);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    /**
     * 특정 부품의 사용 내역 조회
     * GET /livewalk/part-usage/part/{partNumber}
     */
    @GetMapping("/part/{partNumber}")
    public ResponseEntity<List<PartUsageDTO>> getPartUsageByPartNumber(@PathVariable String partNumber) {
        try {
            List<PartUsageDTO> usageList = partUsageService.getPartUsageByPartNumber(partNumber);
            return ResponseEntity.ok(usageList);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    /**
     * 특정 사용처의 사용 내역 조회
     * GET /livewalk/part-usage/location?name={usageLocation}
     */
    @GetMapping("/location")
    public ResponseEntity<List<PartUsageDTO>> getPartUsageByLocation(@RequestParam String name) {
        try {
            List<PartUsageDTO> usageList = partUsageService.getPartUsageByLocation(name);
            return ResponseEntity.ok(usageList);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @GetMapping("/sort-desc")
    public ResponseEntity<List<PartUsageDTO>> getDescPartUsage(@RequestParam("column") String column) {
        try {
            // column 파라미터: part_name, part_number, quantity 등
            List<PartUsageDTO> sortedParts = partUsageService.getPartUsageDescSorted(column);
            return ResponseEntity.ok(sortedParts);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @GetMapping("/sort-asc")
    public ResponseEntity<List<PartUsageDTO>> getAscPartUsage(@RequestParam("column") String column) {
        try {
            // column 파라미터: part_name, part_number, quantity 등
            List<PartUsageDTO> sortedParts = partUsageService.getPartUsageAscSorted(column);
            return ResponseEntity.ok(sortedParts);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    /**
     * 부품 사용 내역 비공개 처리 (Soft Delete)
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<String> softDeletePartUsage(@PathVariable int id) {
        try {
            partUsageService.softDeletePartUsage(id);
            return ResponseEntity.ok("사용 내역이 비공개 처리되었습니다.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
