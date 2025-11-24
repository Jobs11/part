package com.example.part.service;

import java.util.List;

import com.example.part.dto.MapSpotDTO;

public interface MapSpotService {
    void saveMapSpots(List<MapSpotDTO> spots);

    List<MapSpotDTO> getMapSpotsByImageId(Long imageId);
}
