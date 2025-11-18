package com.example.part.service;

import java.util.List;
import java.util.Map;

import com.example.part.dto.PartIncomingDTO;

public interface PartIncomingService {

    // 입고 등록 (부품번호 자동 생성)
    void registerIncoming(PartIncomingDTO partIncomingDTO);

    // 입고 등록 (부품번호 수동 입력)
    void registerIncomingWithPartNumber(PartIncomingDTO partIncomingDTO);

    // 전체 입고 내역 조회
    List<PartIncomingDTO> getAllIncoming();

    // incoming_id로 단건 조회
    PartIncomingDTO getIncomingById(int incomingId);

    // 특정 부품번호로 조회
    List<PartIncomingDTO> getIncomingByPartNumber(String partNumber);

    // 부품명으로 검색
    List<PartIncomingDTO> searchByPartName(String partName);

    // 카테고리별 입고 내역
    List<PartIncomingDTO> getIncomingByCategory(int categoryId);

    // 부품별 현재 재고 집계
    List<Map<String, Object>> getCurrentInventory();

    // 재고 부족 조회
    List<Map<String, Object>> getLowStock(int threshold);

    List<Map<String, Object>> searchInventoryAdvanced(Map<String, Object> params);

    // 입고 정보 수정
    void updateIncoming(PartIncomingDTO partIncomingDTO);

    // 정렬 조회
    List<PartIncomingDTO> getIncomingSorted(String column, String order);

    // 검색 정렬 조회
    List<PartIncomingDTO> searchWithSort(String keyword, String column, String order);

    List<PartIncomingDTO> searchAdvanced(Map<String, Object> params);
}
