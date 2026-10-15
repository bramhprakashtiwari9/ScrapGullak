package com.scrapgullak.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Enables {@code @Scheduled} jobs (e.g. provisioning next year's order-number counter row).
 */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
