package com.example.part.dto;

import java.time.LocalDateTime;

import lombok.Data;

@Data
public class CategoryDTO {
    private Integer categoryId;
    private String categoryCode;
    private String categoryName;
    private String description;
    private Integer lastNumber;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
