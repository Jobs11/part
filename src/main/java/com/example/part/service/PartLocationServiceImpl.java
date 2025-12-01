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
                        "배치도 등록: " + dto.getLocationCode(),
                        null,
                        null);
            }
            return inserted;
        } else {
            boolean updated = partLocationMapper.updateLocation(dto) > 0;
            if (updated) {
                // 변경 필드 추적
                StringBuilder changedFields = new StringBuilder("{");
                boolean hasChanges = false;

                if (existing.getPartNumber() != null && dto.getPartNumber() != null
                        && !existing.getPartNumber().equals(dto.getPartNumber())) {
                    changedFields.append(String.format("\"%s\": {\"변경전\": \"%s\", \"변경후\": \"%s\"}",
                            auditLogger.translateFieldName("part_location", "partNumber"),
                            existing.getPartNumber(),
                            dto.getPartNumber()));
                    hasChanges = true;
                }

                if (existing.getPartName() != null && dto.getPartName() != null
                        && !existing.getPartName().equals(dto.getPartName())) {
                    if (hasChanges) changedFields.append(", ");
                    changedFields.append(String.format("\"%s\": {\"변경전\": \"%s\", \"변경후\": \"%s\"}",
                            auditLogger.translateFieldName("part_location", "partName"),
                            existing.getPartName(),
                            dto.getPartName()));
                    hasChanges = true;
                }

                if (existing.getPosX() != null && dto.getPosX() != null
                        && !existing.getPosX().equals(dto.getPosX())) {
                    if (hasChanges) changedFields.append(", ");
                    changedFields.append(String.format("\"%s\": {\"변경전\": \"%s\", \"변경후\": \"%s\"}",
                            "행",
                            existing.getPosX(),
                            dto.getPosX()));
                    hasChanges = true;
                }

                if (existing.getPosY() != null && dto.getPosY() != null
                        && !existing.getPosY().equals(dto.getPosY())) {
                    if (hasChanges) changedFields.append(", ");
                    changedFields.append(String.format("\"%s\": {\"변경전\": %d, \"변경후\": %d}",
                            "열",
                            existing.getPosY(),
                            dto.getPosY()));
                    hasChanges = true;
                }

                changedFields.append("}");

                auditLogger.log("part_location",
                        null,
                        "UPDATE",
                        "배치도 수정: " + dto.getLocationCode(),
                        hasChanges ? changedFields.toString() : null,
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
                    "배치도 삭제: " + code,
                    null,
                    null);
        }
        return deleted;
    }
}
