package com.example.part.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.example.part.dto.DocumentTemplateDTO;

@Mapper
public interface DocumentTemplateMapper {

    // 전체 템플릿 조회
    List<DocumentTemplateDTO> selectAllTemplates();

    // ID로 템플릿 조회
    DocumentTemplateDTO findById(@Param("templateId") int templateId);

    // 템플릿 저장
    int insertTemplate(DocumentTemplateDTO template);

    // 템플릿 수정
    int updateTemplate(DocumentTemplateDTO template);

    // 템플릿 삭제
    int deleteTemplate(@Param("templateId") int templateId);
}
