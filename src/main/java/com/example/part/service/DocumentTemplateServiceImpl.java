package com.example.part.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.example.part.dto.DocumentTemplateDTO;
import com.example.part.mapper.DocumentTemplateMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentTemplateServiceImpl implements DocumentTemplateService {

    private final DocumentTemplateMapper documentTemplateMapper;

    @Override
    public List<DocumentTemplateDTO> getAllTemplates() {
        return documentTemplateMapper.selectAllTemplates();
    }

    @Override
    public DocumentTemplateDTO getTemplateById(int templateId) {
        return documentTemplateMapper.findById(templateId);
    }

    @Override
    public void saveTemplate(DocumentTemplateDTO template) {
        documentTemplateMapper.insertTemplate(template);
        log.info("템플릿 저장 완료: {}", template.getTemplateName());
    }

    @Override
    public void updateTemplate(DocumentTemplateDTO template) {
        documentTemplateMapper.updateTemplate(template);
        log.info("템플릿 수정 완료: {}", template.getTemplateName());
    }

    @Override
    public void deleteTemplate(int templateId) {
        documentTemplateMapper.deleteTemplate(templateId);
        log.info("템플릿 삭제 완료: ID {}", templateId);
    }
}
