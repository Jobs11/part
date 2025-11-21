package com.example.part.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.example.part.dto.GeneralImageDTO;

@Mapper
public interface GeneralImageMapper {

    void insertImage(GeneralImageDTO image);

    List<GeneralImageDTO> selectAllImages();

    GeneralImageDTO selectImageById(@Param("imageId") Long imageId);

    void deleteImage(@Param("imageId") Long imageId);

    void updateFieldCoordinates(@Param("imageId") Long imageId, @Param("fieldCoordinates") String fieldCoordinates);
}
