package com.example.part.dto;

import java.time.LocalDateTime;

import lombok.Data;

@Data
public class CategoryDTO {
    private Integer categoryId;
    private String categoryName;
    private String description;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
