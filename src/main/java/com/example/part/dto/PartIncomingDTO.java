package com.example.part.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import lombok.Data;

@Data
public class PartIncomingDTO {
    private Integer incomingId;
    private String partNumber;
    private Integer categoryId;
    private String categoryName; // JOIN용
    private String partName;
    private String location; // 부품 위치 (입력용, 저장되지 않음)
    private String description;
    private String unit;

    // 입고 수량
    private Integer incomingQuantity;

    // 금액 정보
    private BigDecimal purchasePrice;
    private String currency;
    private BigDecimal exchangeRate;
    private BigDecimal originalPrice;

    // 구매 정보
    private LocalDate purchaseDate;
    private String supplier;
    private String invoiceNumber;

    // 기타
    private String note;
    private String createdBy;
    private LocalDateTime createdAt;
}
