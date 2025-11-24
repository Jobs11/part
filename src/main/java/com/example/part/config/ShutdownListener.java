package com.example.part.config;

import java.util.List;

import org.springframework.context.event.ContextClosedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import com.example.part.dto.AccessLogDTO;
import com.example.part.service.AccessLogService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class ShutdownListener {

    private final AccessLogService accessLogService;

    @EventListener
    public void onShutdown(ContextClosedEvent event) {
        log.info("서버 종료 감지 - 활성 세션 로그아웃 처리 시작");

        try {
            // 로그아웃 시간이 null인 활성 세션들 조회
            List<AccessLogDTO> activeSessions = accessLogService.getActiveSessions();

            if (activeSessions != null && !activeSessions.isEmpty()) {
                log.info("활성 세션 {}개 발견 - 자동 로그아웃 처리", activeSessions.size());

                for (AccessLogDTO session : activeSessions) {
                    try {
                        // 서버 종료로 인한 로그아웃 기록
                        accessLogService.logLogout(session.getSessionId(), "SERVER_SHUTDOWN");
                        log.info("서버 종료로 인한 로그아웃 기록 - User ID: {}, Session ID: {}",
                                session.getUserId(), session.getSessionId());
                    } catch (Exception e) {
                        log.error("로그아웃 처리 실패 - Session ID: {}, Error: {}",
                                session.getSessionId(), e.getMessage());
                    }
                }

                log.info("서버 종료 로그아웃 처리 완료");
            } else {
                log.info("활성 세션 없음");
            }
        } catch (Exception e) {
            log.error("서버 종료 처리 중 오류 발생: ", e);
        }
    }
}
