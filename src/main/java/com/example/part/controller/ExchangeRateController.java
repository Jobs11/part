package com.example.part.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.part.service.ExchangeRateService;

@RestController
@RequestMapping("/livewalk/exchange-rate")
public class ExchangeRateController {

    @Autowired
    private ExchangeRateService exchangeRateService;

    @GetMapping("/{currency}")
    public ResponseEntity<?> getExchangeRate(@PathVariable String currency) {
        Double rate = exchangeRateService.getExchangeRate(currency);

        if (rate != null) {
            return ResponseEntity.ok(rate);
        } else {
            return ResponseEntity.ok(getDefaultRate(currency));
        }
    }

    private Double getDefaultRate(String currency) {
        switch (currency) {
            case "USD":
                return 1300.0;
            case "JPY":
                return 900.0;
            case "EUR":
                return 1400.0;
            case "CNY":
                return 180.0;
            default:
                return 1.0;
        }
    }
}
