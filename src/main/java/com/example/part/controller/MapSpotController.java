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
import com.example.part.service.MapSpotService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/livewalk/map-spot")
@RequiredArgsConstructor
public class MapSpotController {

    private final MapSpotService mapSpotService;

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
}
