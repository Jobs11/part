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
                "user 등록: " + user.getUsername(),
                null,
                null);
    }

    @Override
    @Transactional
    public void updateUser(UserDTO user) {
        // 비밀번호 변경이 있는 경우 현재 비밀번호 검증
        if (user.getPassword() != null && !user.getPassword().trim().isEmpty()) {
            // 현재 비밀번호가 제공된 경우 검증
            if (user.getCurrentPassword() != null && !user.getCurrentPassword().trim().isEmpty()) {
                UserDTO existingUser = userMapper.findById(user.getUserId());
                if (existingUser == null) {
                    throw new RuntimeException("사용자를 찾을 수 없습니다.");
                }

                // 현재 비밀번호 확인
                if (!passwordEncoder.matches(user.getCurrentPassword(), existingUser.getPassword())) {
                    throw new RuntimeException("현재 비밀번호가 일치하지 않습니다.");
                }
            }

            // 새 비밀번호 인코딩
            user.setPassword(passwordEncoder.encode(user.getPassword()));
        }

        userMapper.updateUser(user);

        auditLogger.log("user",
                user.getUserId() != null ? user.getUserId().longValue() : null,
                "UPDATE",
                "user 수정: " + user.getUsername(),
                null,
                null);
    }

    @Override
    @Transactional
    public void deleteUser(Integer userId) {
        userMapper.deleteUser(userId);

        auditLogger.log("user",
                userId != null ? userId.longValue() : null,
                "DELETE",
                "user 삭제: " + userId,
                null,
                null);
    }
}
