package com.example.part.dto;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonFormat;

import lombok.Data;

@Data
public class TemplateDocumentDTO {
    private Integer documentId;
    private Integer templateId;
    private String documentName;
    private String tableData; // JSON string: 표 데이터 배열
    private String generatedBy;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    // JOIN용 - 템플릿 정보
    private String templateName;
}
