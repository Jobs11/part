package com.example.part.dto;

import java.util.List;

import lombok.Data;

@Data
public class MapSpotSyncRequest {
    private List<Integer> toDelete;     // 삭제할 spotId 목록
    private List<MapSpotDTO> toUpdate;  // 수정할 좌표 목록
    private List<MapSpotDTO> toInsert;  // 추가할 좌표 목록
}
