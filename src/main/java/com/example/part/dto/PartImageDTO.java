package com.example.part.dto;

import lombok.Data;

@Data
public class PartImageDTO {
    private Integer imageId;
    private Integer incomingId;
    private String imageType; // delivery, part, etc
    private String imageUrl;
    private String storageType; // local, cloudinary, s3
    private String fileName;
    private Long fileSize;
    private String mimeType;
    private Integer displayOrder;
    private String createdAt;
}
