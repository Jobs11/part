package com.example.part.service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class ExchangeRateService {

    @Value("${bok.api.key}")
    private String apiKey;

    @Value("${bok.api.url}")
    private String baseUrl;

    public Double getExchangeRate(String currency) {
        try {
            String date = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
            String currencyCode = getCurrencyCode(currency);

            String url = String.format("%s/%s/json/kr/1/1/731Y001/D/%s/%s/%s",
                    baseUrl, apiKey, date, date, currencyCode);

            RestTemplate restTemplate = new RestTemplate();
            String response = restTemplate.getForObject(url, String.class);

            JSONObject json = new JSONObject(response);
            JSONArray rows = json.getJSONObject("StatisticSearch").getJSONArray("row");

            if (rows.length() > 0) {
                double rate = Double.parseDouble(rows.getJSONObject(0).getString("DATA_VALUE"));

                // JPY는 100엔당 환율이므로 100으로 나눠서 1엔당 환율로 변환
                if ("JPY".equals(currency)) {
                    rate = rate / 100.0;
                }

                return rate;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }

    private String getCurrencyCode(String currency) {
        switch (currency) {
            case "USD":
                return "0000001";
            case "JPY":
                return "0000002";
            case "EUR":
                return "0000003";
            case "CNY":
                return "0000053";
            default:
                return "0000001";
        }
    }
}
