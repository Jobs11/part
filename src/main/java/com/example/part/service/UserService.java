package com.example.part.service;

import java.util.List;

import com.example.part.dto.UserDTO;

public interface UserService {
    UserDTO findByUsername(String username);

    UserDTO findById(Integer userId);

    List<UserDTO> getAllUsers();

    void registerUser(UserDTO user);

    void updateUser(UserDTO user);

    void deleteUser(Integer userId);
}
