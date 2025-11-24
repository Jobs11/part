package com.example.part.service;

import java.awt.Color;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.part.dto.DocumentFieldDTO;
import com.example.part.dto.DocumentItemDTO;
import com.example.part.dto.GeneralImageDTO;
import com.example.part.dto.GeneratedDocumentDTO;
import com.example.part.mapper.GeneralImageMapper;
import com.example.part.mapper.GeneratedDocumentMapper;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DocumentServiceImpl implements DocumentService {

    private final GeneratedDocumentMapper documentMapper;
    private final GeneralImageMapper imageMapper;

    @Value("${file.upload-dir:/var/livewalk/uploads/images}")
    private String templateDir;

    @Value("${file.document-dir:/var/livewalk/uploads/documents}")
    private String documentDir;

    @PostConstruct
    public void init() {
        try {
            Path docPath = Paths.get(documentDir);
            if (!Files.exists(docPath)) {
                Files.createDirectories(docPath);
            }
        } catch (IOException e) {
            throw new RuntimeException("문서 디렉토리 생성 실패: " + documentDir, e);
        }
    }

    @Override
    @Transactional
    public GeneratedDocumentDTO generateDocument(GeneratedDocumentDTO documentData, Integer createdBy) {
        try {
            // 템플릿 정보 조회
            GeneralImageDTO template = imageMapper.selectImageById(documentData.getTemplateId());
            if (template == null) {
                throw new RuntimeException("템플릿을 찾을 수 없습니다.");
            }

            // PDF 파일명 생성
            String pdfFileName = UUID.randomUUID().toString() + ".pdf";
            Path pdfPath = Paths.get(documentDir, pdfFileName);
            Path templatePath = Paths.get(template.getFilePath());

            boolean isPdfTemplate = "pdf".equals(template.getFileType());

            // PDF 생성
            PDDocument document;
            if (isPdfTemplate) {
                // PDF 템플릿 로드
                document = PDDocument.load(templatePath.toFile());
            } else {
                // 이미지 템플릿: 새 PDF 생성
                document = new PDDocument();
                PDPage page = new PDPage(PDRectangle.A4);
                document.addPage(page);

                // 템플릿 이미지 로드 및 배치
                PDImageXObject templateImage = PDImageXObject.createFromFile(templatePath.toString(), document);

                try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
                    // 템플릿 이미지 그리기 (페이지 크기에 맞춤)
                    float pageWidth = page.getMediaBox().getWidth();
                    float pageHeight = page.getMediaBox().getHeight();

                    // 이미지 비율 유지하면서 페이지에 맞춤
                    float imageWidth = templateImage.getWidth();
                    float imageHeight = templateImage.getHeight();
                    float scale = Math.min(pageWidth / imageWidth, pageHeight / imageHeight);

                    float scaledWidth = imageWidth * scale;
                    float scaledHeight = imageHeight * scale;
                    float x = (pageWidth - scaledWidth) / 2;
                    float y = (pageHeight - scaledHeight) / 2;

                    contentStream.drawImage(templateImage, x, y, scaledWidth, scaledHeight);
                }
            }

            // 한글 폰트 로드 (시스템 폰트 사용)
            PDType0Font font = loadKoreanFont(document);

            // 첫 페이지에 데이터 추가
            PDPage page = document.getPage(0);

            // PDF 템플릿인 경우 append 모드로, 이미지 템플릿인 경우 일반 모드로
            try (PDPageContentStream contentStream = new PDPageContentStream(document, page,
                    isPdfTemplate ? PDPageContentStream.AppendMode.APPEND : PDPageContentStream.AppendMode.OVERWRITE,
                    true)) {

                float pageWidth = page.getMediaBox().getWidth();
                float pageHeight = page.getMediaBox().getHeight();

                // 텍스트 색상 설정
                contentStream.setNonStrokingColor(Color.BLACK);

                // 개별 필드 방식 (fields가 있으면 이 방식 사용)
                if (documentData.getFields() != null && !documentData.getFields().isEmpty()) {
                    for (DocumentFieldDTO field : documentData.getFields()) {
                        int fieldFontSize = field.getFontSize() != null ? field.getFontSize() : 10;

                        contentStream.beginText();
                        contentStream.setFont(font, fieldFontSize);
                        contentStream.newLineAtOffset(field.getX(), field.getY());
                        contentStream.showText(field.getFieldValue() != null ? field.getFieldValue() : "");
                        contentStream.endText();
                    }
                }
                // 표 형식으로 문서 데이터 작성 (items가 있으면 이 방식 사용)
                else if (documentData.getItems() != null && !documentData.getItems().isEmpty()) {
                    // 좌표가 지정되지 않으면 기본값 사용
                    float leftMargin = documentData.getTableX() != null ? documentData.getTableX() : 50f;
                    float tableTop = documentData.getTableY() != null ? documentData.getTableY() : (pageHeight - 250);
                    float rowHeight = 20;
                    int fontSize = 10;

                    // 표 그리기
                    if (true) {
                        float currentY = tableTop;

                        // 표 헤더
                        contentStream.setLineWidth(1f);
                        contentStream.setStrokingColor(Color.BLACK);

                        // 헤더 그리기 (절대 위치로)
                        float headerY = currentY - 15;

                        contentStream.beginText();
                        contentStream.setFont(font, fontSize);
                        contentStream.newLineAtOffset(leftMargin + 5, headerY);
                        contentStream.showText("품명");
                        contentStream.endText();

                        contentStream.beginText();
                        contentStream.setFont(font, fontSize);
                        contentStream.newLineAtOffset(leftMargin + 105, headerY);
                        contentStream.showText("규격");
                        contentStream.endText();

                        contentStream.beginText();
                        contentStream.setFont(font, fontSize);
                        contentStream.newLineAtOffset(leftMargin + 205, headerY);
                        contentStream.showText("수량");
                        contentStream.endText();

                        contentStream.beginText();
                        contentStream.setFont(font, fontSize);
                        contentStream.newLineAtOffset(leftMargin + 265, headerY);
                        contentStream.showText("단가");
                        contentStream.endText();

                        contentStream.beginText();
                        contentStream.setFont(font, fontSize);
                        contentStream.newLineAtOffset(leftMargin + 345, headerY);
                        contentStream.showText("공급가액");
                        contentStream.endText();

                        contentStream.beginText();
                        contentStream.setFont(font, fontSize);
                        contentStream.newLineAtOffset(leftMargin + 425, headerY);
                        contentStream.showText("세액");
                        contentStream.endText();

                        contentStream.beginText();
                        contentStream.setFont(font, fontSize);
                        contentStream.newLineAtOffset(leftMargin + 505, headerY);
                        contentStream.showText("비고");
                        contentStream.endText();

                        // 헤더 구분선
                        currentY -= rowHeight;
                        contentStream.moveTo(leftMargin, currentY);
                        contentStream.lineTo(pageWidth - leftMargin, currentY);
                        contentStream.stroke();

                        // 각 품목 행
                        for (DocumentItemDTO item : documentData.getItems()) {
                            currentY -= rowHeight;
                            float rowY = currentY + 5;

                            // 각 열을 절대 위치로 그리기
                            contentStream.beginText();
                            contentStream.setFont(font, fontSize);

                            // 품명
                            contentStream.newLineAtOffset(leftMargin + 5, rowY);
                            contentStream.showText(item.getItemName() != null ? item.getItemName() : "");
                            contentStream.endText();

                            contentStream.beginText();
                            contentStream.setFont(font, fontSize);
                            // 규격
                            contentStream.newLineAtOffset(leftMargin + 105, rowY);
                            contentStream.showText(item.getSpec() != null ? item.getSpec() : "");
                            contentStream.endText();

                            contentStream.beginText();
                            contentStream.setFont(font, fontSize);
                            // 수량
                            contentStream.newLineAtOffset(leftMargin + 205, rowY);
                            contentStream.showText(item.getQuantity() != null ? item.getQuantity().toString() : "");
                            contentStream.endText();

                            contentStream.beginText();
                            contentStream.setFont(font, fontSize);
                            // 단가
                            contentStream.newLineAtOffset(leftMargin + 265, rowY);
                            if (item.getUnitPrice() != null) {
                                contentStream.showText(String.format("%,.0f", item.getUnitPrice()));
                            }
                            contentStream.endText();

                            contentStream.beginText();
                            contentStream.setFont(font, fontSize);
                            // 공급가액
                            contentStream.newLineAtOffset(leftMargin + 345, rowY);
                            if (item.getSupplyPrice() != null) {
                                contentStream.showText(String.format("%,.0f", item.getSupplyPrice()));
                            }
                            contentStream.endText();

                            contentStream.beginText();
                            contentStream.setFont(font, fontSize);
                            // 세액
                            contentStream.newLineAtOffset(leftMargin + 425, rowY);
                            if (item.getTax() != null) {
                                contentStream.showText(String.format("%,.0f", item.getTax()));
                            }
                            contentStream.endText();

                            contentStream.beginText();
                            contentStream.setFont(font, fontSize);
                            // 비고
                            contentStream.newLineAtOffset(leftMargin + 505, rowY);
                            contentStream.showText(item.getNotes() != null ? item.getNotes() : "");
                            contentStream.endText();

                            // 행 구분선
                            contentStream.moveTo(leftMargin, currentY);
                            contentStream.lineTo(pageWidth - leftMargin, currentY);
                            contentStream.stroke();
                        }

                        // 세로 구분선
                        float bottomY = currentY;
                        float[] columnX = { leftMargin, leftMargin + 100, leftMargin + 200, leftMargin + 260,
                                leftMargin + 340, leftMargin + 420, leftMargin + 500, pageWidth - leftMargin };

                        for (float a : columnX) {
                            contentStream.moveTo(a, tableTop);
                            contentStream.lineTo(a, bottomY);
                            contentStream.stroke();
                        }
                    }
                }
            }

            // PDF 저장
            document.save(pdfPath.toFile());
            document.close();

            // DTO 업데이트
            documentData.setFileName(pdfFileName);
            documentData.setFilePath(pdfPath.toString());
            documentData.setFileSize(Files.size(pdfPath));
            documentData.setCreatedBy(createdBy);

            // DB 저장
            documentMapper.insertDocument(documentData);

            return documentData;

        } catch (IOException e) {
            throw new RuntimeException("PDF 생성 실패: " + e.getMessage(), e);
        }
    }

    private PDType0Font loadKoreanFont(PDDocument document) throws IOException {
        // Windows 기준 한글 폰트 로드
        String[] fontPaths = {
                "C:\\Windows\\Fonts\\malgun.ttf", // 맑은 고딕
                "C:\\Windows\\Fonts\\gulim.ttc", // 굴림
                "C:\\Windows\\Fonts\\batang.ttc", // 바탕
                "/usr/share/fonts/truetype/nanum/NanumGothic.ttf", // Linux
                "/System/Library/Fonts/AppleSDGothicNeo.ttc" // macOS
        };

        for (String fontPath : fontPaths) {
            Path path = Paths.get(fontPath);
            if (Files.exists(path)) {
                return PDType0Font.load(document, path.toFile());
            }
        }

        throw new RuntimeException("한글 폰트를 찾을 수 없습니다. 시스템에 한글 폰트가 설치되어 있는지 확인하세요.");
    }

    @Override
    public List<GeneratedDocumentDTO> getDocumentsByIncomingId(Integer incomingId) {
        return documentMapper.selectDocumentsByIncomingId(incomingId);
    }

    @Override
    public GeneratedDocumentDTO getDocumentById(Long documentId) {
        return documentMapper.selectDocumentById(documentId);
    }

    @Override
    @Transactional
    public void deleteDocument(Long documentId) {
        GeneratedDocumentDTO document = documentMapper.selectDocumentById(documentId);
        if (document != null) {
            // 실제 파일 삭제
            try {
                Path filePath = Paths.get(document.getFilePath());
                Files.deleteIfExists(filePath);
            } catch (IOException e) {
                System.err.println("파일 삭제 실패: " + e.getMessage());
            }

            // DB에서 삭제
            documentMapper.deleteDocument(documentId);
        }
    }

    @Override
    public Resource loadDocumentAsResource(String fileName) {
        try {
            Path filePath = Paths.get(documentDir, fileName);
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new RuntimeException("파일을 찾을 수 없거나 읽을 수 없습니다: " + fileName);
            }
        } catch (Exception e) {
            throw new RuntimeException("파일 로딩 실패: " + fileName, e);
        }
    }

    @Override
    @Transactional
    public GeneratedDocumentDTO generateCanvasDocument(Long templateId, String title, Integer incomingId,
            org.springframework.web.multipart.MultipartFile image,
            Integer createdBy) {
        try {
            // 파일명 생성
            String timestamp = java.time.LocalDateTime.now()
                    .format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String fileName = "canvas_" + timestamp + ".png";
            java.nio.file.Path imagePath = java.nio.file.Paths.get(documentDir, fileName);

            // 이미지 저장
            java.nio.file.Files.copy(image.getInputStream(), imagePath);

            // DTO 생성
            GeneratedDocumentDTO documentData = new GeneratedDocumentDTO();
            documentData.setTemplateId(templateId);
            documentData.setIncomingId(incomingId);
            documentData.setTitle(title);
            documentData.setFileName(fileName);
            documentData.setFilePath(imagePath.toString());
            documentData.setFileSize(java.nio.file.Files.size(imagePath));
            documentData.setCreatedBy(createdBy);

            // DB 저장
            documentMapper.insertDocument(documentData);

            return documentData;
        } catch (Exception e) {
            throw new RuntimeException("Canvas 문서 생성 실패: " + e.getMessage(), e);
        }
    }

    @Override
    @Transactional
    public GeneratedDocumentDTO generateCanvasPDF(Long templateId, String title, Integer incomingId,
            org.springframework.web.multipart.MultipartFile image,
            Integer createdBy) {
        try {
            // PDF 파일명 생성
            String timestamp = java.time.LocalDateTime.now()
                    .format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String pdfFileName = "canvas_" + timestamp + ".pdf";
            java.nio.file.Path pdfPath = java.nio.file.Paths.get(documentDir, pdfFileName);

            // Canvas 이미지를 임시 저장
            String tempImageName = "temp_" + timestamp + ".png";
            java.nio.file.Path tempImagePath = java.nio.file.Paths.get(documentDir, tempImageName);
            java.nio.file.Files.copy(image.getInputStream(), tempImagePath,
                    java.nio.file.StandardCopyOption.REPLACE_EXISTING);

            // PDF 문서 생성 (A4 크기)
            PDDocument document = new PDDocument();
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            // 이미지를 PDF에 삽입
            PDImageXObject canvasImage = PDImageXObject.createFromFile(tempImagePath.toString(), document);

            try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
                float pageHeight = page.getMediaBox().getHeight();

                // Canvas 이미지 원본 크기 (픽셀)
                float imageWidth = canvasImage.getWidth();
                float imageHeight = canvasImage.getHeight();

                // 이미지를 원본 크기 그대로 PDF에 삽입
                // 픽셀 크기를 포인트로 직접 사용 (1픽셀 = 1포인트)
                float pdfWidth = imageWidth;
                float pdfHeight = imageHeight;

                // 좌상단 기준 (0, 0)부터 시작
                // PDF 좌표계는 좌하단이 원점이므로 y 좌표 조정
                float x = 0;
                float y = pageHeight - pdfHeight;

                // 이미지 그리기 (원본 크기 그대로)
                contentStream.drawImage(canvasImage, x, y, pdfWidth, pdfHeight);
            }

            // PDF 저장
            document.save(pdfPath.toFile());
            document.close();

            // 임시 이미지 삭제
            java.nio.file.Files.deleteIfExists(tempImagePath);

            // DTO 생성
            GeneratedDocumentDTO documentData = new GeneratedDocumentDTO();
            documentData.setTemplateId(templateId);
            documentData.setIncomingId(incomingId);
            documentData.setTitle(title);
            documentData.setFileName(pdfFileName);
            documentData.setFilePath(pdfPath.toString());
            documentData.setFileSize(java.nio.file.Files.size(pdfPath));
            documentData.setCreatedBy(createdBy);

            // DB 저장
            documentMapper.insertDocument(documentData);

            return documentData;

        } catch (Exception e) {
            throw new RuntimeException("Canvas PDF 생성 실패: " + e.getMessage(), e);
        }
    }
}
