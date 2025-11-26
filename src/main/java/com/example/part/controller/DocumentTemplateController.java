package com.example.part.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.part.dto.DocumentTemplateDTO;
import com.example.part.service.DocumentTemplateService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/livewalk/document-templates")
@RequiredArgsConstructor
public class DocumentTemplateController {

    private final DocumentTemplateService documentTemplateService;

    /**
     * 전체 템플릿 조회
     */
    @GetMapping
    public ResponseEntity<List<DocumentTemplateDTO>> getAllTemplates() {
        List<DocumentTemplateDTO> templates = documentTemplateService.getAllTemplates();
        return ResponseEntity.ok(templates);
    }

    /**
     * 단일 템플릿 조회
     */
    @GetMapping("/{id}")
    public ResponseEntity<DocumentTemplateDTO> getTemplateById(@PathVariable("id") int templateId) {
        DocumentTemplateDTO template = documentTemplateService.getTemplateById(templateId);
        return ResponseEntity.ok(template);
    }

    /**
     * 템플릿 저장
     */
    @PostMapping
    public ResponseEntity<String> saveTemplate(@RequestBody DocumentTemplateDTO template) {
        documentTemplateService.saveTemplate(template);
        return ResponseEntity.ok("템플릿 저장 완료");
    }

    /**
     * 템플릿 수정
     */
    @PutMapping("/{id}")
    public ResponseEntity<String> updateTemplate(
            @PathVariable("id") int templateId,
            @RequestBody DocumentTemplateDTO template) {
        template.setTemplateId(templateId);
        documentTemplateService.updateTemplate(template);
        return ResponseEntity.ok("템플릿 수정 완료");
    }

    /**
     * 템플릿 삭제
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteTemplate(@PathVariable("id") int templateId) {
        documentTemplateService.deleteTemplate(templateId);
        return ResponseEntity.ok("템플릿 삭제 완료");
    }
}
