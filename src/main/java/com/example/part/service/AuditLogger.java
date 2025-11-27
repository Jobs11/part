package com.example.part.service;

import org.springframework.security.core.Authentication;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.example.part.dto.ActionAuditDTO;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class AuditLogger {

    private final ActionAuditService actionAuditService;

    public void log(String entityType, Long entityId, String action, String summary, String changedFields,
            String performedBy) {
        ActionAuditDTO audit = new ActionAuditDTO();
        audit.setEntityType(entityType);
        audit.setEntityId(entityId);
        audit.setAction(action);
        audit.setSummary(summary);
        audit.setChangedFields(changedFields);
        audit.setPerformedBy(performedBy != null ? performedBy : resolveCurrentUsername());

        try {
            actionAuditService.log(audit);
        } catch (Exception e) {
            log.warn("감사 로그 기록 실패: {}", e.getMessage(), e);
        }
    }

    private String resolveCurrentUsername() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null && attrs.getRequest() != null && attrs.getRequest().getUserPrincipal() != null) {
                return attrs.getRequest().getUserPrincipal().getName();
            }
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getName() != null) {
                return auth.getName();
            }
        } catch (Exception ignored) {
        }
        return "system";
    }

    public String currentUserOrSystem() {
        return resolveCurrentUsername();
    }
}
