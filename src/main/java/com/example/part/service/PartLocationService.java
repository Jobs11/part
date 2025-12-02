package com.example.part.service;

import java.util.List;

import com.example.part.dto.PartLocationDTO;

public interface PartLocationService {
    List<PartLocationDTO> getAllLocations();

    PartLocationDTO getLocationByCode(String code);

    PartLocationDTO getLocationByPartNumber(String partNumber);

    PartLocationDTO getLocationByIncomingId(Integer incomingId);

    PartLocationDTO getLocationByCabinet(String posX, Integer posY);

    boolean saveOrUpdate(PartLocationDTO dto);

    boolean saveOrUpdateByIncomingId(PartLocationDTO dto);

    boolean insertByIncomingId(PartLocationDTO dto);

    boolean updateByIncomingId(PartLocationDTO dto);

    boolean deleteByCode(String code);
}
