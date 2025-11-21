package com.example.part.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.part.dto.AccessLogDTO;
import com.example.part.service.AccessLogService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/livewalk/access-logs")
@RequiredArgsConstructor
public class AccessLogController {

    private final AccessLogService accessLogService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<AccessLogDTO>> getAllAccessLogs() {
        List<AccessLogDTO> logs = accessLogService.getAllAccessLogs();
        return ResponseEntity.ok(logs);
    }

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<AccessLogDTO>> getAccessLogsByUserId(@PathVariable Integer userId) {
        List<AccessLogDTO> logs = accessLogService.getAccessLogsByUserId(userId);
        return ResponseEntity.ok(logs);
    }
}
