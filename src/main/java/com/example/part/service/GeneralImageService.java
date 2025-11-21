package com.example.part.service;

import java.util.List;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import com.example.part.dto.GeneralImageDTO;

public interface GeneralImageService {

    GeneralImageDTO uploadImage(String title, String description, MultipartFile file, Integer uploadedBy);

    List<GeneralImageDTO> getAllImages();

    GeneralImageDTO getImageById(Long imageId);

    void deleteImage(Long imageId);

    Resource loadImageAsResource(String fileName);

    void updateFieldCoordinates(Long imageId, String coordinatesJson);
}
