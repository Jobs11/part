package com.example.part.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonFormat;

import lombok.Data;

@Data
public class PartIncomingDTO {
    private Integer incomingId;
    private String partNumber;
    private Integer categoryId;
    private String categoryName; // JOIN용
    private String partName;
    private String location; // 부품 위치 (입력용, 저장되지 않음) - 이전 방식
    private String cabinetLocation; // 캐비넷 위치 (A-1 형식)
    private String mapLocation; // 도면 위치 (8-A 형식)
    private String description;
    private String projectName; // 프로젝트명
    private String unit;
    private Integer paymentMethodId;
    private String paymentMethodName;

    // 입고 수량
    private Integer incomingQuantity;

    // 금액 정보
    private BigDecimal purchasePrice;
    private String currency;
    private BigDecimal exchangeRate;
    private BigDecimal originalPrice;

    // 구매 정보
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate purchaseDate;
    private String supplier;
    private String purchaser;
    private String invoiceNumber;

    // 기타
    private String note;
    private String createdBy;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;
}
