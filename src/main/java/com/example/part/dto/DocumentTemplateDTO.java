package com.example.part.dto;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonFormat;

import lombok.Data;

@Data
public class DocumentTemplateDTO {
    private Integer templateId;
    private String templateName;
    private Integer backgroundImageId;

    // JSON 필드들 (String으로 저장)
    private String tableConfig;  // JSON: {x, y, width, height, columns: [{name, width}], rowHeight}
    private String fixedTexts;   // JSON: [{text, x, y, fontSize, fontWeight}]

    private String createdBy;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;
}
