package com.example.part.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.example.part.dto.GeneralImageDTO;
import com.example.part.dto.UserDTO;
import com.example.part.mapper.UserMapper;
import com.example.part.service.GeneralImageService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/livewalk/library")
@RequiredArgsConstructor
public class GeneralImageController {

    private final GeneralImageService generalImageService;
    private final UserMapper userMapper;

    @GetMapping
    public ResponseEntity<List<GeneralImageDTO>> getAllImages() {
        List<GeneralImageDTO> images = generalImageService.getAllImages();
        return ResponseEntity.ok(images);
    }

    @GetMapping("/{imageId}")
    public ResponseEntity<GeneralImageDTO> getImageById(@PathVariable Long imageId) {
        GeneralImageDTO image = generalImageService.getImageById(imageId);
        if (image != null) {
            return ResponseEntity.ok(image);
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> uploadImage(
            @RequestParam("title") String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {

        Map<String, Object> response = new HashMap<>();

        try {
            // 현재 사용자 ID 조회
            String username = authentication.getName();
            UserDTO user = userMapper.findByUsername(username);
            Integer uploadedBy = user != null ? user.getUserId() : null;

            // 이미지 업로드
            GeneralImageDTO uploaded = generalImageService.uploadImage(title, description, file, uploadedBy);

            response.put("success", true);
            response.put("message", "자료가 업로드되었습니다.");
            response.put("data", uploaded);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "업로드 실패: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @DeleteMapping("/{imageId}")
    public ResponseEntity<Map<String, Object>> deleteImage(@PathVariable Long imageId) {
        Map<String, Object> response = new HashMap<>();

        try {
            generalImageService.deleteImage(imageId);
            response.put("success", true);
            response.put("message", "자료가 삭제되었습니다.");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "삭제 실패: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping("/{imageId}/coordinates")
    public ResponseEntity<Map<String, Object>> saveFieldCoordinates(
            @PathVariable Long imageId,
            @RequestParam("coordinates") String coordinatesJson) {

        Map<String, Object> response = new HashMap<>();

        try {
            generalImageService.updateFieldCoordinates(imageId, coordinatesJson);
            response.put("success", true);
            response.put("message", "템플릿 좌표가 저장되었습니다.");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "좌표 저장 실패: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/image/{fileName}")
    public ResponseEntity<org.springframework.core.io.Resource> serveImage(@PathVariable String fileName) {
        try {
            org.springframework.core.io.Resource resource = generalImageService.loadImageAsResource(fileName);

            // 파일 확장자에 따라 MIME 타입 결정
            org.springframework.http.MediaType mediaType = org.springframework.http.MediaType.IMAGE_JPEG;
            if (fileName.toLowerCase().endsWith(".pdf")) {
                mediaType = org.springframework.http.MediaType.APPLICATION_PDF;
            } else if (fileName.toLowerCase().endsWith(".png")) {
                mediaType = org.springframework.http.MediaType.IMAGE_PNG;
            }

            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
