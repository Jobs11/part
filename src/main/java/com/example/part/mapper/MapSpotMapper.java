package com.example.part.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

import com.example.part.dto.MapSpotDTO;

@Mapper
public interface MapSpotMapper {

    int insertMapSpots(List<MapSpotDTO> spots);

    List<MapSpotDTO> findByImageId(Long imageId);

    int updateMapSpot(MapSpotDTO spot);

    int deleteMapSpots(List<Integer> spotIds);
}
