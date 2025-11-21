package com.example.part.service;

import java.util.List;

import com.example.part.dto.AccessLogDTO;

public interface AccessLogService {

    void logLogin(Integer userId, String username, String ipAddress, String userAgent, String sessionId);

    void logLogout(String sessionId, String logoutIp);

    List<AccessLogDTO> getAllAccessLogs();

    List<AccessLogDTO> getAccessLogsByUserId(Integer userId);
}
