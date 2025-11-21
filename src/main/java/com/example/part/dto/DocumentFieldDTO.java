package com.example.part.dto;

import lombok.Data;

@Data
public class DocumentFieldDTO {
    private String fieldValue; // 필드 값
    private Float x;           // X 좌표
    private Float y;           // Y 좌표
    private Integer fontSize;  // 폰트 크기 (선택사항, 기본값 10)
}
