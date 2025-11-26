package com.example.part.service;

import java.util.List;

import com.example.part.dto.TemplateDocumentDTO;

public interface TemplateDocumentService {

    // 전체 문서 조회
    List<TemplateDocumentDTO> getAllDocuments();

    // ID로 문서 조회
    TemplateDocumentDTO getDocumentById(int documentId);

    // 문서 저장
    void saveDocument(TemplateDocumentDTO document);

    // 문서 삭제
    void deleteDocument(int documentId);
}
