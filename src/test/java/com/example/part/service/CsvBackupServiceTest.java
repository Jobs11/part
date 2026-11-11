package com.example.part.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.util.ReflectionTestUtils;

import com.example.part.mapper.PartIncomingMapper;
import com.example.part.mapper.PartLocationMapper;
import com.example.part.mapper.PartUsageMapper;

class CsvBackupServiceTest {
    private static final List<String> PREFIXES = List.of("입고목록", "출고목록", "재고목록", "위치정보");
    private static final LocalDate TODAY = LocalDate.of(2026, 11, 10);

    @TempDir
    Path directory;
    CsvBackupService service;
    PartIncomingMapper incomingMapper;
    PartUsageMapper usageMapper;
    PartLocationMapper locationMapper;

    @BeforeEach
    void setUp() {
        incomingMapper = mock(PartIncomingMapper.class);
        usageMapper = mock(PartUsageMapper.class);
        locationMapper = mock(PartLocationMapper.class);
        service = new CsvBackupService(incomingMapper, usageMapper, locationMapper);
        ReflectionTestUtils.setField(service, "backupDir", directory.toString());
    }

    @Test
    void keepsExactlySevenCalendarDaysForEveryBackupType() throws Exception {
        for (String prefix : PREFIXES) {
            for (int age = 0; age <= 8; age++) {
                Files.writeString(backup(prefix, TODAY.minusDays(age)), "backup");
            }
        }
        service.cleanupOldBackups(TODAY);
        for (String prefix : PREFIXES) {
            for (int age = 0; age <= 8; age++) {
                assertEquals(age < 7, Files.exists(backup(prefix, TODAY.minusDays(age))),
                        prefix + " age " + age);
            }
        }
    }

    @Test
    void preservesUnrelatedFilesInvalidDatesFutureBackupsAndSubdirectories() throws Exception {
        String prefix = PREFIXES.get(0);
        List<String> preserved = List.of("notes_2020-01-01_backup.csv",
                prefix + "_2026-02-30_backup.csv", prefix + "_2020-01-01_backup.csv.bak",
                prefix + "_2020-01-01_backup.pdf");
        for (String name : preserved) Files.writeString(directory.resolve(name), "keep");
        Path future = backup(prefix, TODAY.plusDays(1));
        Files.writeString(future, "keep");
        Path nested = Files.createDirectories(directory.resolve(prefix + "_2020-01-01_backup.csv"));
        Path nestedFile = nested.resolve(prefix + "_2020-01-01_backup.csv");
        Files.writeString(nestedFile, "keep");
        service.cleanupOldBackups(TODAY);
        for (String name : preserved) assertTrue(Files.exists(directory.resolve(name)));
        assertTrue(Files.exists(future));
        assertTrue(Files.exists(nestedFile));
    }

    @Test
    void preservesOldBackupsOnStartupEvenWhenTodaysFilesExist() throws Exception {
        LocalDate today = LocalDate.now();
        Path expired = backup(PREFIXES.get(0), today.minusDays(7));
        Files.writeString(expired, "expired");
        for (String prefix : PREFIXES) Files.writeString(backup(prefix, today), "previous attempt");
        service.init();
        assertTrue(Files.exists(expired));
    }

    @Test
    void dailyBackupCreatesFourCurrentFilesAndRemovesExpiredFiles() throws Exception {
        LocalDate today = LocalDate.now();
        Path expired = backup(PREFIXES.get(0), today.minusDays(7));
        Files.writeString(expired, "expired");
        service.dailyBackup();
        assertFalse(Files.exists(expired));
        for (String prefix : PREFIXES) assertTrue(Files.exists(backup(prefix, today)));
    }

    @ParameterizedTest
    @ValueSource(strings = {"incoming", "usage", "inventory", "location"})
    void preservesOldBackupsIfAnyQueryFailsDespiteExistingTodaysFiles(String failure) throws Exception {
        LocalDate today = LocalDate.now();
        Path expired = backup(PREFIXES.get(0), today.minusDays(7));
        Files.writeString(expired, "expired");
        for (String prefix : PREFIXES) Files.writeString(backup(prefix, today), "previous attempt");
        RuntimeException unavailable = new RuntimeException("Database unavailable");
        switch (failure) {
            case "incoming" -> when(incomingMapper.selectAllIncoming()).thenThrow(unavailable);
            case "usage" -> when(usageMapper.selectAllUsage()).thenThrow(unavailable);
            case "inventory" -> when(incomingMapper.getCurrentInventory()).thenThrow(unavailable);
            case "location" -> when(locationMapper.selectAllLocations()).thenThrow(unavailable);
            default -> throw new IllegalArgumentException(failure);
        }
        service.dailyBackup();
        assertEquals("expired", Files.readString(expired));
        verify(incomingMapper).selectAllIncoming();
        verify(usageMapper).selectAllUsage();
        verify(incomingMapper).getCurrentInventory();
        verify(locationMapper).selectAllLocations();
    }

    @Test
    void preservesOldBackupsWhenCsvCannotBeWritten() throws Exception {
        LocalDate today = LocalDate.now();
        Path expired = backup(PREFIXES.get(0), today.minusDays(7));
        Files.writeString(expired, "expired");
        Files.createDirectory(backup(PREFIXES.get(3), today));
        service.dailyBackup();
        assertTrue(Files.exists(expired));
        for (String prefix : PREFIXES.subList(0, 3)) {
            assertTrue(Files.isRegularFile(backup(prefix, today)));
        }
    }

    @Test
    void cleansUpOnlyAfterASuccessfulRetry() throws Exception {
        LocalDate today = LocalDate.now();
        Path expired = backup(PREFIXES.get(0), today.minusDays(7));
        Files.writeString(expired, "expired");
        when(locationMapper.selectAllLocations())
                .thenThrow(new RuntimeException("Database unavailable"))
                .thenReturn(List.of());
        service.dailyBackup();
        assertTrue(Files.exists(expired));
        service.dailyBackup();
        assertFalse(Files.exists(expired));
        for (String prefix : PREFIXES) assertTrue(Files.isRegularFile(backup(prefix, today)));
    }

    private Path backup(String prefix, LocalDate date) {
        return directory.resolve(prefix + "_" + date + "_backup.csv");
    }
}
