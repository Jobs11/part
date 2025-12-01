package com.example.part.service;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.example.part.dto.ActionAuditDTO;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class AuditLogger {

    private final ActionAuditService actionAuditService;

    public void log(String entityType, Long entityId, String action, String summary, String changedFields,
            String performedBy) {
        ActionAuditDTO audit = new ActionAuditDTO();
        audit.setEntityType(translateEntityType(entityType));
        audit.setEntityId(entityId);
        audit.setAction(action);
        audit.setSummary(summary);
        audit.setChangedFields(changedFields);
        audit.setPerformedBy(performedBy != null ? performedBy : resolveCurrentUsername());

        try {
            actionAuditService.log(audit);
        } catch (Exception e) {
            log.warn("감사 로그 기록 실패: {}", e.getMessage(), e);
        }
    }

    /**
     * 엔티티 타입을 한글로 변환
     */
    private String translateEntityType(String entityType) {
        if (entityType == null) {
            return null;
        }
        switch (entityType.toLowerCase()) {
            case "category":
                return "카테고리";
            case "part_incoming":
                return "입고";
            case "part_usage":
                return "출고";
            case "part_location":
                return "배치도";
            case "map_spot":
                return "도면 좌표";
            case "user":
                return "사용자";
            default:
                return entityType;
        }
    }

    /**
     * 필드명을 한글로 변환
     */
    public String translateFieldName(String entityType, String fieldName) {
        if (fieldName == null) {
            return null;
        }

        // 공통 필드
        switch (fieldName) {
            case "createdAt":
            case "created_at":
                return "생성일시";
            case "updatedAt":
            case "updated_at":
                return "수정일시";
            case "isActive":
            case "is_active":
                return "활성화";
        }

        // 엔티티별 필드
        if (entityType == null) {
            return fieldName;
        }

        switch (entityType.toLowerCase()) {
            case "category":
                return translateCategoryField(fieldName);
            case "part_incoming":
                return translateIncomingField(fieldName);
            case "part_usage":
                return translateUsageField(fieldName);
            case "part_location":
                return translateLocationField(fieldName);
            case "user":
                return translateUserField(fieldName);
            default:
                return fieldName;
        }
    }

    private String translateCategoryField(String fieldName) {
        switch (fieldName) {
            case "categoryName":
            case "category_name":
                return "카테고리명";
            case "description":
                return "설명";
            default:
                return fieldName;
        }
    }

    private String translateIncomingField(String fieldName) {
        switch (fieldName) {
            case "partNumber":
            case "part_number":
                return "부품번호";
            case "partName":
            case "part_name":
                return "부품명";
            case "categoryId":
            case "category_id":
                return "카테고리";
            case "description":
                return "설명";
            case "projectName":
            case "project_name":
                return "프로젝트명";
            case "unit":
                return "단위";
            case "paymentMethodId":
            case "payment_method_id":
                return "결제수단";
            case "incomingQuantity":
            case "incoming_quantity":
                return "입고수량";
            case "purchasePrice":
            case "purchase_price":
                return "구매단가";
            case "currency":
                return "통화";
            case "exchangeRate":
            case "exchange_rate":
                return "환율";
            case "originalPrice":
            case "original_price":
                return "원화금액";
            case "purchaseDate":
            case "purchaseDatetime":
            case "purchase_date":
            case "purchase_datetime":
                return "구매일시";
            case "supplier":
                return "공급업체";
            case "purchaser":
                return "구매자";
            case "invoiceNumber":
            case "invoice_number":
                return "송장번호";
            case "note":
                return "비고";
            default:
                return fieldName;
        }
    }

    private String translateUsageField(String fieldName) {
        switch (fieldName) {
            case "partNumber":
            case "part_number":
                return "부품번호";
            case "quantityUsed":
            case "quantity_used":
                return "출고수량";
            case "usageLocation":
            case "usage_location":
                return "사용처";
            case "usedDate":
            case "used_date":
                return "출고일자";
            case "note":
                return "비고";
            default:
                return fieldName;
        }
    }

    private String translateLocationField(String fieldName) {
        switch (fieldName) {
            case "cabinetName":
            case "cabinet_name":
                return "캐비넷명";
            case "rowNumber":
            case "row_number":
                return "행";
            case "columnNumber":
            case "column_number":
                return "열";
            case "partNumber":
            case "part_number":
                return "부품번호";
            case "partName":
            case "part_name":
                return "부품명";
            default:
                return fieldName;
        }
    }

    private String translateUserField(String fieldName) {
        switch (fieldName) {
            case "username":
                return "사용자명";
            case "password":
                return "비밀번호";
            case "role":
                return "권한";
            case "email":
                return "이메일";
            default:
                return fieldName;
        }
    }

    private String resolveCurrentUsername() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null && attrs.getRequest() != null && attrs.getRequest().getUserPrincipal() != null) {
                return attrs.getRequest().getUserPrincipal().getName();
            }
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getName() != null) {
                return auth.getName();
            }
        } catch (Exception ignored) {
        }
        return "system";
    }

    public String currentUserOrSystem() {
        return resolveCurrentUsername();
    }
}
