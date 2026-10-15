package com.scrapgullak.bootstrap;

import com.scrapgullak.config.AppProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

import static org.assertj.core.api.Assertions.assertThat;

/** The seed summary may show the documented demo passwords but never a password the operator configured. */
@ExtendWith(OutputCaptureExtension.class)
class DataInitializerLogTest {

    @Test
    void operatorSuppliedPasswordsAreNeverLogged(CapturedOutput output) {
        AppProperties.Seed seed = new AppProperties.Seed(true, true, "S3cure!admin", "S3cure!agent", "S3cure!customer");

        DataInitializer.logSummary(seed, new DataInitializer.Stats());

        assertThat(output.getAll())
                .doesNotContain("S3cure!")
                .contains("9999999999", "9876500001", "9876543210", "9810011223")
                .contains("<from SEED_ADMIN_PASSWORD>", "<from SEED_AGENT_PASSWORD>", "<from SEED_CUSTOMER_PASSWORD>");
    }

    @Test
    void documentedDefaultPasswordsAreStillShownForLocalDemos(CapturedOutput output) {
        AppProperties.Seed seed = new AppProperties.Seed(true, true, null, null, null);

        DataInitializer.logSummary(seed, new DataInitializer.Stats());

        assertThat(output.getAll())
                .contains("9999999999 / Admin@123", "9876500001 / Agent@123", "9876543210 / Customer@123")
                .doesNotContain("<from SEED_");
    }

    @Test
    void withoutDemoDataOnlyPhonesAreLogged(CapturedOutput output) {
        AppProperties.Seed seed = new AppProperties.Seed(true, false, "S3cure!admin", "S3cure!agent", "S3cure!customer");

        DataInitializer.logSummary(seed, new DataInitializer.Stats());

        assertThat(output.getAll()).doesNotContain("S3cure!").contains("9999999999");
    }
}
