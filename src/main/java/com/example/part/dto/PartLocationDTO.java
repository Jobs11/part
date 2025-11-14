package com.example.part.dto;

import lombok.Data;

@Data
public class PartLocationDTO {
    private Integer locationId;
    private String locationCode; // A-1
    private String partNumber;
    private String partName;
    private String posX; // A
    private Integer posY; // 1
    private String note;
    private String updatedAt;
}
