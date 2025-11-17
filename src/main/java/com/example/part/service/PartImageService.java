package com.example.part.service;

import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import com.example.part.dto.PartImageDTO;

public interface PartImageService {

    // 이미지 업로드
    PartImageDTO uploadImage(MultipartFile file, Integer incomingId, String imageType) throws Exception;

    // 특정 입고 ID의 이미지 목록 조회
    List<PartImageDTO> getImagesByIncomingId(Integer incomingId);

    // 이미지 타입별 조회
    List<PartImageDTO> getImagesByType(Integer incomingId, String imageType);

    // 이미지 삭제
    void deleteImage(Integer imageId) throws Exception;

    // 전체 이미지 목록
    List<PartImageDTO> getAllImages();
}
