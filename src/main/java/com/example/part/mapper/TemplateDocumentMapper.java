package com.example.part.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

import com.example.part.dto.TemplateDocumentDTO;

@Mapper
public interface TemplateDocumentMapper {

    // 전체 문서 조회
    List<TemplateDocumentDTO> selectAllDocuments();

    // ID로 문서 조회
    TemplateDocumentDTO findById(int documentId);

    // 문서 저장
    void insertDocument(TemplateDocumentDTO document);

    // 문서 삭제
    void deleteDocument(int documentId);
}
