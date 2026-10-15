package com.scrapgullak.api;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Customer booking rules, pickup history, cancellation and passbook. */
class CustomerPickupApiTest extends ApiTestSupport {

    private static final String DATE_WINDOW = "Pick a date between today and the next 60 days.";

    // ------------------------------------------------------------------ booking

    @Test
    void bookingAcceptsTheWholeSixtyDayWindow() throws Exception {
        String customer = customerToken();
        long last = json(doPost("/customer/pickups", customer, pickupRequest(today().plusDays(60)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.scheduledDate").value(today().plusDays(60).toString())))
                .path("id").asLong();
        adminCancel(last);
    }

    @Test
    void bookingInThePastIs422() throws Exception {
        doPost("/customer/pickups", customerToken(), pickupRequest(today().minusDays(1)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value(DATE_WINDOW));
    }

    @Test
    void bookingTooFarAheadIs422() throws Exception {
        doPost("/customer/pickups", customerToken(), pickupRequest(today().plusDays(61)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value(DATE_WINDOW));
    }

    @Test
    void bookingWithDataUrlPhotoIs400() throws Exception {
        Map<String, Object> body = pickupRequest(today());
        body.put("photoUrl", "data:image/png;base64,iVBORw0KGgo=");

        doPost("/customer/pickups", customerToken(), body)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.photoUrl").exists());
    }

    @Test
    void bookingWithHttpsPhotoKeepsTheLink() throws Exception {
        Map<String, Object> body = pickupRequest(today());
        body.put("photoUrl", "https://cdn.example.in/pickups/scrap.jpg");

        long id = json(doPost("/customer/pickups", customerToken(), body)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.photoUrl").value("https://cdn.example.in/pickups/scrap.jpg")))
                .path("id").asLong();
        adminCancel(id);
    }

    @Test
    void bookingRequiresAddressSectorDateAndSlot() throws Exception {
        doPost("/customer/pickups", customerToken(), Map.of("notes", "missing everything"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.noidaSector").value("Select your sector."))
                .andExpect(jsonPath("$.fieldErrors.fullAddress").exists())
                .andExpect(jsonPath("$.fieldErrors.scheduledDate").value("Choose a pickup date."))
                .andExpect(jsonPath("$.fieldErrors.timeSlot").value("Select a time slot."));
    }

    @Test
    void bookingWithInvalidOrderTypeIs400() throws Exception {
        String json = """
                {"orderType":"SPACE_PICKUP","noidaSector":"Sector 74","fullAddress":"C-1204",
                 "scheduledDate":"%s","timeSlot":"8 – 11 AM"}
                """.formatted(today());

        doPostRaw("/customer/pickups", customerToken(), json)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        "Invalid value 'SPACE_PICKUP' for orderType. Allowed: DOORSTEP_B2C, INDUSTRIAL_B2B"));
    }

    @Test
    void corporateBulkPickupCarriesCompanyDetails() throws Exception {
        Map<String, Object> corporate = new LinkedHashMap<>();
        corporate.put("companyName", "Ecotech Components Pvt Ltd");
        corporate.put("gstNumber", "09AABCE1234F1Z5");
        corporate.put("contactName", "Anil Mehta");
        corporate.put("phone", CORPORATE_PHONE);
        corporate.put("email", "facility@ecotechcomponents.in");
        corporate.put("requestType", "Monthly contract");
        corporate.put("frequency", "Monthly");

        Map<String, Object> body = pickupRequest(today().plusDays(2));
        body.put("orderType", "INDUSTRIAL_B2B");
        body.put("noidaSector", "Ecotech-3 (Greater Noida)");
        body.put("fullAddress", "Plot 14, Udyog Vihar");
        body.put("estimatedWeightRange", "1 – 5 ton");
        body.put("companyName", "Ecotech Components Pvt Ltd");
        body.put("contactPhone", CORPORATE_PHONE);
        body.put("corporateDetails", corporate);

        long id = json(doPost("/customer/pickups", corporateToken(), body)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.orderType").value("INDUSTRIAL_B2B"))
                .andExpect(jsonPath("$.status").value("BOOKED"))
                .andExpect(jsonPath("$.customer.fullName").value("Ecotech Components Pvt Ltd"))
                .andExpect(jsonPath("$.corporateDetails.companyName").value("Ecotech Components Pvt Ltd"))
                .andExpect(jsonPath("$.corporateDetails.gstNumber").value("09AABCE1234F1Z5"))
                .andExpect(jsonPath("$.corporateDetails.contactName").value("Anil Mehta"))
                .andExpect(jsonPath("$.corporateDetails.email").value("facility@ecotechcomponents.in"))
                .andExpect(jsonPath("$.corporateDetails.requestType").value("Monthly contract"))
                .andExpect(jsonPath("$.corporateDetails.frequency").value("Monthly")))
                .path("id").asLong();
        adminCancel(id);
    }

    @Test
    void corporatePickupFallsBackToTheAccountsCompanyAndGstin() throws Exception {
        Map<String, Object> body = pickupRequest(today().plusDays(3));
        body.put("orderType", "INDUSTRIAL_B2B");

        long id = json(doPost("/customer/pickups", corporateToken(), body)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.corporateDetails.companyName").value("Ecotech Components Pvt Ltd"))
                .andExpect(jsonPath("$.corporateDetails.gstNumber").value("09AABCE1234F1Z5")))
                .path("id").asLong();
        adminCancel(id);
    }

    @Test
    void householdPickupHasNoCorporateDetails() throws Exception {
        JsonNode order = createPickup(customerToken());
        assertThat(order.path("corporateDetails").isNull() || order.path("corporateDetails").isMissingNode()).isTrue();
        adminCancel(order.path("id").asLong());
    }

    // ------------------------------------------------------------------ history

    @Test
    void pickupHistoryIsTheCallersOwnNewestFirst() throws Exception {
        JsonNode pickups = json(doGet("/customer/pickups", customerToken()).andExpect(status().isOk()));

        assertThat(pickups.size()).isGreaterThan(0);
        Instant previous = null;
        for (JsonNode p : pickups) {
            assertThat(p.path("customer").path("phone").asText()).isEqualTo(CUSTOMER_PHONE);
            Instant created = Instant.parse(p.path("createdAt").asText());
            if (previous != null) {
                assertThat(created).isBeforeOrEqualTo(previous);
            }
            previous = created;
        }
    }

    @Test
    void seededPaidPickupsCarryTheirWeightReceipts() throws Exception {
        JsonNode pickups = json(doGet("/customer/pickups", customerToken()));
        List<JsonNode> paid = stream(pickups).filter(p -> "PAID".equals(p.path("status").asText())).toList();

        assertThat(paid).isNotEmpty();
        for (JsonNode p : paid) {
            assertThat(p.path("items").size()).as(p.path("orderNumber").asText()).isPositive();
            assertThat(p.path("finalPayoutInr").isNumber()).isTrue();
            assertThat(p.path("paidAt").asText()).isNotBlank();
        }
    }

    @Test
    void newCustomerStartsWithAnEmptyHistoryAndPassbook() throws Exception {
        String token = registerCustomer(uniquePhone(), "Secret@123").path("token").asText();

        doGet("/customer/pickups", token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
        doGet("/customer/gullak-passbook", token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.gullakTotalEarnings").value(0.0))
                .andExpect(jsonPath("$.totalRecycledKg").value(0.0))
                .andExpect(jsonPath("$.co2SavedKg").value(0))
                .andExpect(jsonPath("$.totalPickups").value(0))
                .andExpect(jsonPath("$.transactions", hasSize(0)));
    }

    @Test
    void seededPassbookMatchesItsTransactions() throws Exception {
        JsonNode passbook = passbook(customerToken());

        assertThat(passbook.path("totalPickups").asInt()).isEqualTo(passbook.path("transactions").size());
        BigDecimal sum = stream(passbook.path("transactions"))
                .map(t -> money(t.path("amountInr")))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertThat(money(passbook.path("gullakTotalEarnings"))).isEqualByComparingTo(sum);
    }

    // ------------------------------------------------------------------ cancellation

    @Test
    void customerCanCancelABookedPickupOnce() throws Exception {
        String customer = customerToken();
        long id = createPickup(customer).path("id").asLong();

        doPost("/customer/pickups/" + id + "/cancel", customer, null).andExpect(status().isOk());
        assertThat(findById(json(doGet("/customer/pickups", customer)), id).path("status").asText())
                .isEqualTo("CANCELLED");

        doPost("/customer/pickups/" + id + "/cancel", customer, null)
                .andExpect(status().isConflict());
    }

    @Test
    void customerCanCancelAnAssignedPickup() throws Exception {
        long id = createAssignedPickup().path("id").asLong();

        doPost("/customer/pickups/" + id + "/cancel", customerToken(), null).andExpect(status().isOk());

        assertThat(findById(json(doGet("/customer/pickups", customerToken())), id).path("status").asText())
                .isEqualTo("CANCELLED");
        assertThat(findById(json(doGet("/agent/pickups/assigned", agentToken())), id))
                .as("cancelled pickup leaves the agent's route").isNull();
    }

    @Test
    void customerCannotCancelOnceTheAgentIsOnTheWay() throws Exception {
        long id = createAssignedPickup().path("id").asLong();
        doPost("/agent/pickups/" + id + "/start", agentToken(), null).andExpect(status().isOk());

        doPost("/customer/pickups/" + id + "/cancel", customerToken(), null)
                .andExpect(status().isConflict());

        adminCancel(id);
        assertThat(findById(json(doGet("/admin/pickups?status=CANCELLED", adminToken())), id)).isNotNull();
    }

    @Test
    void customerCannotCancelSomeoneElsesPickup() throws Exception {
        long priyasOrder = createPickup(customerToken()).path("id").asLong();
        String stranger = registerCustomer(uniquePhone(), "Secret@123").path("token").asText();

        doPost("/customer/pickups/" + priyasOrder + "/cancel", stranger, null)
                .andExpect(status().isNotFound());
        doPost("/customer/pickups/" + priyasOrder + "/cancel", corporateToken(), null)
                .andExpect(status().isNotFound());

        JsonNode stillBooked = findById(json(doGet("/customer/pickups", customerToken())), priyasOrder);
        assertThat(stillBooked.path("status").asText()).isEqualTo("BOOKED");
        assertThat(findById(json(doGet("/customer/pickups", stranger)), priyasOrder)).isNull();
        adminCancel(priyasOrder);
    }

    @Test
    void cancellingAMissingPickupIs404() throws Exception {
        doPost("/customer/pickups/987654321/cancel", customerToken(), null)
                .andExpect(status().isNotFound());
    }

    @Test
    void newPickupHasNoAgentYet() throws Exception {
        String customer = customerToken();
        long id = json(doPost("/customer/pickups", customer, pickupRequest(today()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.assignedAgent").value(nullValue()))
                .andExpect(jsonPath("$.paymentMode").value(nullValue())))
                .path("id").asLong();
        adminCancel(id);
    }
}
