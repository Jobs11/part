package com.example.part.config;

import java.io.File;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${file.upload-dir:/var/livewalk/uploads/images}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 업로드된 이미지 파일에 접근할 수 있도록 설정
        File uploadDirectory = new File(uploadDir);
        String absolutePath = uploadDirectory.getAbsolutePath();
        String location = "file:" + absolutePath + File.separator;

        System.out.println("=== 이미지 리소스 핸들러 등록 ===");
        System.out.println("Handler: /uploads/images/**");
        System.out.println("Location: " + location);
        System.out.println("================================");

        registry.addResourceHandler("/uploads/images/**")
                .addResourceLocations(location);

        registry.addResourceHandler("/favicon.ico")
                .addResourceLocations("classpath:/static/images/");
    }

}
