package com.example.part.service;

import java.util.List;

import com.example.part.dto.PartsDTO;

public interface PartsService {

    // 부품 입력
    void insertPart(PartsDTO partsDto);

    // 부품 수정
    void updatePart(PartsDTO partsDto);

    // 수량이 10개 이하인 부품 리스트 조회
    List<PartsDTO> getLowStockParts(Integer threshold);

    // 전체 부품 리스트 조회
    List<PartsDTO> getAllParts();

    List<PartsDTO> getPartsDescSorted(String column);

    List<PartsDTO> getPartsAscSorted(String column);

    void softDeletePart(String partNumber);
}
