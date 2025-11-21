package com.example.part.dto;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonFormat;

import lombok.Data;

@Data
public class GeneralImageDTO {
    private Long imageId;
    private String title;
    private String description;
    private String fileName;
    private String originalName;
    private String filePath;
    private Long fileSize;
    private String fileType; // "image" 또는 "pdf"
    private Integer uploadedBy;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime uploadedAt;

    private Boolean isActive;

    // 템플릿 좌표 설정 (JSON 형태로 저장)
    private String fieldCoordinates; // JSON: [{"label":"공급자명","x":100,"y":700,"fontSize":10}, ...]
}
