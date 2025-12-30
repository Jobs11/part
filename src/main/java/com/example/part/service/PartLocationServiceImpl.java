package com.example.part.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

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
    public Map<String, Object> searchByPartNumbersWithFallback(List<String> partNumbers) {
        Map<String, Object> result = new HashMap<>();

        // 1차 검색: 정확히 일치하는 부품번호 찾기
        List<PartLocationDTO> exactMatches = partLocationMapper.findByPartNumbersExact(partNumbers);

        // 정확히 찾은 부품번호 목록
        Set<String> foundPartNumbers = exactMatches.stream()
                .map(PartLocationDTO::getPartNumber)
                .collect(Collectors.toSet());

        // 못 찾은 부품번호 목록
        List<String> notFoundExact = partNumbers.stream()
                .filter(pn -> !foundPartNumbers.contains(pn))
                .collect(Collectors.toList());

        List<PartLocationDTO> likeMatches = new ArrayList<>();
        List<String> notFoundLike = new ArrayList<>();

        // 2차 검색: 못 찾은 것들만 부분 검색 (LIKE)
        Set<String> likeFoundPartNumbers = new HashSet<>();
        if (!notFoundExact.isEmpty()) {
            List<PartLocationDTO> allLikeMatches = partLocationMapper.findByPartNumbersLike(notFoundExact);

            // 1차에서 이미 찾은 부품번호는 제외 (중복 방지)
            likeMatches = allLikeMatches.stream()
                    .filter(loc -> !foundPartNumbers.contains(loc.getPartNumber()))
                    .collect(Collectors.toList());

            // 2차 검색에서 찾은 부품번호 목록 (실제 DB의 부품번호, 1차 제외)
            likeFoundPartNumbers = likeMatches.stream()
                    .map(PartLocationDTO::getPartNumber)
                    .collect(Collectors.toSet());

            // 2차 검색에서 찾은 검색어 추적 (CSV 입력값 기준)
            Set<String> foundSearchTerms = new HashSet<>();
            for (PartLocationDTO location : likeMatches) {
                for (String searchTerm : notFoundExact) {
                    if (location.getPartNumber().contains(searchTerm)) {
                        foundSearchTerms.add(searchTerm);
                        break;
                    }
                }
            }

            // 2차 검색에서도 못 찾은 부품번호
            notFoundLike = notFoundExact.stream()
                    .filter(pn -> !foundSearchTerms.contains(pn))
                    .collect(Collectors.toList());
        }

        // 전체 결과 합치기
        List<PartLocationDTO> allMatches = new ArrayList<>();
        allMatches.addAll(exactMatches);
        allMatches.addAll(likeMatches);

        // 통계: CSV에서 입력한 부품번호 개수 기준
        int exactFoundInputCount = foundPartNumbers.size(); // 정확 일치로 찾은 입력값 개수
        int likeFoundInputCount = likeFoundPartNumbers.size(); // 부분 일치로 찾은 실제 부품번호 개수

        result.put("locations", allMatches);
        result.put("exactMatchCount", exactFoundInputCount);  // CSV 입력값 중 정확 일치한 개수
        result.put("likeMatchCount", likeFoundInputCount);    // 부분 일치로 찾은 실제 부품번호 개수
        result.put("notFound", notFoundLike);
        result.put("totalRequested", partNumbers.size());
        result.put("totalFound", allMatches.size());

        return result;
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
