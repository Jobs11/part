package com.example.part.service;

import org.springframework.stereotype.Service;

import com.example.part.dto.ActionAuditDTO;
import com.example.part.mapper.ActionAuditMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class ActionAuditServiceImpl implements ActionAuditService {

    private final ActionAuditMapper actionAuditMapper;

    @Override
    public void log(ActionAuditDTO audit) {
        try {
            actionAuditMapper.insertAudit(audit);
        } catch (Exception e) {
            log.warn("감사 로그 저장 실패: {}", e.getMessage(), e);
        }
    }

    @Override
    public java.util.List<ActionAuditDTO> getRecent(int limit) {
        int resolvedLimit = (limit > 0 && limit <= 1000) ? limit : 200;
        try {
            return actionAuditMapper.selectRecent(resolvedLimit);
        } catch (Exception e) {
            log.warn("감사 로그 조회 실패: {}", e.getMessage(), e);
            return java.util.Collections.emptyList();
        }
    }
}
