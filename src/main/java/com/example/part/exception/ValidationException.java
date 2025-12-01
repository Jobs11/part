package com.example.part.exception;

/**
 * 데이터 검증 실패 시 발생하는 예외
 */
public class ValidationException extends RuntimeException {
    public ValidationException(String message) {
        super(message);
    }

    public ValidationException(String message, Throwable cause) {
        super(message, cause);
    }
}
