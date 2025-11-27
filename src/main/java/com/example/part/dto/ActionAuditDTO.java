package com.example.part.dto;

import java.time.LocalDateTime;

import lombok.Data;

@Data
public class ActionAuditDTO {
    private Long auditId;
    private String entityType;
    private Long entityId;
    private String action;
    private String summary;
    private String changedFields; // JSON 문자열
    private String performedBy;
    private String performedIp;
    private String userAgent;
    private LocalDateTime createdAt;
}
