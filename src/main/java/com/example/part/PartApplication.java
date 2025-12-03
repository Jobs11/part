package com.example.part;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class PartApplication {

	public static void main(String[] args) {
		SpringApplication.run(PartApplication.class, args);
	}

}
