package com.scrapgullak.support;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDate;

/**
 * Creates the order-number counter rows for the current and the next year ahead of time: at startup and again
 * every midnight (business time zone). A booking then always finds its row and never has to open a second
 * transaction (and pooled connection) to create it, which under a burst of first-of-the-year bookings could
 * exhaust the connection pool.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OrderSequenceProvisioner {

    private final OrderNumberGenerator orderNumberGenerator;
    private final Clock clock;

    @EventListener(ApplicationReadyEvent.class)
    public void provisionAtStartup() {
        provision();
    }

    @Scheduled(cron = "0 0 0 * * *", zone = "${app.timezone:Asia/Kolkata}")
    public void provisionDaily() {
        provision();
    }

    public void provision() {
        int year = LocalDate.now(clock).getYear();
        orderNumberGenerator.ensureYear(year);
        orderNumberGenerator.ensureYear(year + 1);
        log.debug("Order sequences ensured for {} and {}", year, year + 1);
    }
}
