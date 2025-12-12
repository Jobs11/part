package com.example.part.dto;

import java.time.LocalDateTime;

import lombok.Data;

@Data
public class UserDTO {
    private Integer userId;
    private String username;
    private String password;
    private String currentPassword; // 비밀번호 변경 시 현재 비밀번호 (DB에 저장 안됨)
    private String userRole;
    private String fullName;
    private String position;
    private String department;
    private String email;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
