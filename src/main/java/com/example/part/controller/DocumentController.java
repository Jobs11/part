package com.example.part.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.part.dto.GeneratedDocumentDTO;
import com.example.part.dto.UserDTO;
import com.example.part.mapper.UserMapper;
import com.example.part.service.DocumentService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/livewalk/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;
    private final UserMapper userMapper;

    @GetMapping("/incoming/{incomingId}")
    public ResponseEntity<List<GeneratedDocumentDTO>> getDocumentsByIncomingId(@PathVariable Integer incomingId) {
        List<GeneratedDocumentDTO> documents = documentService.getDocumentsByIncomingId(incomingId);
        return ResponseEntity.ok(documents);
    }

    @GetMapping("/{documentId}")
    public ResponseEntity<GeneratedDocumentDTO> getDocumentById(@PathVariable Long documentId) {
        GeneratedDocumentDTO document = documentService.getDocumentById(documentId);
        if (document != null) {
            return ResponseEntity.ok(document);
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/generate")
    public ResponseEntity<Map<String, Object>> generateDocument(
            @RequestBody GeneratedDocumentDTO documentData,
            Authentication authentication) {

        Map<String, Object> response = new HashMap<>();

        try {
            // 현재 사용자 ID 조회
            String username = authentication.getName();
            UserDTO user = userMapper.findByUsername(username);
            Integer createdBy = user != null ? user.getUserId() : null;

            // PDF 문서 생성
            GeneratedDocumentDTO generated = documentService.generateDocument(documentData, createdBy);

            response.put("success", true);
            response.put("message", "문서가 생성되었습니다.");
            response.put("data", generated);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "문서 생성 실패: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @DeleteMapping("/{documentId}")
    public ResponseEntity<Map<String, Object>> deleteDocument(@PathVariable Long documentId) {
        Map<String, Object> response = new HashMap<>();

        try {
            documentService.deleteDocument(documentId);
            response.put("success", true);
            response.put("message", "문서가 삭제되었습니다.");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "삭제 실패: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/download/{fileName}")
    public ResponseEntity<Resource> downloadDocument(@PathVariable String fileName) {
        try {
            Resource resource = documentService.loadDocumentAsResource(fileName);

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/view/{fileName}")
    public ResponseEntity<Resource> viewDocument(@PathVariable String fileName) {
        try {
            Resource resource = documentService.loadDocumentAsResource(fileName);

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + fileName + "\"")
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping(value = "/generate-canvas", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> generateCanvasDocument(
            @org.springframework.web.bind.annotation.RequestParam("templateId") Long templateId,
            @org.springframework.web.bind.annotation.RequestParam("title") String title,
            @org.springframework.web.bind.annotation.RequestParam(value = "incomingId", required = false) Integer incomingId,
            @org.springframework.web.bind.annotation.RequestParam("image") org.springframework.web.multipart.MultipartFile image,
            Authentication authentication) {
        try {
            UserDTO user = userMapper.findByUsername(authentication.getName());

            GeneratedDocumentDTO document = documentService.generateCanvasDocument(
                    templateId, title, incomingId, image, user.getUserId());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("document", document);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
}
