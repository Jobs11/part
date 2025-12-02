package com.example.part.controller;

import java.util.List;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.part.dto.PartLocationDTO;
import com.example.part.service.PartLocationService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/livewalk/part-locations")
@RequiredArgsConstructor
public class PartLocationController {

    private final PartLocationService partLocationService;

    @GetMapping
    public List<PartLocationDTO> getAllLocations() {
        return partLocationService.getAllLocations();
    }

    @GetMapping("/code/{code}")
    public PartLocationDTO getLocation(@PathVariable String code) {
        return partLocationService.getLocationByCode(code);
    }

    @GetMapping("/part")
    public PartLocationDTO getLocationByPartNumber(@RequestParam String partNumber) {
        return partLocationService.getLocationByPartNumber(partNumber);
    }

    @GetMapping("/incoming/{incomingId}")
    public org.springframework.http.ResponseEntity<PartLocationDTO> getLocationByIncomingId(@PathVariable Integer incomingId) {
        PartLocationDTO location = partLocationService.getLocationByIncomingId(incomingId);
        // 위치 정보가 없으면 null 반환 (404 대신 200 OK with null body)
        return org.springframework.http.ResponseEntity.ok(location);
    }

    @GetMapping("/check-cabinet")
    public PartLocationDTO checkCabinetLocation(@RequestParam String posX, @RequestParam Integer posY) {
        return partLocationService.getLocationByCabinet(posX, posY);
    }

    @GetMapping("/occupied-cabinets")
    public List<PartLocationDTO> getOccupiedCabinets() {
        return partLocationService.getAllLocations().stream()
                .filter(loc -> loc.getPosX() != null && loc.getPosY() != null)
                .collect(java.util.stream.Collectors.toList());
    }

    @PostMapping
    public String saveLocation(@RequestBody PartLocationDTO dto) {
        boolean result = partLocationService.saveOrUpdate(dto);
        return result ? "저장 완료" : "저장 실패";
    }

    @PostMapping("/by-incoming")
    public String saveLocationByIncomingId(@RequestBody PartLocationDTO dto) {
        boolean result = partLocationService.saveOrUpdateByIncomingId(dto);
        return result ? "저장 완료" : "저장 실패";
    }

    @PostMapping("/by-incoming/insert")
    public String insertLocationByIncomingId(@RequestBody PartLocationDTO dto) {
        boolean result = partLocationService.insertByIncomingId(dto);
        return result ? "등록 완료" : "등록 실패";
    }

    @PostMapping("/by-incoming/update")
    public String updateLocationByIncomingId(@RequestBody PartLocationDTO dto) {
        boolean result = partLocationService.updateByIncomingId(dto);
        return result ? "수정 완료" : "수정 실패";
    }

    @DeleteMapping("/{code}")
    public String deleteLocation(@PathVariable String code) {
        boolean result = partLocationService.deleteByCode(code);
        return result ? "삭제 완료" : "삭제 실패";
    }
}
