package com.scrapgullak.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI document served at {@code /v3/api-docs} (Swagger UI at {@code /swagger-ui.html}). Declares the
 * {@value #SECURITY_SCHEME} HTTP bearer scheme and applies it globally; public endpoints simply ignore it.
 */
@Configuration
public class OpenApiConfig {

    public static final String SECURITY_SCHEME = "bearerAuth";

    @Bean
    public OpenAPI scrapGullakOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("ScrapGullak API")
                        .version("v1")
                        .description("Doorstep scrap pickup booking, live buying rates, agent weighing, "
                                + "yard inventory and the customer's Gullak passbook. Sign in via "
                                + "POST /api/v1/auth/login and use the returned token with the Authorize button."))
                .components(new Components()
                        .addSecuritySchemes(SECURITY_SCHEME, new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("JWT access token from /api/v1/auth/login or /api/v1/auth/register.")))
                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME));
    }
}
