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

    @PostMapping
    public String saveLocation(@RequestBody PartLocationDTO dto) {
        boolean result = partLocationService.saveOrUpdate(dto);
        return result ? "저장 완료" : "저장 실패";
    }

    @DeleteMapping("/{code}")
    public String deleteLocation(@PathVariable String code) {
        boolean result = partLocationService.deleteByCode(code);
        return result ? "삭제 완료" : "삭제 실패";
    }
}
