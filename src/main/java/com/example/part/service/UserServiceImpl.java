package com.example.part.service;

import java.util.List;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.part.dto.UserDTO;
import com.example.part.mapper.UserMapper;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogger auditLogger;

    @Override
    public UserDTO findByUsername(String username) {
        return userMapper.findByUsername(username);
    }

    @Override
    public UserDTO findById(Integer userId) {
        return userMapper.findById(userId);
    }

    @Override
    public List<UserDTO> getAllUsers() {
        return userMapper.selectAllUsers();
    }

    @Override
    @Transactional
    public void registerUser(UserDTO user) {
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        if (user.getUserRole() == null) {
            user.setUserRole("USER");
        }
        userMapper.insertUser(user);

        auditLogger.log("user",
                user.getUserId() != null ? user.getUserId().longValue() : null,
                "CREATE",
                "사용자 등록: " + user.getUsername(),
                null,
                null);
    }

    @Override
    @Transactional
    public void updateUser(UserDTO user) {
        // 기존 데이터 조회
        UserDTO before = userMapper.findById(user.getUserId());

        // 비밀번호 변경이 있는 경우 현재 비밀번호 검증
        boolean passwordChanged = false;
        if (user.getPassword() != null && !user.getPassword().trim().isEmpty()) {
            // 현재 비밀번호가 제공된 경우 검증
            if (user.getCurrentPassword() != null && !user.getCurrentPassword().trim().isEmpty()) {
                if (before == null) {
                    throw new RuntimeException("사용자를 찾을 수 없습니다.");
                }

                // 현재 비밀번호 확인
                if (!passwordEncoder.matches(user.getCurrentPassword(), before.getPassword())) {
                    throw new RuntimeException("현재 비밀번호가 일치하지 않습니다.");
                }
            }

            // 새 비밀번호 인코딩
            user.setPassword(passwordEncoder.encode(user.getPassword()));
            passwordChanged = true;
        }

        userMapper.updateUser(user);

        // 변경 필드 추적
        StringBuilder changedFields = new StringBuilder("{");
        boolean hasChanges = false;

        if (user.getUsername() != null && !before.getUsername().equals(user.getUsername())) {
            changedFields.append(String.format("\"%s\": {\"변경전\": \"%s\", \"변경후\": \"%s\"}",
                    auditLogger.translateFieldName("user", "username"),
                    before.getUsername(),
                    user.getUsername()));
            hasChanges = true;
        }

        if (passwordChanged) {
            if (hasChanges) changedFields.append(", ");
            changedFields.append(String.format("\"%s\": {\"변경전\": \"****\", \"변경후\": \"****\"}",
                    auditLogger.translateFieldName("user", "password")));
            hasChanges = true;
        }

        if (user.getUserRole() != null && !before.getUserRole().equals(user.getUserRole())) {
            if (hasChanges) changedFields.append(", ");
            changedFields.append(String.format("\"%s\": {\"변경전\": \"%s\", \"변경후\": \"%s\"}",
                    auditLogger.translateFieldName("user", "role"),
                    before.getUserRole(),
                    user.getUserRole()));
            hasChanges = true;
        }

        changedFields.append("}");

        auditLogger.log("user",
                user.getUserId() != null ? user.getUserId().longValue() : null,
                "UPDATE",
                "사용자 수정: " + user.getUsername(),
                hasChanges ? changedFields.toString() : null,
                null);
    }

    @Override
    @Transactional
    public void deleteUser(Integer userId) {
        userMapper.deleteUser(userId);

        auditLogger.log("user",
                userId != null ? userId.longValue() : null,
                "DELETE",
                "사용자 삭제: " + userId,
                null,
                null);
    }
}
