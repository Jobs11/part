package com.example.part.service;

import java.util.List;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import com.example.part.dto.GeneratedDocumentDTO;

public interface DocumentService {

    GeneratedDocumentDTO generateDocument(GeneratedDocumentDTO documentData, Integer createdBy);

    GeneratedDocumentDTO generateCanvasDocument(Long templateId, String title, Integer incomingId,
                                                 MultipartFile image, Integer createdBy);

    GeneratedDocumentDTO generateCanvasPDF(Long templateId, String title, Integer incomingId,
                                            MultipartFile image, Integer createdBy);

    List<GeneratedDocumentDTO> getDocumentsByIncomingId(Integer incomingId);

    GeneratedDocumentDTO getDocumentById(Long documentId);

    void deleteDocument(Long documentId);

    Resource loadDocumentAsResource(String fileName);
}
