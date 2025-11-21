package com.example.part.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

import com.example.part.dto.UserDTO;

@Mapper
public interface UserMapper {
    UserDTO findByUsername(String username);

    UserDTO findById(Integer userId);

    List<UserDTO> selectAllUsers();

    void insertUser(UserDTO user);

    void updateUser(UserDTO user);

    void deleteUser(Integer userId);
}
