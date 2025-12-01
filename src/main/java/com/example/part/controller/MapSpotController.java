package com.example.part.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.part.dto.MapSpotDTO;
import com.example.part.dto.MapSpotSyncRequest;
import com.example.part.service.AuditLogger;
import com.example.part.service.MapSpotService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/livewalk/map-spot")
@RequiredArgsConstructor
public class MapSpotController {

    private final MapSpotService mapSpotService;
    private final AuditLogger auditLogger;

    @PostMapping("/bulk")
    public ResponseEntity<?> saveMapSpots(@RequestBody List<MapSpotDTO> spots) {
        mapSpotService.saveMapSpots(spots);
        log.info("Map spots saved: {}", spots.size());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/image/{imageId}")
    public ResponseEntity<List<MapSpotDTO>> getSpotsByImage(@PathVariable("imageId") Long imageId) {
        return ResponseEntity.ok(mapSpotService.getMapSpotsByImageId(imageId));
    }

    @PostMapping("/sync")
    public ResponseEntity<?> syncMapSpots(@RequestBody MapSpotSyncRequest request) {
        int deleteCount = request.getToDelete() != null ? request.getToDelete().size() : 0;
        int updateCount = request.getToUpdate() != null ? request.getToUpdate().size() : 0;
        int insertCount = request.getToInsert() != null ? request.getToInsert().size() : 0;

        mapSpotService.syncMapSpots(request);

        // 감사 로그 기록
        Long imageId = null;
        if (request.getToUpdate() != null && !request.getToUpdate().isEmpty()) {
            imageId = request.getToUpdate().get(0).getImageId();
        } else if (request.getToInsert() != null && !request.getToInsert().isEmpty()) {
            imageId = request.getToInsert().get(0).getImageId();
        }

        String summary = String.format("도면 좌표 동기화 (삭제: %d, 수정: %d, 추가: %d)",
                                       deleteCount, updateCount, insertCount);
        String changedFields = String.format("삭제=%d건, 수정=%d건, 추가=%d건",
                                             deleteCount, updateCount, insertCount);

        auditLogger.log("map_spot", imageId, "SYNC", summary, changedFields, null);

        log.info("Map spots sync - delete: {}, update: {}, insert: {}",
                 deleteCount, updateCount, insertCount);
        return ResponseEntity.ok().build();
    }
}
