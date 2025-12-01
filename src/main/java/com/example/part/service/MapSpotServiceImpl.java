package com.example.part.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.part.dto.MapSpotDTO;
import com.example.part.dto.MapSpotSyncRequest;
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

    @Override
    @Transactional
    public void syncMapSpots(MapSpotSyncRequest request) {
        int deletedCount = 0;
        int updatedCount = 0;
        int insertedCount = 0;

        // 1. 삭제 처리
        if (request.getToDelete() != null && !request.getToDelete().isEmpty()) {
            deletedCount = mapSpotMapper.deleteMapSpots(request.getToDelete());
            log.info("Map spots deleted: {}", deletedCount);
        }

        // 2. 수정 처리
        if (request.getToUpdate() != null && !request.getToUpdate().isEmpty()) {
            for (MapSpotDTO spot : request.getToUpdate()) {
                updatedCount += mapSpotMapper.updateMapSpot(spot);
            }
            log.info("Map spots updated: {}", updatedCount);
        }

        // 3. 추가 처리
        if (request.getToInsert() != null && !request.getToInsert().isEmpty()) {
            insertedCount = mapSpotMapper.insertMapSpots(request.getToInsert());
            log.info("Map spots inserted: {}", insertedCount);
        }

        log.info("Map spots sync completed - deleted: {}, updated: {}, inserted: {}",
                 deletedCount, updatedCount, insertedCount);
    }
}
