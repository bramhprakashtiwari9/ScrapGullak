package com.scrapgullak.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.ZoneId;

/**
 * Exposes the business {@link Clock}. Its zone ({@code app.timezone}, Asia/Kolkata by default) defines
 * what "today" means for scheduling and dashboard metrics; tests can replace it with a fixed clock.
 */
@Configuration
public class ClockConfig {

    @Bean
    public Clock clock(AppProperties properties) {
        return Clock.system(ZoneId.of(properties.timezone()));
    }
}
