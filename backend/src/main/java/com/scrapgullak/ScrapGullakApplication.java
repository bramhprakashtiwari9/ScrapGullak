package com.scrapgullak;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/**
 * ScrapGullak backend: doorstep scrap pickups, yard inventory and the customer's Gullak passbook.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
public class ScrapGullakApplication {

    public static void main(String[] args) {
        SpringApplication.run(ScrapGullakApplication.class, args);
    }
}
