package com.example.part.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.example.part.dto.PartImageDTO;
import com.example.part.service.PartImageService;

@RestController
@RequestMapping("/livewalk/part-images")
public class PartImageController {

    @Autowired
    private PartImageService partImageService;

    /**
     * 이미지 업로드
     */
    @PostMapping("/upload")
    public ResponseEntity<?> uploadImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam("incomingId") Integer incomingId,
            @RequestParam("imageType") String imageType) {
        try {
            PartImageDTO result = partImageService.uploadImage(file, incomingId, imageType);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("업로드 실패: " + e.getMessage());
        }
    }

    /**
     * 입고 ID로 이미지 목록 조회
     */
    @GetMapping("/incoming/{incomingId}")
    public ResponseEntity<List<PartImageDTO>> getImagesByIncomingId(@PathVariable Integer incomingId) {
        return ResponseEntity.ok(partImageService.getImagesByIncomingId(incomingId));
    }

    /**
     * 입고 ID + 타입으로 이미지 조회
     */
    @GetMapping("/incoming/{incomingId}/type/{imageType}")
    public ResponseEntity<List<PartImageDTO>> getImagesByType(
            @PathVariable Integer incomingId,
            @PathVariable String imageType) {
        return ResponseEntity.ok(partImageService.getImagesByType(incomingId, imageType));
    }

    /**
     * 전체 이미지 목록
     */
    @GetMapping
    public ResponseEntity<List<PartImageDTO>> getAllImages() {
        return ResponseEntity.ok(partImageService.getAllImages());
    }

    /**
     * 이미지 삭제
     */
    @DeleteMapping("/{imageId}")
    public ResponseEntity<String> deleteImage(@PathVariable Integer imageId) {
        try {
            partImageService.deleteImage(imageId);
            return ResponseEntity.ok("이미지 삭제 완료");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("삭제 실패: " + e.getMessage());
        }
    }
}
