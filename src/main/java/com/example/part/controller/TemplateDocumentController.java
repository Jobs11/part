package com.example.part.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.part.dto.TemplateDocumentDTO;
import com.example.part.service.TemplateDocumentService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/livewalk/template-documents")
@RequiredArgsConstructor
public class TemplateDocumentController {

    private final TemplateDocumentService templateDocumentService;

    /**
     * 전체 문서 조회
     */
    @GetMapping
    public ResponseEntity<List<TemplateDocumentDTO>> getAllDocuments() {
        List<TemplateDocumentDTO> documents = templateDocumentService.getAllDocuments();
        return ResponseEntity.ok(documents);
    }

    /**
     * 단일 문서 조회
     */
    @GetMapping("/{id}")
    public ResponseEntity<TemplateDocumentDTO> getDocumentById(@PathVariable("id") int documentId) {
        TemplateDocumentDTO document = templateDocumentService.getDocumentById(documentId);
        return ResponseEntity.ok(document);
    }

    /**
     * 문서 생성
     */
    @PostMapping
    public ResponseEntity<String> saveDocument(@RequestBody TemplateDocumentDTO document) {
        templateDocumentService.saveDocument(document);
        return ResponseEntity.ok("문서 생성 완료");
    }

    /**
     * 문서 삭제
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteDocument(@PathVariable("id") int documentId) {
        templateDocumentService.deleteDocument(documentId);
        return ResponseEntity.ok("문서 삭제 완료");
    }
}
