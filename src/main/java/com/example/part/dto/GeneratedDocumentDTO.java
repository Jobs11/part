package com.example.part.dto;

import java.util.List;

import lombok.Data;

@Data
public class GeneratedDocumentDTO {
    private Long documentId;
    private Integer incomingId;
    private Long templateId;
    private String title;
    private String fileName;
    private String filePath;
    private Long fileSize;

    // Document data fields (여러 품목) - 표 형식
    private List<DocumentItemDTO> items;

    // 개별 필드 좌표 방식 (NEW)
    private List<DocumentFieldDTO> fields;

    // 표 시작 위치 좌표 (PDF 좌표계: 왼쪽 아래가 원점) - 표 형식용
    private Float tableX; // 왼쪽 여백 (기본값: 50)
    private Float tableY; // 하단에서부터의 높이 (기본값: 페이지 높이 - 250)

    // Legacy fields (단일 품목 - 하위 호환성)
    private String itemName;
    private String spec;
    private Integer quantity;
    private Double unitPrice;
    private Double supplyPrice;
    private Double tax;
    private String notes;

    private Integer createdBy;
    private String createdAt;
    private Boolean isActive;
}
