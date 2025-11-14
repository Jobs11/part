package com.example.part.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.example.part.dto.PartLocationDTO;
import com.example.part.mapper.PartLocationMapper;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PartLocationServiceImpl implements PartLocationService {

    private final PartLocationMapper partLocationMapper;

    @Override
    public List<PartLocationDTO> getAllLocations() {
        return partLocationMapper.selectAllLocations();
    }

    @Override
    public PartLocationDTO getLocationByCode(String code) {
        return partLocationMapper.findByCode(code);
    }

    @Override
    public boolean saveOrUpdate(PartLocationDTO dto) {
        PartLocationDTO existing = partLocationMapper.findByCode(dto.getLocationCode());
        if (existing == null) {
            return partLocationMapper.insertLocation(dto) > 0;
        } else {
            return partLocationMapper.updateLocation(dto) > 0;
        }
    }

    @Override
    public boolean deleteByCode(String code) {
        return partLocationMapper.deleteLocation(code) > 0;
    }
}
