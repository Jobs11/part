package com.example.part.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.part.dto.AccessLogDTO;
import com.example.part.mapper.AccessLogMapper;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AccessLogServiceImpl implements AccessLogService {

    private final AccessLogMapper accessLogMapper;

    @Override
    @Transactional
    public void logLogin(Integer userId, String username, String ipAddress, String userAgent, String sessionId) {
        AccessLogDTO accessLog = new AccessLogDTO();
        accessLog.setUserId(userId);
        accessLog.setUsername(username);
        accessLog.setLoginTime(LocalDateTime.now());
        accessLog.setIpAddress(ipAddress);
        accessLog.setUserAgent(userAgent);
        accessLog.setSessionId(sessionId);

        accessLogMapper.insertAccessLog(accessLog);
    }

    @Override
    @Transactional
    public void logLogout(String sessionId, String logoutIp) {
        if (sessionId != null && !sessionId.isEmpty()) {
            accessLogMapper.updateLogoutTime(sessionId, LocalDateTime.now(), logoutIp);
        }
    }

    @Override
    public List<AccessLogDTO> getAllAccessLogs() {
        return accessLogMapper.selectAllAccessLogs();
    }

    @Override
    public List<AccessLogDTO> getAccessLogsByUserId(Integer userId) {
        return accessLogMapper.selectAccessLogsByUserId(userId);
    }
}
