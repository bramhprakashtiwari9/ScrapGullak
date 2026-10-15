package com.scrapgullak.config;

import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

import java.io.IOException;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Compose only uses a project {@code .env} file to fill in {@code ${...}} references; it does not pass the file
 * to the container. So every environment variable application.yml reads must be forwarded explicitly by the
 * {@code app} service, or the README's production settings silently fall back to the dev defaults.
 */
class DockerComposeEnvironmentTest {

    /** Variables the compose file deliberately pins (the container port is fixed by the port mapping). */
    private static final Set<String> NOT_FORWARDED = Set.of("PORT");

    /** Settings the production checklist tells operators to change: must be overridable from .env. */
    private static final Set<String> MUST_BE_OVERRIDABLE = Set.of(
            "SEED_ADMIN_PASSWORD", "SEED_AGENT_PASSWORD", "SEED_CUSTOMER_PASSWORD", "SEED_DEMO_DATA",
            "JPA_DDL_AUTO", "JWT_SECRET", "JWT_EXPIRATION_MINUTES", "JWT_ISSUER", "DB_PASSWORD",
            "CORS_ALLOWED_ORIGIN_PATTERNS");

    private static final Pattern PLACEHOLDER = Pattern.compile("\\$\\{([A-Z][A-Z0-9_]*)[:}]");

    @Test
    void appServiceForwardsEveryVariableTheApplicationReads() throws IOException {
        Map<String, Object> environment = appEnvironment();

        Set<String> read = new TreeSet<>();
        Matcher m = PLACEHOLDER.matcher(Files.readString(Path.of("src/main/resources/application.yml")));
        while (m.find()) {
            read.add(m.group(1));
        }
        read.removeAll(NOT_FORWARDED);

        assertThat(read).isNotEmpty();
        assertThat(environment).containsKeys(read.toArray(String[]::new));
    }

    @Test
    void productionSettingsCanBeOverriddenFromDotEnv() throws IOException {
        Map<String, Object> environment = appEnvironment();

        for (String name : MUST_BE_OVERRIDABLE) {
            assertThat(String.valueOf(environment.get(name)))
                    .as("app.environment.%s must reference ${%s...}", name, name)
                    .startsWith("${" + name);
        }
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> appEnvironment() throws IOException {
        try (Reader reader = Files.newBufferedReader(Path.of("docker-compose.yml"), StandardCharsets.UTF_8)) {
            Map<String, Object> compose = new Yaml().load(reader);
            Map<String, Object> services = (Map<String, Object>) compose.get("services");
            Map<String, Object> app = (Map<String, Object>) services.get("app");
            return (Map<String, Object>) app.get("environment");
        }
    }
}
