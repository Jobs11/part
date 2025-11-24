package com.example.part.mapper;

import java.time.LocalDateTime;
import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.example.part.dto.AccessLogDTO;

@Mapper
public interface AccessLogMapper {

    void insertAccessLog(AccessLogDTO accessLog);

    void updateLogoutTime(@Param("sessionId") String sessionId, @Param("logoutTime") LocalDateTime logoutTime, @Param("logoutIp") String logoutIp);

    List<AccessLogDTO> selectAllAccessLogs();

    List<AccessLogDTO> selectAccessLogsByUserId(@Param("userId") Integer userId);

    AccessLogDTO selectAccessLogBySessionId(@Param("sessionId") String sessionId);

    List<AccessLogDTO> selectActiveSessions();
}
