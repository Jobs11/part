package com.example.part.service;

import com.example.part.dto.ActionAuditDTO;

public interface ActionAuditService {

    void log(ActionAuditDTO audit);

    java.util.List<ActionAuditDTO> getRecent(int limit);
}
