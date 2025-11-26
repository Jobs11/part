package com.example.part.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.example.part.dto.TemplateDocumentDTO;
import com.example.part.mapper.TemplateDocumentMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class TemplateDocumentServiceImpl implements TemplateDocumentService {

    private final TemplateDocumentMapper templateDocumentMapper;

    @Override
    public List<TemplateDocumentDTO> getAllDocuments() {
        return templateDocumentMapper.selectAllDocuments();
    }

    @Override
    public TemplateDocumentDTO getDocumentById(int documentId) {
        return templateDocumentMapper.findById(documentId);
    }

    @Override
    public void saveDocument(TemplateDocumentDTO document) {
        templateDocumentMapper.insertDocument(document);
        log.info("문서 생성 완료: {}", document.getDocumentName());
    }

    @Override
    public void deleteDocument(int documentId) {
        templateDocumentMapper.deleteDocument(documentId);
        log.info("문서 삭제 완료: ID {}", documentId);
    }
}
