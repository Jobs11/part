package com.example.part.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.example.part.dto.ActionAuditDTO;

@Mapper
public interface ActionAuditMapper {

    void insertAudit(ActionAuditDTO audit);

    java.util.List<ActionAuditDTO> selectRecent(@Param("limit") int limit);
}
