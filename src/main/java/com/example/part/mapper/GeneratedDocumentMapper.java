package com.example.part.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

import com.example.part.dto.GeneratedDocumentDTO;

@Mapper
public interface GeneratedDocumentMapper {

    void insertDocument(GeneratedDocumentDTO document);

    List<GeneratedDocumentDTO> selectDocumentsByIncomingId(Integer incomingId);

    GeneratedDocumentDTO selectDocumentById(Long documentId);

    void deleteDocument(Long documentId);
}
