package com.example.part.dto;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonFormat;

import lombok.Data;

@Data
public class PartUsageDTO {
    private Integer usageId;
    private Integer incomingId;
    private String partNumber;

    // JOIN용 필드
    private String partName;
    private String categoryName;
    private String unit;

    // 사용 정보
    private Integer quantityUsed;
    private String usageLocation;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime usedDatetime;

    // 기타
    private String note;
    private String createdBy;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
