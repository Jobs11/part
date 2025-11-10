package com.example.part.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class PartUsageDTO {
    private Long id;                    // 고유번호
    private String partNumber;          // 부품번호
    private Integer quantityUsed;       // 사용 수량
    private String usageLocation;       // 사용처
    private LocalDate usedDate;         // 사용 날짜
    private String note;                // 비고
    private LocalDateTime createdAt;    // 기록일
    private String createdBy;           // 기록자
    
    // 조인용 추가 필드
    private String partName;            // 부품명 (parts 테이블 조인)
    private String unit;                // 단위 (parts 테이블 조인)
}
