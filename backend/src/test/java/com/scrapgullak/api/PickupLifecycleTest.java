package com.scrapgullak.api;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.matchesPattern;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end pickup flow: customer books, admin assigns, agent starts and weighs, and the payout lands in the
 * customer's Gullak passbook and the yard's raw inventory.
 */
class PickupLifecycleTest extends ApiTestSupport {

    @Test
    void bookAssignWeighPayAndUpdateGullakAndYard() throws Exception {
        String customer = customerToken();
        String admin = adminToken();
        String agent = agentToken();

        JsonNode copper = category(COPPER);
        JsonNode newspaper = category(NEWSPAPER);
        long copperId = copper.path("id").asLong();
        long newspaperId = newspaper.path("id").asLong();
        long petId = categoryId(PET);

        JsonNode passbookBefore = passbook(customer);
        double copperRawBefore = inventoryRow(copperId).path("rawMixedWeightKg").asDouble();
        double newspaperRawBefore = inventoryRow(newspaperId).path("rawMixedWeightKg").asDouble();

        // 1. Customer books a pickup for today.
        JsonNode booked = json(doPost("/customer/pickups", customer, pickupRequest(today()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.orderNumber", matchesPattern("^SG-\\d{4}-\\d{4}$")))
                .andExpect(jsonPath("$.orderNumber", startsWith("SG-" + today().getYear() + "-")))
                .andExpect(jsonPath("$.status").value("BOOKED"))
                .andExpect(jsonPath("$.orderType").value("DOORSTEP_B2C"))
                .andExpect(jsonPath("$.customer.phone").value(CUSTOMER_PHONE))
                .andExpect(jsonPath("$.customer.fullName").value("Priya Sharma"))
                .andExpect(jsonPath("$.assignedAgent").value(nullValue()))
                .andExpect(jsonPath("$.noidaSector").value("Sector 74"))
                .andExpect(jsonPath("$.scheduledDate").value(today().toString()))
                .andExpect(jsonPath("$.timeSlot").value("11 AM – 2 PM"))
                .andExpect(jsonPath("$.scrapGroups", hasSize(2)))
                .andExpect(jsonPath("$.items", hasSize(0)))
                .andExpect(jsonPath("$.finalPayoutInr").value(nullValue()))
                .andExpect(jsonPath("$.paidAt").value(nullValue()))
                .andExpect(jsonPath("$.createdAt").value(notNullValue())));
        long orderId = booked.path("id").asLong();
        String orderNumber = booked.path("orderNumber").asText();

        JsonNode mine = json(doGet("/customer/pickups", customer).andExpect(status().isOk()));
        assertThat(findById(mine, orderId)).as("new pickup in customer's list").isNotNull();
        assertThat(mine.get(0).path("id").asLong()).as("newest first").isEqualTo(orderId);

        // 2. Admin assigns the demo agent.
        long raviId = agentId(AGENT_PHONE);
        doPatch("/admin/pickups/" + orderId + "/assign/" + raviId, admin)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("AGENT_ASSIGNED"))
                .andExpect(jsonPath("$.assignedAgent.id").value(raviId))
                .andExpect(jsonPath("$.assignedAgent.phone").value(AGENT_PHONE))
                .andExpect(jsonPath("$.assignedAgent.fullName").value("Ravi Kumar"));

        // 3. The agent sees it on today's route and starts it.
        JsonNode route = json(doGet("/agent/pickups/assigned", agent).andExpect(status().isOk()));
        JsonNode onRoute = findById(route, orderId);
        assertThat(onRoute).as("pickup on agent route").isNotNull();
        assertThat(onRoute.path("status").asText()).isEqualTo("AGENT_ASSIGNED");
        assertThat(onRoute.path("customer").path("phone").asText()).isEqualTo(CUSTOMER_PHONE);

        doPost("/agent/pickups/" + orderId + "/start", agent, null).andExpect(status().isOk());
        JsonNode started = findById(json(doGet("/agent/pickups/assigned", agent)), orderId);
        assertThat(started).isNotNull();
        assertThat(started.path("status").asText()).isEqualTo("OUT_FOR_PICKUP");

        // Starting again is idempotent.
        doPost("/agent/pickups/" + orderId + "/start", agent, null).andExpect(status().isOk());

        // 4. Weighing with duplicate copper lines (merged) and a zero line (dropped).
        JsonNode paid = json(doPost("/agent/pickups/" + orderId + "/complete-weighing", agent, weighing(List.of(
                        line(copperId, 1.5),
                        line(newspaperId, 10.0),
                        line(copperId, 1.0),
                        line(petId, 0.0)), "UPI", "  417000123456  "))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(orderId))
                .andExpect(jsonPath("$.status").value("PAID"))
                .andExpect(jsonPath("$.items", hasSize(2)))
                .andExpect(jsonPath("$.paymentMode").value("UPI"))
                .andExpect(jsonPath("$.upiTransactionRef").value("417000123456"))
                .andExpect(jsonPath("$.paidAt").value(notNullValue())));

        BigDecimal copperSubtotal = money(copper.path("buyingRateInr")).multiply(new BigDecimal("2.5"))
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal newspaperSubtotal = money(newspaper.path("buyingRateInr")).multiply(BigDecimal.TEN)
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal expectedPayout = copperSubtotal.add(newspaperSubtotal);

        assertThat(paid.path("finalTotalWeightKg").asDouble()).isCloseTo(12.5, within(KG_TOLERANCE));
        assertThat(money(paid.path("finalPayoutInr"))).isEqualByComparingTo(expectedPayout);

        JsonNode copperLine = itemFor(paid, copperId);
        assertThat(copperLine.path("netWeightKg").asDouble()).isCloseTo(2.5, within(KG_TOLERANCE));
        assertThat(money(copperLine.path("appliedBuyingRateInr"))).isEqualByComparingTo(money(copper.path("buyingRateInr")));
        assertThat(money(copperLine.path("subTotalInr"))).isEqualByComparingTo(copperSubtotal);
        assertThat(copperLine.path("scrapCategory").path("name").asText()).isEqualTo(COPPER);
        JsonNode newspaperLine = itemFor(paid, newspaperId);
        assertThat(newspaperLine.path("netWeightKg").asDouble()).isCloseTo(10.0, within(KG_TOLERANCE));
        assertThat(money(newspaperLine.path("subTotalInr"))).isEqualByComparingTo(newspaperSubtotal);

        // The paid order leaves the agent's route.
        assertThat(findById(json(doGet("/agent/pickups/assigned", agent)), orderId)).isNull();

        // 5. The customer's passbook reflects the payout.
        JsonNode passbookAfter = passbook(customer);
        assertThat(money(passbookAfter.path("gullakTotalEarnings")))
                .isEqualByComparingTo(money(passbookBefore.path("gullakTotalEarnings")).add(expectedPayout));
        assertThat(passbookAfter.path("totalRecycledKg").asDouble())
                .isCloseTo(passbookBefore.path("totalRecycledKg").asDouble() + 12.5, within(0.01));
        assertThat(passbookAfter.path("totalPickups").asInt())
                .isEqualTo(passbookBefore.path("totalPickups").asInt() + 1);
        assertThat(passbookAfter.path("co2SavedKg").asLong())
                .isGreaterThan(passbookBefore.path("co2SavedKg").asLong());

        JsonNode transaction = stream(passbookAfter.path("transactions"))
                .filter(t -> orderNumber.equals(t.path("orderNumber").asText()))
                .findFirst()
                .orElse(null);
        assertThat(transaction).as("passbook transaction for %s", orderNumber).isNotNull();
        assertThat(transaction.path("orderId").asLong()).isEqualTo(orderId);
        assertThat(money(transaction.path("amountInr"))).isEqualByComparingTo(expectedPayout);
        assertThat(transaction.path("weightKg").asDouble()).isCloseTo(12.5, within(KG_TOLERANCE));
        assertThat(transaction.path("paymentMode").asText()).isEqualTo("UPI");
        assertThat(transaction.path("date").asText()).isNotBlank();
        assertThat(passbookAfter.path("transactions").get(0).path("orderNumber").asText())
                .as("most recent payment first").isEqualTo(orderNumber);
        assertPaidAtDescending(passbookAfter.path("transactions"));

        // The digital weight receipt is visible in the customer's pickup list.
        JsonNode receipt = findById(json(doGet("/customer/pickups", customer)), orderId);
        assertThat(receipt.path("status").asText()).isEqualTo("PAID");
        assertThat(receipt.path("items")).hasSize(2);

        // 6. The yard's raw stock grew by the weighed kg.
        assertThat(inventoryRow(copperId).path("rawMixedWeightKg").asDouble())
                .isCloseTo(copperRawBefore + 2.5, within(0.01));
        assertThat(inventoryRow(newspaperId).path("rawMixedWeightKg").asDouble())
                .isCloseTo(newspaperRawBefore + 10.0, within(0.01));

        // 7. A paid pickup cannot be weighed again, and the passbook does not change.
        doPost("/agent/pickups/" + orderId + "/complete-weighing", agent,
                weighing(List.of(line(copperId, 1.0)), "UPI", null))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Pickup " + orderNumber + " is already paid."));
        assertThat(money(passbook(customer).path("gullakTotalEarnings")))
                .isEqualByComparingTo(money(passbookAfter.path("gullakTotalEarnings")));

        // ... nor reassigned or cancelled.
        doPatch("/admin/pickups/" + orderId + "/assign/" + raviId, admin)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Pickup " + orderNumber + " is already closed."));
        doPost("/customer/pickups/" + orderId + "/cancel", customer, null)
                .andExpect(status().isConflict());
    }

    @Test
    void anotherAgentCannotWeighSomeoneElsesPickup() throws Exception {
        JsonNode assigned = createAssignedPickup();
        long orderId = assigned.path("id").asLong();

        doPost("/agent/pickups/" + orderId + "/complete-weighing", otherAgentToken(),
                weighing(List.of(line(categoryId(COPPER), 1.0)), "CASH", null))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("This pickup is not assigned to you."));

        // The other agent cannot start it either, and it never shows on their route.
        doPost("/agent/pickups/" + orderId + "/start", otherAgentToken(), null)
                .andExpect(status().isForbidden());
        assertThat(findById(json(doGet("/agent/pickups/assigned", otherAgentToken())), orderId)).isNull();

        // Still open for the assigned agent.
        assertThat(findById(json(doGet("/agent/pickups/assigned", agentToken())), orderId)).isNotNull();
        adminCancel(orderId);
    }

    @Test
    void weighingWithOnlyZeroLinesIs422() throws Exception {
        long orderId = createAssignedPickup().path("id").asLong();

        doPost("/agent/pickups/" + orderId + "/complete-weighing", agentToken(),
                weighing(List.of(line(categoryId(COPPER), 0.0)), "UPI", null))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value("Add at least one weighed scrap grade."));

        doPost("/agent/pickups/" + orderId + "/complete-weighing", agentToken(),
                weighing(List.of(), "UPI", null))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value("Add at least one weighed scrap grade."));

        adminCancel(orderId);
    }

    @Test
    void weighingUnknownCategoryIs404AndChangesNothing() throws Exception {
        long orderId = createAssignedPickup().path("id").asLong();
        BigDecimal earningsBefore = money(passbook(customerToken()).path("gullakTotalEarnings"));

        doPost("/agent/pickups/" + orderId + "/complete-weighing", agentToken(),
                weighing(List.of(line(categoryId(COPPER), 1.0), line(987654, 2.0)), "UPI", null))
                .andExpect(status().isNotFound());

        assertThat(money(passbook(customerToken()).path("gullakTotalEarnings"))).isEqualByComparingTo(earningsBefore);
        JsonNode stillOpen = findById(json(doGet("/agent/pickups/assigned", agentToken())), orderId);
        assertThat(stillOpen).isNotNull();
        assertThat(stillOpen.path("items")).isEmpty();
        adminCancel(orderId);
    }

    @Test
    void weighingMissingOrderIs404() throws Exception {
        doPost("/agent/pickups/987654321/complete-weighing", agentToken(),
                weighing(List.of(line(categoryId(COPPER), 1.0)), "UPI", null))
                .andExpect(status().isNotFound());
    }

    @Test
    void invalidPaymentModeIs400() throws Exception {
        doPostRaw("/agent/pickups/1/complete-weighing", agentToken(),
                "{\"items\":[{\"categoryId\":1,\"netWeightKg\":1}],\"paymentMode\":\"CHEQUE\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", startsWith("Invalid value 'CHEQUE' for paymentMode")));
    }

    @Test
    void adminCanWeighABookedPickupDirectly() throws Exception {
        String customer = customerToken();
        long orderId = createPickup(customer).path("id").asLong();
        JsonNode hms = category(HMS_IRON);
        BigDecimal earningsBefore = money(passbook(customer).path("gullakTotalEarnings"));

        JsonNode paid = json(doPost("/agent/pickups/" + orderId + "/complete-weighing", adminToken(),
                weighing(List.of(line(hms.path("id").asLong(), 20.0)), "BANK_TRANSFER", null))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAID"))
                .andExpect(jsonPath("$.paymentMode").value("BANK_TRANSFER"))
                .andExpect(jsonPath("$.upiTransactionRef").value(nullValue())));

        BigDecimal expected = money(hms.path("buyingRateInr")).multiply(new BigDecimal("20"));
        assertThat(money(paid.path("finalPayoutInr"))).isEqualByComparingTo(expected);
        assertThat(money(passbook(customer).path("gullakTotalEarnings")))
                .isEqualByComparingTo(earningsBefore.add(expected));
    }

    @Test
    void cancelledPickupCannotBeWeighed() throws Exception {
        JsonNode order = createPickup(customerToken());
        long orderId = order.path("id").asLong();
        doPost("/customer/pickups/" + orderId + "/cancel", customerToken(), null).andExpect(status().isOk());

        doPost("/agent/pickups/" + orderId + "/complete-weighing", adminToken(),
                weighing(List.of(line(categoryId(COPPER), 1.0)), "UPI", null))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message")
                        .value("Pickup " + order.path("orderNumber").asText() + " is already cancelled."));
    }

    // ------------------------------------------------------------------ helpers

    private static JsonNode itemFor(JsonNode order, long categoryId) {
        return stream(order.path("items"))
                .filter(i -> i.path("scrapCategory").path("id").asLong() == categoryId)
                .findFirst()
                .orElseThrow(() -> new AssertionError("No line for category " + categoryId + " in " + order));
    }

    private static void assertPaidAtDescending(JsonNode transactions) {
        Instant previous = null;
        for (JsonNode t : transactions) {
            Instant date = Instant.parse(t.path("date").asText());
            if (previous != null) {
                assertThat(date).as("transactions sorted by paidAt desc").isBeforeOrEqualTo(previous);
            }
            previous = date;
        }
    }
}
