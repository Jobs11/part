package com.example.part.dto;

import java.time.LocalDateTime;

import lombok.Data;

@Data
public class MapSpotDTO {
    private Integer spotId;
    private Long imageId;
    private String spotName;
    private Integer posX;
    private Integer posY;
    private Integer radius;
    private String description;
    private LocalDateTime createdAt;
}
