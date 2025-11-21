package com.example.part.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.part.dto.UserDTO;
import com.example.part.mapper.UserMapper;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/livewalk/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserMapper userMapper;

    @GetMapping("/current-user")
    public ResponseEntity<Map<String, Object>> getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        Map<String, Object> userInfo = new HashMap<>();
        if (authentication != null && authentication.isAuthenticated()
                && !authentication.getPrincipal().equals("anonymousUser")) {
            String username = authentication.getName();
            UserDTO user = userMapper.findByUsername(username);

            if (user != null) {
                userInfo.put("userId", user.getUserId());
                userInfo.put("username", user.getUsername());
                userInfo.put("fullName", user.getFullName());
                userInfo.put("email", user.getEmail());
                userInfo.put("authenticated", true);

                // 권한 확인
                boolean isAdmin = authentication.getAuthorities().stream()
                        .anyMatch(auth -> auth.getAuthority().equals("ROLE_ADMIN"));
                userInfo.put("isAdmin", isAdmin);
            } else {
                userInfo.put("authenticated", false);
                userInfo.put("isAdmin", false);
            }
        } else {
            userInfo.put("authenticated", false);
            userInfo.put("isAdmin", false);
        }

        return ResponseEntity.ok(userInfo);
    }
}
