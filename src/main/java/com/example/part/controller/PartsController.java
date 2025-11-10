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

import com.example.part.dto.PartsDTO;
import com.example.part.service.PartsService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/livewalk/parts")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PartsController {

    private final PartsService partsService;

    /**
     * 부품 입력
     * POST /livewalk/parts
     */
    @PostMapping("/insert")
    public ResponseEntity<String> insertPart(@RequestBody PartsDTO partsDto) {
        try {
            partsService.insertPart(partsDto);
            return ResponseEntity.status(HttpStatus.CREATED).body("부품이 성공적으로 등록되었습니다.");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("부품 등록 실패: " + e.getMessage());
        }
    }

    /**
     * 부품 수정
     * PUT /livewalk/parts/{partNumber}
     */
    @PutMapping("/{partNumber}")
    public ResponseEntity<String> updatePart(
            @PathVariable String partNumber,
            @RequestBody PartsDTO partsDto) {
        try {
            partsDto.setPartNumber(partNumber);
            partsService.updatePart(partsDto);
            return ResponseEntity.ok("부품이 성공적으로 수정되었습니다.");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("부품 수정 실패: " + e.getMessage());
        }
    }

    /**
     * 수량이 10개 이하인 부품 리스트 조회
     * GET /livewalk/parts/low-stock
     */
    @GetMapping("/low-stock")
    public ResponseEntity<List<PartsDTO>> getLowStockParts(
            @RequestParam(required = false, defaultValue = "10") Integer threshold) {
        List<PartsDTO> lowStockParts = partsService.getLowStockParts(threshold);
        return ResponseEntity.ok(lowStockParts);
    }

    /**
     * 전체 부품 리스트 조회
     * GET /api/parts
     */
    @GetMapping
    public ResponseEntity<List<PartsDTO>> getAllParts() {
        try {
            List<PartsDTO> allParts = partsService.getAllParts();
            return ResponseEntity.ok(allParts);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @GetMapping("/sort-desc")
    public ResponseEntity<List<PartsDTO>> getDescParts(@RequestParam("column") String column) {
        try {
            // column 파라미터: part_name, part_number, quantity 등
            List<PartsDTO> sortedParts = partsService.getPartsDescSorted(column);
            return ResponseEntity.ok(sortedParts);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    @GetMapping("/sort-asc")
    public ResponseEntity<List<PartsDTO>> getAscParts(@RequestParam("column") String column) {
        try {
            // column 파라미터: part_name, part_number, quantity 등
            List<PartsDTO> sortedParts = partsService.getPartsAscSorted(column);
            return ResponseEntity.ok(sortedParts);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }

    /**
     * 부품 비공개 처리 (Soft Delete)
     */
    @DeleteMapping("/{partNumber}")
    public ResponseEntity<String> softDeletePart(@PathVariable String partNumber) {
        try {
            partsService.softDeletePart(partNumber);
            return ResponseEntity.ok("부품이 비공개 처리되었습니다.");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
