package com.example.part.service;

import java.util.List;

import com.example.part.dto.PartLocationDTO;

public interface PartLocationService {
    List<PartLocationDTO> getAllLocations();

    PartLocationDTO getLocationByCode(String code);

    PartLocationDTO getLocationByPartNumber(String partNumber);

    boolean saveOrUpdate(PartLocationDTO dto);

    boolean deleteByCode(String code);
}
