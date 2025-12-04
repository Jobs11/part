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
    public PartLocationDTO getLocationByIncomingId(Integer incomingId) {
        return partLocationMapper.findByIncomingId(incomingId);
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
                // 캐비넷 위치인지 도면 위치인지 구분
                String locationType = (dto.getPosX() != null && dto.getPosY() != null)
                    ? "캐비넷" : "도면";
                String locationInfo = (dto.getPosX() != null && dto.getPosY() != null)
                    ? dto.getPosX() + "-" + dto.getPosY()
                    : dto.getLocationCode();

                auditLogger.log("part_location",
                        null,
                        "CREATE",
                        locationType + " 등록 [" + locationInfo + "]",
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
                    if (hasChanges)
                        changedFields.append(", ");
                    changedFields.append(String.format("\"%s\": {\"변경전\": \"%s\", \"변경후\": \"%s\"}",
                            auditLogger.translateFieldName("part_location", "partName"),
                            existing.getPartName(),
                            dto.getPartName()));
                    hasChanges = true;
                }

                if (existing.getPosX() != null && dto.getPosX() != null
                        && !existing.getPosX().equals(dto.getPosX())) {
                    if (hasChanges)
                        changedFields.append(", ");
                    changedFields.append(String.format("\"%s\": {\"변경전\": \"%s\", \"변경후\": \"%s\"}",
                            "행",
                            existing.getPosX(),
                            dto.getPosX()));
                    hasChanges = true;
                }

                if (existing.getPosY() != null && dto.getPosY() != null
                        && !existing.getPosY().equals(dto.getPosY())) {
                    if (hasChanges)
                        changedFields.append(", ");
                    changedFields.append(String.format("\"%s\": {\"변경전\": %d, \"변경후\": %d}",
                            "열",
                            existing.getPosY(),
                            dto.getPosY()));
                    hasChanges = true;
                }

                changedFields.append("}");

                // 캐비넷 위치인지 도면 위치인지 구분
                String locationType = (dto.getPosX() != null && dto.getPosY() != null)
                    ? "캐비넷" : "도면";
                String locationInfo = (dto.getPosX() != null && dto.getPosY() != null)
                    ? dto.getPosX() + "-" + dto.getPosY()
                    : dto.getLocationCode();

                auditLogger.log("part_location",
                        null,
                        "UPDATE",
                        locationType + " 수정 [" + locationInfo + "]",
                        hasChanges ? changedFields.toString() : null,
                        null);
            }
            return updated;
        }
    }

    @Override
    public boolean saveOrUpdateByIncomingId(PartLocationDTO dto) {
        if (dto.getIncomingId() == null) {
            throw new IllegalArgumentException("입고일련번호가 필요합니다.");
        }

        PartLocationDTO existing = partLocationMapper.findByIncomingId(dto.getIncomingId());
        System.out.println("🔍 [saveOrUpdateByIncomingId] incoming_id=" + dto.getIncomingId() + ", existing=" + (existing != null ? "존재함 (id=" + existing.getLocationId() + ")" : "null"));

        if (existing == null) {
            // INSERT
            boolean inserted = partLocationMapper.insertLocation(dto) > 0;
            if (inserted) {
                // 캐비넷 위치인지 도면 위치인지 구분
                String locationType = (dto.getPosX() != null && dto.getPosY() != null)
                    ? "캐비넷" : "도면";
                String locationInfo = (dto.getPosX() != null && dto.getPosY() != null)
                    ? dto.getPosX() + "-" + dto.getPosY()
                    : (dto.getLocationCode() != null ? dto.getLocationCode() : "미지정");

                auditLogger.log("part_location",
                        null,
                        "CREATE",
                        locationType + " 등록 [" + locationInfo + "] (입고ID: " + dto.getIncomingId() + ")",
                        null,
                        null);
            }
            return inserted;
        } else {
            // UPDATE (incoming_id 기준)
            boolean updated = partLocationMapper.updateLocationByIncomingId(dto) > 0;
            if (updated) {
                // 변경 필드 추적
                StringBuilder changedFields = new StringBuilder("{");
                boolean hasChanges = false;

                if (existing.getLocationCode() != null && dto.getLocationCode() != null
                        && !existing.getLocationCode().equals(dto.getLocationCode())) {
                    changedFields.append(String.format("\"%s\": {\"변경전\": \"%s\", \"변경후\": \"%s\"}",
                            "위치코드",
                            existing.getLocationCode(),
                            dto.getLocationCode()));
                    hasChanges = true;
                }

                if (existing.getPosX() != null && dto.getPosX() != null
                        && !existing.getPosX().equals(dto.getPosX())) {
                    if (hasChanges)
                        changedFields.append(", ");
                    changedFields.append(String.format("\"%s\": {\"변경전\": \"%s\", \"변경후\": \"%s\"}",
                            "행",
                            existing.getPosX(),
                            dto.getPosX()));
                    hasChanges = true;
                }

                if (existing.getPosY() != null && dto.getPosY() != null
                        && !existing.getPosY().equals(dto.getPosY())) {
                    if (hasChanges)
                        changedFields.append(", ");
                    changedFields.append(String.format("\"%s\": {\"변경전\": %d, \"변경후\": %d}",
                            "열",
                            existing.getPosY(),
                            dto.getPosY()));
                    hasChanges = true;
                }

                changedFields.append("}");

                // 캐비넷 위치인지 도면 위치인지 구분
                String locationType = (dto.getPosX() != null && dto.getPosY() != null)
                    ? "캐비넷" : "도면";
                String locationInfo = (dto.getPosX() != null && dto.getPosY() != null)
                    ? dto.getPosX() + "-" + dto.getPosY()
                    : (dto.getLocationCode() != null ? dto.getLocationCode() : "미지정");

                auditLogger.log("part_location",
                        null,
                        "UPDATE",
                        locationType + " 수정 [" + locationInfo + "] (입고ID: " + dto.getIncomingId() + ")",
                        hasChanges ? changedFields.toString() : null,
                        null);
            }
            return updated;
        }
    }

    @Override
    public boolean insertByIncomingId(PartLocationDTO dto) {
        if (dto.getIncomingId() == null) {
            throw new IllegalArgumentException("입고일련번호가 필요합니다.");
        }

        // INSERT만 수행
        boolean inserted = partLocationMapper.insertLocation(dto) > 0;
        if (inserted) {
            // 캐비넷 위치인지 도면 위치인지 구분
            String locationType = (dto.getPosX() != null && dto.getPosY() != null)
                ? "캐비넷" : "도면";
            String locationInfo = (dto.getPosX() != null && dto.getPosY() != null)
                ? dto.getPosX() + "-" + dto.getPosY()
                : (dto.getLocationCode() != null ? dto.getLocationCode() : "미지정");

            auditLogger.log("part_location",
                    null,
                    "CREATE",
                    locationType + " 등록 [" + locationInfo + "] (입고ID: " + dto.getIncomingId() + ")",
                    null,
                    null);
        }
        return inserted;
    }

    @Override
    public boolean updateByIncomingId(PartLocationDTO dto) {
        if (dto.getIncomingId() == null) {
            throw new IllegalArgumentException("입고일련번호가 필요합니다.");
        }

        PartLocationDTO existing = partLocationMapper.findByIncomingId(dto.getIncomingId());
        if (existing == null) {
            throw new IllegalArgumentException("입고ID " + dto.getIncomingId() + "에 해당하는 위치 정보가 없습니다.");
        }

        // UPDATE만 수행
        boolean updated = partLocationMapper.updateLocationByIncomingId(dto) > 0;
        if (updated) {
            // 변경 필드 추적
            StringBuilder changedFields = new StringBuilder("{");
            boolean hasChanges = false;

            if (existing.getLocationCode() != null && dto.getLocationCode() != null
                    && !existing.getLocationCode().equals(dto.getLocationCode())) {
                changedFields.append(String.format("\"%s\": {\"변경전\": \"%s\", \"변경후\": \"%s\"}",
                        "위치코드",
                        existing.getLocationCode(),
                        dto.getLocationCode()));
                hasChanges = true;
            }

            if (existing.getPosX() != null && dto.getPosX() != null
                    && !existing.getPosX().equals(dto.getPosX())) {
                if (hasChanges)
                    changedFields.append(", ");
                changedFields.append(String.format("\"%s\": {\"변경전\": \"%s\", \"변경후\": \"%s\"}",
                        "행",
                        existing.getPosX(),
                        dto.getPosX()));
                hasChanges = true;
            }

            if (existing.getPosY() != null && dto.getPosY() != null
                    && !existing.getPosY().equals(dto.getPosY())) {
                if (hasChanges)
                    changedFields.append(", ");
                changedFields.append(String.format("\"%s\": {\"변경전\": %d, \"변경후\": %d}",
                        "열",
                        existing.getPosY(),
                        dto.getPosY()));
                hasChanges = true;
            }

            changedFields.append("}");

            // 캐비넷 위치인지 도면 위치인지 구분
            String locationType = (dto.getPosX() != null && dto.getPosY() != null)
                ? "캐비넷" : "도면";
            String locationInfo = (dto.getPosX() != null && dto.getPosY() != null)
                ? dto.getPosX() + "-" + dto.getPosY()
                : (dto.getLocationCode() != null ? dto.getLocationCode() : "미지정");

            auditLogger.log("part_location",
                    null,
                    "UPDATE",
                    locationType + " 수정 [" + locationInfo + "] (입고ID: " + dto.getIncomingId() + ")",
                    hasChanges ? changedFields.toString() : null,
                    null);
        }
        return updated;
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
