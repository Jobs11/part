package com.example.part.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.example.part.dto.PartImageDTO;

@Mapper
public interface PartImageMapper {

    // 이미지 등록
    void insertImage(PartImageDTO dto);

    // ID로 조회
    PartImageDTO selectById(Integer imageId);

    // 입고 ID로 조회
    List<PartImageDTO> selectByIncomingId(Integer incomingId);

    // 입고 ID + 이미지 타입으로 조회
    List<PartImageDTO> selectByIncomingIdAndType(@Param("incomingId") Integer incomingId,
            @Param("imageType") String imageType);

    // 전체 조회
    List<PartImageDTO> selectAllImages();

    // 이미지 삭제
    void deleteImage(Integer imageId);
}
