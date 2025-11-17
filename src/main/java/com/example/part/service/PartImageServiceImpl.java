package com.example.part.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.example.part.dto.PartImageDTO;
import com.example.part.mapper.PartImageMapper;

import jakarta.annotation.PostConstruct;

@Service
public class PartImageServiceImpl implements PartImageService {

    @Autowired
    private PartImageMapper partImageMapper;

    @Value("${file.upload-dir:/var/livewalk/uploads/images}")
    private String uploadDir;

    @PostConstruct
    public void init() {
        try {
            // 업로드 디렉토리 생성
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            System.out.println("=== 파일 업로드 경로: " + uploadPath.toAbsolutePath() + " ===");
        } catch (IOException e) {
            throw new RuntimeException("업로드 디렉토리 생성 실패: " + uploadDir, e);
        }
    }

    @Override
    public PartImageDTO uploadImage(MultipartFile file, Integer incomingId, String imageType) throws Exception {
        // 파일 저장
        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }

        // UUID로 고유한 파일명 생성
        String savedFilename = UUID.randomUUID().toString() + extension;
        Path filePath = Paths.get(uploadDir, savedFilename);

        // 파일 저장
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        // URL 생성 (상대 경로)
        String imageUrl = "/uploads/images/" + savedFilename;

        System.out.println("=== 이미지 업로드 ===");
        System.out.println("파일 저장 경로: " + filePath.toAbsolutePath());
        System.out.println("생성된 URL: " + imageUrl);
        System.out.println("==================");

        // DTO 생성
        PartImageDTO dto = new PartImageDTO();
        dto.setIncomingId(incomingId);
        dto.setImageType(imageType);
        dto.setImageUrl(imageUrl);
        dto.setStorageType("local");
        dto.setFileName(originalFilename);
        dto.setFileSize(file.getSize());
        dto.setMimeType(file.getContentType());
        dto.setDisplayOrder(0);

        // DB 저장
        partImageMapper.insertImage(dto);

        return dto;
    }

    @Override
    public List<PartImageDTO> getImagesByIncomingId(Integer incomingId) {
        return partImageMapper.selectByIncomingId(incomingId);
    }

    @Override
    public List<PartImageDTO> getImagesByType(Integer incomingId, String imageType) {
        return partImageMapper.selectByIncomingIdAndType(incomingId, imageType);
    }

    @Override
    public void deleteImage(Integer imageId) throws Exception {
        // DB에서 이미지 정보 조회
        PartImageDTO image = partImageMapper.selectById(imageId);

        if (image != null && "local".equals(image.getStorageType())) {
            // 로컬 파일 삭제
            String imageUrl = image.getImageUrl();
            if (imageUrl != null && imageUrl.startsWith("/uploads/images/")) {
                String filename = imageUrl.substring("/uploads/images/".length());
                Path filePath = Paths.get(uploadDir, filename);
                try {
                    Files.deleteIfExists(filePath);
                } catch (IOException e) {
                    // 파일 삭제 실패해도 DB는 삭제
                    e.printStackTrace();
                }
            }
        }

        // DB에서 삭제
        partImageMapper.deleteImage(imageId);
    }

    @Override
    public List<PartImageDTO> getAllImages() {
        return partImageMapper.selectAllImages();
    }
}
