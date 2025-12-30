package com.example.part.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.example.part.dto.PartLocationDTO;

@Mapper
public interface PartLocationMapper {
    List<PartLocationDTO> selectAllLocations();

    PartLocationDTO findByCode(String locationCode);

    PartLocationDTO findByPartNumber(String partNumber);

    PartLocationDTO findByIncomingId(Integer incomingId);

    PartLocationDTO findByCabinetPosition(@Param("posX") String posX, @Param("posY") Integer posY);

    List<PartLocationDTO> findByPartNumbersExact(@Param("partNumbers") List<String> partNumbers);

    List<PartLocationDTO> findByPartNumbersLike(@Param("partNumbers") List<String> partNumbers);

    int insertLocation(PartLocationDTO dto);

    int updateLocation(PartLocationDTO dto);

    int updateLocationByIncomingId(PartLocationDTO dto);

    int deleteLocation(String locationCode);
}
