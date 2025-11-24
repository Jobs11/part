package com.example.part.config;

import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Component;

import com.example.part.service.AccessLogService;

import jakarta.servlet.annotation.WebListener;
import jakarta.servlet.http.HttpSessionEvent;
import jakarta.servlet.http.HttpSessionListener;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@WebListener
public class SessionExpirationListener implements HttpSessionListener {

    private static ApplicationContext context;

    // ApplicationContext를 정적으로 저장하기 위한 setter
    public static void setApplicationContext(ApplicationContext ctx) {
        context = ctx;
    }

    @Override
    public void sessionCreated(HttpSessionEvent se) {
        String sessionId = se.getSession().getId();
        log.info("세션 생성됨 - Session ID: {}", sessionId);
    }

    @Override
    public void sessionDestroyed(HttpSessionEvent se) {
        String sessionId = se.getSession().getId();
        log.info("세션 만료됨 - Session ID: {}", sessionId);

        // 세션 만료 시 자동 로그아웃 기록
        try {
            if (context != null) {
                AccessLogService accessLogService = context.getBean(AccessLogService.class);
                // 세션 만료로 인한 로그아웃 (IP는 null 또는 "SESSION_EXPIRED"로 표시)
                accessLogService.logLogout(sessionId, "SESSION_EXPIRED");
                log.info("세션 만료로 인한 로그아웃 기록 완료 - Session ID: {}", sessionId);
            }
        } catch (Exception e) {
            log.error("세션 만료 로그 기록 실패 - Session ID: {}, Error: {}", sessionId, e.getMessage());
        }
    }
}
