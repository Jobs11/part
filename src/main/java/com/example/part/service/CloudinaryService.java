package com.example.part.service;

import java.io.IOException;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;

@Service
public class CloudinaryService {

    @Autowired
    private Cloudinary cloudinary;

    /**
     * 이미지 업로드
     *
     * @param file   업로드할 파일
     * @param folder Cloudinary 폴더명 (예: "parts", "delivery")
     * @return Map (url, public_id 포함)
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> uploadImage(MultipartFile file, String folder) throws IOException {
        return cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap(
                        "folder", folder,
                        "resource_type", "image"));
    }

    /**
     * 이미지 삭제
     *
     * @param publicId Cloudinary public_id
     */

    public void deleteImage(String publicId) throws IOException {
        cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
    }
}
