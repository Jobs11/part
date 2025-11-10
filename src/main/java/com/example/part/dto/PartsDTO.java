package com.example.part.dto;

import java.time.LocalDateTime;

import lombok.Data;

@Data
public class PartsDTO {
    private String partNumber; // 부품번호
    private String partName; // 부품명
    private Integer quantity; // 수량
    private String unit; // 단위
    private String description; // 설명
    private LocalDateTime createdAt; // 등록일
    private LocalDateTime updatedAt; // 수정일
}
