package com.example.part.dto;

import lombok.Data;

@Data
public class PartLocationDTO {
    private Integer locationId;
    private Integer incomingId; // FK to part_incoming
    private String locationCode; // A-1
    private String partNumber; // 참고용
    private String partName;
    private String posX; // A
    private Integer posY; // 1
    private String note;
    private String updatedAt;
}
