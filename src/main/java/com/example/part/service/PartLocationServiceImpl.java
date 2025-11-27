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
    private final AuditLogger auditLogger;

    @Override
    public List<PartLocationDTO> getAllLocations() {
        return partLocationMapper.selectAllLocations();
    }

    @Override
    public PartLocationDTO getLocationByCode(String code) {
        return partLocationMapper.findByCode(code);
    }

    @Override
    public PartLocationDTO getLocationByPartNumber(String partNumber) {
        return partLocationMapper.findByPartNumber(partNumber);
    }

    @Override
    public PartLocationDTO getLocationByCabinet(String posX, Integer posY) {
        return partLocationMapper.findByCabinetPosition(posX, posY);
    }

    @Override
    public boolean saveOrUpdate(PartLocationDTO dto) {
        PartLocationDTO existing = partLocationMapper.findByCode(dto.getLocationCode());
        if (existing == null) {
            boolean inserted = partLocationMapper.insertLocation(dto) > 0;
            if (inserted) {
                auditLogger.log("part_location",
                        null,
                        "CREATE",
                        "part_location 등록: " + dto.getLocationCode(),
                        null,
                        null);
            }
            return inserted;
        } else {
            boolean updated = partLocationMapper.updateLocation(dto) > 0;
            if (updated) {
                auditLogger.log("part_location",
                        null,
                        "UPDATE",
                        "part_location 수정: " + dto.getLocationCode(),
                        null,
                        null);
            }
            return updated;
        }
    }

    @Override
    public boolean deleteByCode(String code) {
        boolean deleted = partLocationMapper.deleteLocation(code) > 0;
        if (deleted) {
            auditLogger.log("part_location",
                    null,
                    "DELETE",
                    "part_location 삭제: " + code,
                    null,
                    null);
        }
        return deleted;
    }
}
