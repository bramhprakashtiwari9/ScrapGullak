package com.scrapgullak.api;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Admin rate card, pickup dispatch, agents, yard inventory and dashboard. */
class AdminApiTest extends ApiTestSupport {

    // ------------------------------------------------------------------ rates

    @Test
    void adminRateCardIncludesMillRates() throws Exception {
        JsonNode rates = json(doGet("/admin/rates", adminToken())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(12)))
                .andExpect(jsonPath("$[*].millSellingRateInr", hasSize(12)))
                .andExpect(jsonPath("$[*].isActive", everyItem(notNullValue()))));

        JsonNode copper = stream(rates).filter(r -> COPPER.equals(r.path("name").asText())).findFirst().orElseThrow();
        assertThat(money(copper.path("buyingRateInr"))).isEqualByComparingTo("680");
        assertThat(money(copper.path("millSellingRateInr"))).isEqualByComparingTo("735");
    }

    @Test
    void updateRateChangesTheLiveRateCard() throws Exception {
        JsonNode original = category(MIXED);
        long id = original.path("id").asLong();
        try {
            doPut("/admin/rates/" + id, adminToken(), rateUpdate("11.5", "15.255", true))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(id))
                    .andExpect(jsonPath("$.name").value(MIXED))
                    .andExpect(jsonPath("$.buyingRateInr").value(11.5))
                    .andExpect(jsonPath("$.millSellingRateInr").value(15.26))
                    .andExpect(jsonPath("$.isActive").value(true));

            JsonNode live = findById(json(doGet("/rates/live", null)), id);
            assertThat(live).isNotNull();
            assertThat(money(live.path("buyingRateInr"))).isEqualByComparingTo("11.50");
            assertThat(live.has("millSellingRateInr")).isFalse();
        } finally {
            restore(original);
        }
    }

    @Test
    void negativeMarginIsAllowed() throws Exception {
        JsonNode original = category(MIXED);
        long id = original.path("id").asLong();
        try {
            doPut("/admin/rates/" + id, adminToken(), rateUpdate("20", "15", null))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.buyingRateInr").value(20.0))
                    .andExpect(jsonPath("$.millSellingRateInr").value(15.0))
                    .andExpect(jsonPath("$.isActive").value(true));
        } finally {
            restore(original);
        }
    }

    @Test
    void deactivatedCategoryDisappearsFromLiveRatesButNotFromAdmin() throws Exception {
        JsonNode original = category(MIXED);
        long id = original.path("id").asLong();
        try {
            doPut("/admin/rates/" + id, adminToken(), rateUpdate(
                    original.path("buyingRateInr").asText(), original.path("millSellingRateInr").asText(), false))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.isActive").value(false));

            assertThat(findById(json(doGet("/rates/live", null)), id)).isNull();
            assertThat(findById(json(doGet("/admin/rates", adminToken())), id)).isNotNull();
        } finally {
            restore(original);
        }
        assertThat(findById(json(doGet("/rates/live", null)), id)).isNotNull();
    }

    @Test
    void invalidRateUpdateIs400() throws Exception {
        long id = categoryId(MIXED);

        doPut("/admin/rates/" + id, adminToken(), rateUpdate("0", "15", null))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.buyingRateInr").value("Rates must be greater than ₹0."));
        doPut("/admin/rates/" + id, adminToken(), Map.of("buyingRateInr", 10))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.millSellingRateInr").exists());
    }

    @Test
    void updatingAMissingCategoryIs404() throws Exception {
        doPut("/admin/rates/987654", adminToken(), rateUpdate("10", "12", null))
                .andExpect(status().isNotFound());
    }

    // ------------------------------------------------------------------ pickups & agents

    @Test
    void allPickupsNewestFirst() throws Exception {
        JsonNode pickups = json(doGet("/admin/pickups", adminToken()).andExpect(status().isOk()));

        // Demo seed: at least Priya's 5 and the corporate customer's 2 sample pickups.
        assertThat(pickups.size()).isGreaterThanOrEqualTo(7);
        Instant previous = null;
        for (JsonNode p : pickups) {
            assertThat(p.path("orderNumber").asText()).matches("^SG-\\d{4}-\\d{4}$");
            Instant created = Instant.parse(p.path("createdAt").asText());
            if (previous != null) {
                assertThat(created).isBeforeOrEqualTo(previous);
            }
            previous = created;
        }
    }

    @Test
    void pickupsCanBeFilteredByStatus() throws Exception {
        doGet("/admin/pickups?status=BOOKED", adminToken())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].status", everyItem(is("BOOKED"))));
        doGet("/admin/pickups?status=PAID", adminToken())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].status", everyItem(is("PAID"))))
                .andExpect(jsonPath("$[*].finalPayoutInr", everyItem(notNullValue())));
    }

    @Test
    void unknownStatusFilterIs400() throws Exception {
        doGet("/admin/pickups?status=LOST", adminToken())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("'LOST'")));
    }

    @Test
    void agentsListShowsWorkload() throws Exception {
        JsonNode agents = json(doGet("/admin/agents", adminToken())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].role", everyItem(is("AGENT"))))
                .andExpect(jsonPath("$[*].activePickups", everyItem(notNullValue()))));

        assertThat(agents.size()).isGreaterThanOrEqualTo(3);
        JsonNode ravi = stream(agents).filter(a -> AGENT_PHONE.equals(a.path("phone").asText())).findFirst().orElseThrow();
        assertThat(ravi.path("fullName").asText()).isEqualTo("Ravi Kumar");
        assertThat(ravi.path("vehicle").asText()).isEqualTo("Tata Ace, UP16 CT 4471");
        assertThat(ravi.path("noidaSector").asText()).isEqualTo("Sector 62");
        long workloadBefore = ravi.path("activePickups").asLong();

        long orderId = createAssignedPickup().path("id").asLong();
        assertThat(activePickups(AGENT_PHONE)).isEqualTo(workloadBefore + 1);

        adminCancel(orderId);
        assertThat(activePickups(AGENT_PHONE)).isEqualTo(workloadBefore);
    }

    @Test
    void reassigningKeepsTheStatusAndMovesTheRoute() throws Exception {
        long orderId = createAssignedPickup().path("id").asLong();
        long sanjayId = agentId(OTHER_AGENT_PHONE);

        doPatch("/admin/pickups/" + orderId + "/assign/" + sanjayId, adminToken())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("AGENT_ASSIGNED"))
                .andExpect(jsonPath("$.assignedAgent.phone").value(OTHER_AGENT_PHONE));

        assertThat(findById(json(doGet("/agent/pickups/assigned", otherAgentToken())), orderId)).isNotNull();
        assertThat(findById(json(doGet("/agent/pickups/assigned", agentToken())), orderId)).isNull();
        adminCancel(orderId);
    }

    @Test
    void assigningToAnUnknownAgentIs404() throws Exception {
        long orderId = createPickup(customerToken()).path("id").asLong();
        long customerId = json(doGet("/auth/me", customerToken())).path("id").asLong();

        doPatch("/admin/pickups/" + orderId + "/assign/987654", adminToken())
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("That agent was not found."));
        doPatch("/admin/pickups/" + orderId + "/assign/" + customerId, adminToken())
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("That agent was not found."));
        adminCancel(orderId);
    }

    @Test
    void assigningAMissingPickupIs404() throws Exception {
        doPatch("/admin/pickups/987654321/assign/" + agentId(AGENT_PHONE), adminToken())
                .andExpect(status().isNotFound());
    }

    @Test
    void cancelledPickupCannotBeAssignedOrCancelledAgain() throws Exception {
        JsonNode order = createPickup(customerToken());
        long orderId = order.path("id").asLong();
        adminCancel(orderId);

        doPatch("/admin/pickups/" + orderId + "/assign/" + agentId(AGENT_PHONE), adminToken())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message")
                        .value("Pickup " + order.path("orderNumber").asText() + " is already closed."));
        doPatch("/admin/pickups/" + orderId + "/cancel", adminToken())
                .andExpect(status().isConflict());
    }

    // ------------------------------------------------------------------ inventory

    @Test
    void inventoryListsEveryCategoryInOrder() throws Exception {
        JsonNode rows = json(doGet("/admin/inventory", adminToken())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(12)))
                .andExpect(jsonPath("$[0].scrapCategory.name").value(COPPER))
                .andExpect(jsonPath("$[*].rawMixedWeightKg", everyItem(notNullValue())))
                .andExpect(jsonPath("$[*].segregatedWeightKg", everyItem(notNullValue())))
                .andExpect(jsonPath("$[*].baledReadyForMillWeightKg", everyItem(notNullValue())))
                .andExpect(jsonPath("$[*].minTruckDispatchThresholdKg", everyItem(notNullValue()))));

        List<Long> categoryIds = stream(rows).map(r -> r.path("scrapCategory").path("id").asLong()).toList();
        assertThat(categoryIds).isSorted().doesNotHaveDuplicates();
    }

    @Test
    void processingMovesStockThroughSegregateBaleAndDispatch() throws Exception {
        long hmsId = categoryId(HMS_IRON);
        JsonNode before = inventoryRow(hmsId);
        double raw = before.path("rawMixedWeightKg").asDouble();
        double segregated = before.path("segregatedWeightKg").asDouble();
        double baled = before.path("baledReadyForMillWeightKg").asDouble();

        JsonNode afterSegregate = json(doPost("/admin/inventory/process", adminToken(), process(hmsId, "SEGREGATE", 12.5))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scrapCategory.id").value(hmsId))
                .andExpect(jsonPath("$.lastUpdated").value(notNullValue())));
        assertThat(afterSegregate.path("rawMixedWeightKg").asDouble()).isCloseTo(raw - 12.5, within(KG_TOLERANCE));
        assertThat(afterSegregate.path("segregatedWeightKg").asDouble()).isCloseTo(segregated + 12.5, within(KG_TOLERANCE));
        assertThat(afterSegregate.path("baledReadyForMillWeightKg").asDouble()).isCloseTo(baled, within(KG_TOLERANCE));

        JsonNode afterBale = json(doPost("/admin/inventory/process", adminToken(), process(hmsId, "BALE", 12.5))
                .andExpect(status().isOk()));
        assertThat(afterBale.path("rawMixedWeightKg").asDouble()).isCloseTo(raw - 12.5, within(KG_TOLERANCE));
        assertThat(afterBale.path("segregatedWeightKg").asDouble()).isCloseTo(segregated, within(KG_TOLERANCE));
        assertThat(afterBale.path("baledReadyForMillWeightKg").asDouble()).isCloseTo(baled + 12.5, within(KG_TOLERANCE));

        JsonNode afterDispatch = json(doPost("/admin/inventory/process", adminToken(), process(hmsId, "DISPATCH", 12.5))
                .andExpect(status().isOk()));
        assertThat(afterDispatch.path("rawMixedWeightKg").asDouble()).isCloseTo(raw - 12.5, within(KG_TOLERANCE));
        assertThat(afterDispatch.path("segregatedWeightKg").asDouble()).isCloseTo(segregated, within(KG_TOLERANCE));
        assertThat(afterDispatch.path("baledReadyForMillWeightKg").asDouble()).isCloseTo(baled, within(KG_TOLERANCE));

        // The list endpoint agrees with the last response.
        assertThat(inventoryRow(hmsId).path("rawMixedWeightKg").asDouble()).isCloseTo(raw - 12.5, within(KG_TOLERANCE));
    }

    @Test
    void processingMoreThanIsOnTheYardIs422() throws Exception {
        long hmsId = categoryId(HMS_IRON);
        JsonNode before = inventoryRow(hmsId);

        doPost("/admin/inventory/process", adminToken(),
                process(hmsId, "SEGREGATE", before.path("rawMixedWeightKg").asDouble() + 1000))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message", startsWith("Only ")))
                .andExpect(jsonPath("$.message", containsString("kg of raw " + HMS_IRON + " is on the yard.")));
        doPost("/admin/inventory/process", adminToken(),
                process(hmsId, "BALE", before.path("segregatedWeightKg").asDouble() + 1000))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message", containsString("kg of sorted " + HMS_IRON + " is ready to bale.")));
        doPost("/admin/inventory/process", adminToken(),
                process(hmsId, "DISPATCH", before.path("baledReadyForMillWeightKg").asDouble() + 1000))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message", containsString("kg of " + HMS_IRON + " is baled.")));

        // Nothing moved.
        JsonNode after = inventoryRow(hmsId);
        assertThat(after.path("rawMixedWeightKg").asDouble())
                .isCloseTo(before.path("rawMixedWeightKg").asDouble(), within(KG_TOLERANCE));
        assertThat(after.path("segregatedWeightKg").asDouble())
                .isCloseTo(before.path("segregatedWeightKg").asDouble(), within(KG_TOLERANCE));
        assertThat(after.path("baledReadyForMillWeightKg").asDouble())
                .isCloseTo(before.path("baledReadyForMillWeightKg").asDouble(), within(KG_TOLERANCE));
    }

    @Test
    void invalidStageIs400() throws Exception {
        doPostRaw("/admin/inventory/process", adminToken(),
                "{\"categoryId\":" + categoryId(HMS_IRON) + ",\"stage\":\"MELT\",\"weightKg\":5}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message")
                        .value("Invalid value 'MELT' for stage. Allowed: SEGREGATE, BALE, DISPATCH"));
    }

    @Test
    void nonPositiveProcessingWeightIs400() throws Exception {
        doPost("/admin/inventory/process", adminToken(), process(categoryId(HMS_IRON), "SEGREGATE", 0))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.weightKg").value("Enter a weight greater than 0 kg."));
    }

    @Test
    void processingAnUnknownCategoryIs404() throws Exception {
        doPost("/admin/inventory/process", adminToken(), process(987654, "SEGREGATE", 5))
                .andExpect(status().isNotFound());
    }

    // ------------------------------------------------------------------ dashboard

    @Test
    void dashboardMetricsShape() throws Exception {
        JsonNode metrics = json(doGet("/admin/dashboard/metrics", adminToken())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.date").value(notNullValue()))
                .andExpect(jsonPath("$.todayProcurementCostInr").isNumber())
                .andExpect(jsonPath("$.projectedMillResaleInr").isNumber())
                .andExpect(jsonPath("$.netProfitMarginInr").isNumber())
                .andExpect(jsonPath("$.marginPercent").isNumber())
                .andExpect(jsonPath("$.todayCollectedKg").isNumber())
                .andExpect(jsonPath("$.todayCompletedPickups").isNumber())
                .andExpect(jsonPath("$.pendingPickups").isNumber())
                .andExpect(jsonPath("$.unassignedPickups").isNumber())
                .andExpect(jsonPath("$.truckAlerts").isArray()));

        BigDecimal procurement = money(metrics.path("todayProcurementCostInr"));
        BigDecimal resale = money(metrics.path("projectedMillResaleInr"));
        assertThat(money(metrics.path("netProfitMarginInr"))).isEqualByComparingTo(resale.subtract(procurement));
        assertThat(metrics.path("unassignedPickups").asLong())
                .isLessThanOrEqualTo(metrics.path("pendingPickups").asLong());
        assertThat(Instant.parse(metrics.path("date").asText())).isNotNull();
    }

    @Test
    void truckAlertsAreNearlyFullBaysSortedByReadiness() throws Exception {
        JsonNode alerts = json(doGet("/admin/dashboard/metrics", adminToken()).andExpect(status().isOk()))
                .path("truckAlerts");

        assertThat(alerts.size()).as("seed has bays at or above 75%").isGreaterThan(0);
        int previous = Integer.MAX_VALUE;
        for (JsonNode alert : alerts) {
            int readiness = alert.path("readinessPercent").asInt();
            double baledKg = alert.path("baledKg").asDouble();
            double thresholdKg = alert.path("thresholdKg").asDouble();

            assertThat(alert.path("categoryId").asLong()).isPositive();
            assertThat(alert.path("categoryName").asText()).isNotBlank();
            assertThat(readiness).as("readinessPercent sorted desc").isLessThanOrEqualTo(previous);
            assertThat(readiness).isGreaterThanOrEqualTo(75);
            assertThat(thresholdKg).isPositive();
            assertThat(readiness).isEqualTo((int) Math.round(baledKg / thresholdKg * 100));
            assertThat(alert.path("ready").asBoolean()).isEqualTo(baledKg >= thresholdKg);
            previous = readiness;
        }
    }

    @Test
    void dashboardCountsTodaysPaidPickupAndNewBookings() throws Exception {
        JsonNode before = metrics();

        JsonNode booked = createPickup(customerToken());
        JsonNode afterBooking = metrics();
        assertThat(afterBooking.path("pendingPickups").asLong()).isEqualTo(before.path("pendingPickups").asLong() + 1);
        assertThat(afterBooking.path("unassignedPickups").asLong())
                .isEqualTo(before.path("unassignedPickups").asLong() + 1);

        JsonNode hms = category(HMS_IRON);
        JsonNode paid = json(doPost("/agent/pickups/" + booked.path("id").asLong() + "/complete-weighing",
                adminToken(), weighing(List.of(line(hms.path("id").asLong(), 40.0)), "CASH", null))
                .andExpect(status().isOk()));
        BigDecimal payout = money(paid.path("finalPayoutInr"));
        BigDecimal millValue = money(hms.path("millSellingRateInr")).multiply(new BigDecimal("40"));

        JsonNode after = metrics();
        assertThat(after.path("todayCompletedPickups").asLong())
                .isEqualTo(before.path("todayCompletedPickups").asLong() + 1);
        assertThat(after.path("todayCollectedKg").asDouble())
                .isCloseTo(before.path("todayCollectedKg").asDouble() + 40.0, within(0.01));
        assertThat(money(after.path("todayProcurementCostInr")))
                .isEqualByComparingTo(money(before.path("todayProcurementCostInr")).add(payout));
        assertThat(money(after.path("projectedMillResaleInr")))
                .isEqualByComparingTo(money(before.path("projectedMillResaleInr")).add(millValue));
        assertThat(after.path("pendingPickups").asLong()).isEqualTo(before.path("pendingPickups").asLong());
        assertThat(after.path("unassignedPickups").asLong()).isEqualTo(before.path("unassignedPickups").asLong());
    }

    // ------------------------------------------------------------------ helpers

    private JsonNode metrics() throws Exception {
        return json(doGet("/admin/dashboard/metrics", adminToken()).andExpect(status().isOk()));
    }

    private long activePickups(String agentPhone) throws Exception {
        JsonNode agents = json(doGet("/admin/agents", adminToken()).andExpect(status().isOk()));
        return stream(agents)
                .filter(a -> agentPhone.equals(a.path("phone").asText()))
                .findFirst()
                .orElseThrow()
                .path("activePickups").asLong();
    }

    private void restore(JsonNode original) throws Exception {
        doPut("/admin/rates/" + original.path("id").asLong(), adminToken(), rateUpdate(
                original.path("buyingRateInr").asText(),
                original.path("millSellingRateInr").asText(),
                original.path("isActive").asBoolean(true)))
                .andExpect(status().isOk());
    }

    private static Map<String, Object> rateUpdate(String buying, String mill, Boolean active) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("buyingRateInr", new BigDecimal(buying));
        body.put("millSellingRateInr", new BigDecimal(mill));
        if (active != null) {
            body.put("isActive", active);
        }
        return body;
    }

    private static Map<String, Object> process(long categoryId, String stage, double weightKg) {
        return Map.of("categoryId", categoryId, "stage", stage, "weightKg", weightKg);
    }
}
