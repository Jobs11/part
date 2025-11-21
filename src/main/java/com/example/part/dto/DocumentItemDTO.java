package com.example.part.dto;

import lombok.Data;

@Data
public class DocumentItemDTO {
    private String itemName;
    private String spec;
    private Integer quantity;
    private Double unitPrice;
    private Double supplyPrice;
    private Double tax;
    private String notes;
}
