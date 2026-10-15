package com.scrapgullak.api;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Authentication and role boundaries, and the public documentation endpoints. */
class SecurityApiTest extends ApiTestSupport {

    private static final String SIGN_IN = "Please sign in to continue.";
    private static final String NO_ACCESS = "You do not have access to this action.";

    @Test
    void customerEndpointsRequireAToken() throws Exception {
        doGet("/customer/pickups", null)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value(SIGN_IN))
                .andExpect(jsonPath("$.path").value(API + "/customer/pickups"));
    }

    @Test
    void invalidOrTamperedTokenIs401() throws Exception {
        doGet("/customer/pickups", "garbage.token.value")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value(SIGN_IN));

        String token = customerToken();
        String tampered = token.substring(0, token.length() - 4) + (token.endsWith("AAAA") ? "BBBB" : "AAAA");
        doGet("/customer/pickups", tampered)
                .andExpect(status().isUnauthorized());
    }

    @Test
    void protectedRoutesNeedAuthentication() throws Exception {
        doGet("/admin/dashboard/metrics", null).andExpect(status().isUnauthorized());
        doGet("/agent/pickups/assigned", null).andExpect(status().isUnauthorized());
        doGet("/customer/gullak-passbook", null).andExpect(status().isUnauthorized());
    }

    @Test
    void customerCannotUseAdminEndpoints() throws Exception {
        doGet("/admin/rates", customerToken())
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.message").value(NO_ACCESS));
        doGet("/admin/dashboard/metrics", customerToken()).andExpect(status().isForbidden());
        doPatch("/admin/pickups/1/assign/2", customerToken()).andExpect(status().isForbidden());
    }

    @Test
    void customerCannotUseAgentEndpoints() throws Exception {
        doGet("/agent/pickups/assigned", customerToken())
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(NO_ACCESS));
        doPost("/agent/pickups/1/complete-weighing", customerToken(),
                weighing(List.of(line(1, 1.0)), "UPI", null))
                .andExpect(status().isForbidden());
    }

    @Test
    void agentCannotUseAdminOrCustomerEndpoints() throws Exception {
        doGet("/admin/inventory", agentToken()).andExpect(status().isForbidden());
        doGet("/customer/pickups", agentToken()).andExpect(status().isForbidden());
    }

    @Test
    void adminCannotUseCustomerEndpoints() throws Exception {
        doGet("/customer/gullak-passbook", adminToken()).andExpect(status().isForbidden());
    }

    @Test
    void openApiDocsArePublic() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.openapi").exists())
                .andExpect(jsonPath("$.paths").isMap())
                .andExpect(jsonPath("$.components.securitySchemes.bearerAuth").exists());
    }

    @Test
    void healthIsPublic() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void unknownApiRouteIsNotA500() throws Exception {
        doGet("/rates/does-not-exist", adminToken()).andExpect(status().isNotFound());
    }
}
