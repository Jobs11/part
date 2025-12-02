package com.example.part.dto;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;

/**
 * 깨진 T 문자를 정규화하는 LocalDateTime Deserializer
 *
 * JavaScript에서 보내는 "2025-12-02T15:29:00" 문자열의 T가
 * 유니코드 특수문자로 변환되는 경우를 처리
 */
public class SafeLocalDateTimeDeserializer extends JsonDeserializer<LocalDateTime> {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Override
    public LocalDateTime deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        String dateString = p.getText();

        if (dateString == null || dateString.trim().isEmpty()) {
            return null;
        }

        // 🔥 모든 유니코드 특수문자 T를 정상 T로 변환
        // index 10 위치(날짜와 시간 사이)의 문자를 강제로 'T'로 교체
        if (dateString.length() >= 11) {
            char charAtIndex10 = dateString.charAt(10);

            // 정상적인 'T'가 아닌 경우 강제 교체
            if (charAtIndex10 != 'T') {
                dateString = dateString.substring(0, 10) + 'T' + dateString.substring(11);
            }
        }

        // ISO 8601 형식 파싱 시도 (yyyy-MM-ddTHH:mm:ss)
        try {
            return LocalDateTime.parse(dateString);
        } catch (Exception e1) {
            // 실패하면 공백 구분 형식 시도 (yyyy-MM-dd HH:mm:ss)
            try {
                String normalized = dateString.replace('T', ' ').trim();
                return LocalDateTime.parse(normalized, FORMATTER);
            } catch (Exception e2) {
                throw new IOException("날짜 파싱 실패: " + dateString +
                    " (원본 문자열, index 10의 문자: '" + (dateString.length() > 10 ? dateString.charAt(10) : "N/A") +
                    "', 유니코드: " + (dateString.length() > 10 ? (int)dateString.charAt(10) : "N/A") + ")", e2);
            }
        }
    }
}
