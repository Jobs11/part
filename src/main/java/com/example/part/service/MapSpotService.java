package com.example.part.service;

import java.util.List;

import com.example.part.dto.MapSpotDTO;
import com.example.part.dto.MapSpotSyncRequest;

public interface MapSpotService {
    void saveMapSpots(List<MapSpotDTO> spots);

    List<MapSpotDTO> getMapSpotsByImageId(Long imageId);

    void syncMapSpots(MapSpotSyncRequest request);
}
