package com.example.part.service;

import java.util.List;

import com.example.part.dto.DocumentTemplateDTO;

public interface DocumentTemplateService {

    // 전체 템플릿 조회
    List<DocumentTemplateDTO> getAllTemplates();

    // ID로 템플릿 조회
    DocumentTemplateDTO getTemplateById(int templateId);

    // 템플릿 저장
    void saveTemplate(DocumentTemplateDTO template);

    // 템플릿 수정
    void updateTemplate(DocumentTemplateDTO template);

    // 템플릿 삭제
    void deleteTemplate(int templateId);
}
