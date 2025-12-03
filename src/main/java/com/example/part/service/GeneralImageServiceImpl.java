package com.example.part.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.example.part.dto.GeneralImageDTO;
import com.example.part.mapper.GeneralImageMapper;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GeneralImageServiceImpl implements GeneralImageService {

    private final GeneralImageMapper generalImageMapper;
    private final AuditLogger auditLogger;

    @Value("${file.upload-dir:/var/livewalk/uploads/images}")
    private String uploadDir;

    @PostConstruct
    public void init() {
        try {
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
        } catch (IOException e) {
            throw new RuntimeException("업로드 디렉토리 생성 실패: " + uploadDir, e);
        }
    }

    @Override
    @Transactional
    public GeneralImageDTO uploadImage(String title, String description, MultipartFile file, Integer uploadedBy) {
        try {
            // 파일명 생성
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }

            String savedFilename = UUID.randomUUID().toString() + extension;
            Path filePath = Paths.get(uploadDir, savedFilename);

            // 파일 저장
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // 파일 타입 감지
            String fileType = "image";
            if (extension.toLowerCase().equals(".pdf")) {
                fileType = "pdf";
            }

            // DTO 생성
            GeneralImageDTO dto = new GeneralImageDTO();
            dto.setTitle(title);
            dto.setDescription(description);
            dto.setFileName(savedFilename);
            dto.setOriginalName(originalFilename);
            dto.setFilePath(filePath.toString());
            dto.setFileSize(file.getSize());
            dto.setFileType(fileType);
            dto.setUploadedBy(uploadedBy);

            // DB 저장
            generalImageMapper.insertImage(dto);

            // 감사로그 기록
            auditLogger.log(
                "library",
                dto.getImageId(),
                "업로드",
                String.format("자료실 업로드: %s", title),
                null,
                null
            );

            return dto;
        } catch (IOException e) {
            throw new RuntimeException("파일 업로드 실패: " + e.getMessage(), e);
        }
    }

    @Override
    public List<GeneralImageDTO> getAllImages() {
        return generalImageMapper.selectAllImages();
    }

    @Override
    public GeneralImageDTO getImageById(Long imageId) {
        return generalImageMapper.selectImageById(imageId);
    }

    @Override
    @Transactional
    public void deleteImage(Long imageId) {
        GeneralImageDTO image = generalImageMapper.selectImageById(imageId);
        String title = null;

        if (image != null) {
            title = image.getTitle();

            // 실제 파일 삭제
            try {
                Path filePath = Paths.get(uploadDir, image.getFileName());
                Files.deleteIfExists(filePath);
            } catch (IOException e) {
                System.err.println("파일 삭제 실패: " + e.getMessage());
            }

            // DB에서 삭제
            generalImageMapper.deleteImage(imageId);

            // 감사로그 기록
            auditLogger.log(
                "library",
                imageId,
                "삭제",
                String.format("자료실 삭제: %s", title != null ? title : "알 수 없음"),
                null,
                null
            );
        }
    }

    @Override
    public org.springframework.core.io.Resource loadImageAsResource(String fileName) {
        try {
            Path filePath = Paths.get(uploadDir, fileName);
            org.springframework.core.io.Resource resource = new org.springframework.core.io.UrlResource(filePath.toUri());

            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new RuntimeException("파일을 찾을 수 없거나 읽을 수 없습니다: " + fileName);
            }
        } catch (Exception e) {
            throw new RuntimeException("파일 로딩 실패: " + fileName, e);
        }
    }

    @Override
    @Transactional
    public void updateFieldCoordinates(Long imageId, String coordinatesJson) {
        GeneralImageDTO image = generalImageMapper.selectImageById(imageId);
        if (image == null) {
            throw new RuntimeException("이미지를 찾을 수 없습니다: " + imageId);
        }

        image.setFieldCoordinates(coordinatesJson);
        generalImageMapper.updateFieldCoordinates(imageId, coordinatesJson);
    }
}
