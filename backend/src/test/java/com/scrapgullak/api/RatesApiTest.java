package com.scrapgullak.api;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Public rate card and payout estimate. */
class RatesApiTest extends ApiTestSupport {

    @Test
    void liveRatesArePublicAndHideMillRates() throws Exception {
        JsonNode rates = json(doGet("/rates/live", null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(12)))
                .andExpect(jsonPath("$[*].isActive", everyItem(is(true))))
                .andExpect(jsonPath("$[*].name", everyItem(notNullValue())))
                .andExpect(jsonPath("$[*].buyingRateInr", everyItem(notNullValue())))
                .andExpect(jsonPath("$[*].millSellingRateInr").doesNotExist())
                .andExpect(jsonPath("$[*].active").doesNotExist())
                .andExpect(jsonPath("$[0].name").value(COPPER))
                .andExpect(jsonPath("$[0].categoryGroup").value("NON_FERROUS"))
                .andExpect(jsonPath("$[0].unit").value("KG"))
                .andExpect(jsonPath("$[0].iconName").value("zap")));

        List<Long> ids = stream(rates).map(r -> r.path("id").asLong()).toList();
        assertThat(ids).isSorted();
    }

    @Test
    void liveRatesHideMillRatesFromCustomersAndAgents() throws Exception {
        doGet("/rates/live", customerToken())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].millSellingRateInr").doesNotExist());
        doGet("/rates/live", agentToken())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].millSellingRateInr").doesNotExist());
    }

    @Test
    void liveRatesIncludeMillRatesForAdmin() throws Exception {
        doGet("/rates/live", adminToken())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(12)))
                .andExpect(jsonPath("$[*].millSellingRateInr", hasSize(12)))
                .andExpect(jsonPath("$[0].millSellingRateInr").value(735.0));
    }

    @Test
    void liveRatesIgnoreAnInvalidToken() throws Exception {
        doGet("/rates/live", "not-a-real-jwt")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(12)))
                .andExpect(jsonPath("$[*].millSellingRateInr").doesNotExist());
    }

    @Test
    void estimateMultipliesWeightByBuyingRate() throws Exception {
        long copper = categoryId(COPPER);

        JsonNode estimate = json(doPost("/rates/estimate", null,
                Map.of("items", List.of(Map.of("categoryId", copper, "weightKg", 2.5))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].categoryId").value(copper))
                .andExpect(jsonPath("$.items[0].categoryName").value(COPPER))
                .andExpect(jsonPath("$.items[0].weightKg").value(2.5))
                .andExpect(jsonPath("$.items[0].buyingRateInr").value(680.0))
                .andExpect(jsonPath("$.items[0].subTotalInr").value(1700.0))
                .andExpect(jsonPath("$.totalWeightKg").value(2.5))
                .andExpect(jsonPath("$.totalEstimatedPayoutInr").value(1700.0)));

        assertThat(money(estimate.path("totalEstimatedPayoutInr"))).isEqualByComparingTo("1700.00");
    }

    @Test
    void estimateSumsLinesAndSkipsZeroWeights() throws Exception {
        JsonNode copper = category(COPPER);
        JsonNode newspaper = category(NEWSPAPER);
        JsonNode pet = category(PET);

        JsonNode estimate = json(doPost("/rates/estimate", null, Map.of("items", List.of(
                Map.of("categoryId", copper.path("id").asLong(), "weightKg", 1.2),
                Map.of("categoryId", newspaper.path("id").asLong(), "weightKg", 14.0),
                Map.of("categoryId", pet.path("id").asLong(), "weightKg", 0.0))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(2))));

        BigDecimal expected = money(copper.path("buyingRateInr")).multiply(new BigDecimal("1.2"))
                .add(money(newspaper.path("buyingRateInr")).multiply(new BigDecimal("14")));
        assertThat(money(estimate.path("totalEstimatedPayoutInr"))).isEqualByComparingTo(expected);
        assertThat(estimate.path("totalWeightKg").asDouble()).isCloseTo(15.2, within(KG_TOLERANCE));
    }

    @Test
    void estimateOfNothingIsZero() throws Exception {
        doPost("/rates/estimate", null, Map.of("items", List.of()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(0)))
                .andExpect(jsonPath("$.totalWeightKg").value(0.0))
                .andExpect(jsonPath("$.totalEstimatedPayoutInr").value(0.0));
    }

    @Test
    void estimateWithUnknownCategoryIs404() throws Exception {
        doPost("/rates/estimate", null, Map.of("items", List.of(Map.of("categoryId", 987654, "weightKg", 3.0))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Scrap category 987654 was not found."));
    }

    @Test
    void estimateValidation() throws Exception {
        doPost("/rates/estimate", null, Map.of())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.items").value("Add at least one scrap grade to estimate."));

        doPost("/rates/estimate", null, Map.of("items", List.of(Map.of("categoryId", 1, "weightKg", -1.0))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Weight cannot be negative."));
    }
}
