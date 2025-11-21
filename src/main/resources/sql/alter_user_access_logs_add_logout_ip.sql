-- 로그아웃 IP 컬럼 추가
ALTER TABLE user_access_logs
ADD COLUMN logout_ip VARCHAR(45) NULL AFTER logout_time;
