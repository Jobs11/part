package com.example.part.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.part.dto.MapSpotDTO;
import com.example.part.mapper.MapSpotMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class MapSpotServiceImpl implements MapSpotService {

    private final MapSpotMapper mapSpotMapper;

    @Override
    @Transactional
    public void saveMapSpots(List<MapSpotDTO> spots) {
        if (spots == null || spots.isEmpty()) {
            return;
        }
        int inserted = mapSpotMapper.insertMapSpots(spots);
        log.info("Map spots inserted: {}", inserted);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MapSpotDTO> getMapSpotsByImageId(Long imageId) {
        if (imageId == null) {
            return java.util.Collections.emptyList();
        }
        return mapSpotMapper.findByImageId(imageId);
    }
}
