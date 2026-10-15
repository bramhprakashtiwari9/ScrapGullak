package com.scrapgullak.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.StreamSupport;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.fail;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Base for black-box API tests: the full application on the in-memory H2 profile with the seed (incl. demo
 * data, spec section 9), exercised only through HTTP + JSON. All subclasses share one cached Spring context,
 * so tests never assume absolute values for state other tests may change; they assert deltas or create
 * their own pickups instead.
 */
@SpringBootTest(properties = {"app.seed.enabled=true", "app.seed.demo-data=true"})
@AutoConfigureMockMvc
@ActiveProfiles("h2")
public abstract class ApiTestSupport {

    protected static final String API = "/api/v1";

    protected static final String ADMIN_PHONE = "9999999999";
    protected static final String ADMIN_PASSWORD = "Admin@123";
    protected static final String AGENT_PHONE = "9876500001";
    protected static final String OTHER_AGENT_PHONE = "9876500002";
    protected static final String AGENT_PASSWORD = "Agent@123";
    protected static final String CUSTOMER_PHONE = "9876543210";
    protected static final String CORPORATE_PHONE = "9810011223";
    protected static final String CUSTOMER_PASSWORD = "Customer@123";

    protected static final String COPPER = "Copper Wire (Bright)";
    protected static final String NEWSPAPER = "Newspaper (Akhbaar)";
    protected static final String PET = "PET Bottles";
    protected static final String HMS_IRON = "HMS Iron (Heavy Melting)";
    protected static final String MIXED = "Mixed Day Scrap (Kabad)";

    protected static final double KG_TOLERANCE = 0.0001;

    /** Tokens are valid for a day and the context is shared, so log each demo account in once. */
    private static final Map<String, String> TOKENS = new ConcurrentHashMap<>();

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    @Autowired
    protected Clock clock;

    // ------------------------------------------------------------------ HTTP helpers

    protected ResultActions doGet(String path, String token) throws Exception {
        return mockMvc.perform(withAuth(get(API + path), token));
    }

    protected ResultActions doPost(String path, String token, Object body) throws Exception {
        return mockMvc.perform(withJson(withAuth(post(API + path), token), body));
    }

    protected ResultActions doPut(String path, String token, Object body) throws Exception {
        return mockMvc.perform(withJson(withAuth(put(API + path), token), body));
    }

    protected ResultActions doPatch(String path, String token) throws Exception {
        return mockMvc.perform(withAuth(patch(API + path), token));
    }

    /** POST with a raw JSON string (for malformed or invalid-enum payloads). */
    protected ResultActions doPostRaw(String path, String token, String json) throws Exception {
        return mockMvc.perform(withAuth(post(API + path), token)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .content(json));
    }

    private MockHttpServletRequestBuilder withAuth(MockHttpServletRequestBuilder request, String token) {
        request.accept(MediaType.APPLICATION_JSON);
        if (token != null) {
            request.header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
        }
        return request;
    }

    private MockHttpServletRequestBuilder withJson(MockHttpServletRequestBuilder request, Object body)
            throws Exception {
        request.contentType(MediaType.APPLICATION_JSON);
        if (body != null) {
            request.content(objectMapper.writeValueAsString(body));
        }
        return request;
    }

    protected JsonNode json(ResultActions actions) throws Exception {
        return json(actions.andReturn());
    }

    protected JsonNode json(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
    }

    // ------------------------------------------------------------------ auth helpers

    protected String login(String phone, String password) throws Exception {
        return TOKENS.computeIfAbsent(phone + ':' + password, key -> {
            try {
                JsonNode body = json(doPost("/auth/login", null, Map.of("phone", phone, "password", password))
                        .andExpect(status().isOk()));
                String token = body.path("token").asText(null);
                assertThat(token).as("token for %s", phone).isNotBlank();
                return token;
            } catch (Exception e) {
                throw new IllegalStateException("Login failed for " + phone, e);
            }
        });
    }

    protected String adminToken() throws Exception {
        return login(ADMIN_PHONE, ADMIN_PASSWORD);
    }

    protected String agentToken() throws Exception {
        return login(AGENT_PHONE, AGENT_PASSWORD);
    }

    protected String otherAgentToken() throws Exception {
        return login(OTHER_AGENT_PHONE, AGENT_PASSWORD);
    }

    protected String customerToken() throws Exception {
        return login(CUSTOMER_PHONE, CUSTOMER_PASSWORD);
    }

    protected String corporateToken() throws Exception {
        return login(CORPORATE_PHONE, CUSTOMER_PASSWORD);
    }

    /** A 10-digit mobile starting with 70, which no seeded account uses. */
    protected static String uniquePhone() {
        return "70" + String.format("%08d", ThreadLocalRandom.current().nextInt(100_000_000));
    }

    /** Registers a fresh household customer and returns the full AuthResponse. */
    protected JsonNode registerCustomer(String phone, String password) throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("fullName", "Test Customer " + phone);
        body.put("phone", phone);
        body.put("email", "test" + phone + "@example.in");
        body.put("password", password);
        body.put("address", "A-1, Test Towers");
        body.put("noidaSector", "Sector 50");
        return json(doPost("/auth/register", null, body).andExpect(status().isCreated()));
    }

    // ------------------------------------------------------------------ domain helpers

    protected LocalDate today() {
        return LocalDate.now(clock);
    }

    /** Category id by its seeded name, looked up through the public rate card. */
    protected long categoryId(String name) throws Exception {
        return category(name).path("id").asLong();
    }

    /** Category JSON (with mill rate) from the admin rate card. */
    protected JsonNode category(String name) throws Exception {
        JsonNode rates = json(doGet("/admin/rates", adminToken()).andExpect(status().isOk()));
        return stream(rates)
                .filter(c -> name.equals(c.path("name").asText()))
                .findFirst()
                .orElseGet(() -> fail("Category not seeded: " + name));
    }

    protected long agentId(String phone) throws Exception {
        JsonNode agents = json(doGet("/admin/agents", adminToken()).andExpect(status().isOk()));
        return stream(agents)
                .filter(a -> phone.equals(a.path("phone").asText()))
                .findFirst()
                .orElseGet(() -> fail("Agent not seeded: " + phone))
                .path("id").asLong();
    }

    protected JsonNode inventoryRow(long categoryId) throws Exception {
        JsonNode rows = json(doGet("/admin/inventory", adminToken()).andExpect(status().isOk()));
        return stream(rows)
                .filter(r -> r.path("scrapCategory").path("id").asLong() == categoryId)
                .findFirst()
                .orElseGet(() -> fail("No inventory row for category " + categoryId));
    }

    protected JsonNode passbook(String customerToken) throws Exception {
        return json(doGet("/customer/gullak-passbook", customerToken).andExpect(status().isOk()));
    }

    /** A valid household pickup request for today. */
    protected Map<String, Object> pickupRequest(LocalDate scheduledDate) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("noidaSector", "Sector 74");
        body.put("fullAddress", "C-1204, Supertech Capetown");
        body.put("gpsLat", 28.5733);
        body.put("gpsLng", 77.3812);
        body.put("scheduledDate", scheduledDate.toString());
        body.put("timeSlot", "11 AM – 2 PM");
        body.put("estimatedWeightRange", "20 – 50 kg");
        body.put("scrapGroups", List.of("NON_FERROUS", "PAPER"));
        body.put("notes", "Integration test pickup");
        return body;
    }

    /** Books a pickup for today as the given customer and returns the created order. */
    protected JsonNode createPickup(String customerToken) throws Exception {
        return json(doPost("/customer/pickups", customerToken, pickupRequest(today()))
                .andExpect(status().isCreated()));
    }

    /** Books a pickup as the demo customer and assigns it to the demo agent (Ravi). */
    protected JsonNode createAssignedPickup() throws Exception {
        long orderId = createPickup(customerToken()).path("id").asLong();
        return json(doPatch("/admin/pickups/" + orderId + "/assign/" + agentId(AGENT_PHONE), adminToken())
                .andExpect(status().isOk()));
    }

    /** Admin cancel, used to tidy up open pickups a test no longer needs. */
    protected void adminCancel(long orderId) throws Exception {
        doPatch("/admin/pickups/" + orderId + "/cancel", adminToken()).andExpect(status().isOk());
    }

    protected static Map<String, Object> line(long categoryId, double netWeightKg) {
        return Map.of("categoryId", categoryId, "netWeightKg", netWeightKg);
    }

    protected static Map<String, Object> weighing(List<Map<String, Object>> items, String paymentMode,
                                                 String upiTransactionRef) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("items", items);
        body.put("paymentMode", paymentMode);
        body.put("upiTransactionRef", upiTransactionRef);
        return body;
    }

    // ------------------------------------------------------------------ JSON helpers

    protected static java.util.stream.Stream<JsonNode> stream(JsonNode array) {
        assertThat(array.isArray()).as("expected a JSON array but got %s", array).isTrue();
        return StreamSupport.stream(array.spliterator(), false);
    }

    protected static JsonNode findById(JsonNode array, long id) {
        return stream(array)
                .filter(n -> n.path("id").asLong() == id)
                .findFirst()
                .orElse(null);
    }

    protected static BigDecimal money(JsonNode node) {
        assertThat(node.isNumber()).as("expected a number but got %s", node).isTrue();
        return node.decimalValue().setScale(2, RoundingMode.HALF_UP);
    }

    protected static BigDecimal money(String value) {
        return new BigDecimal(value).setScale(2, RoundingMode.HALF_UP);
    }
}
