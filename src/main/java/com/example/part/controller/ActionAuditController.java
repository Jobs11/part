package com.example.part.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.part.dto.ActionAuditDTO;
import com.example.part.service.ActionAuditService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/livewalk/action-audit")
@RequiredArgsConstructor
public class ActionAuditController {

    private final ActionAuditService actionAuditService;

    @GetMapping
    public ResponseEntity<List<ActionAuditDTO>> getRecentAudits(
            @RequestParam(value = "limit", defaultValue = "200") int limit) {
        return ResponseEntity.ok(actionAuditService.getRecent(limit));
    }
}
