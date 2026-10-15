package com.scrapgullak.support;

import com.fasterxml.jackson.databind.JsonNode;
import com.scrapgullak.api.ApiTestSupport;
import com.scrapgullak.domain.entity.OrderSequence;
import com.scrapgullak.repository.OrderSequenceRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Counter rows are provisioned ahead of time (so bookings never need a second connection) and creating a row
 * that already exists never touches its counter. Runs in the shared H2 API-test context.
 */
class OrderSequenceProvisioningTest extends ApiTestSupport {

    private static final int FAR_YEAR = 2040;

    @Autowired
    private OrderSequenceRepository sequenceRepository;

    @Autowired
    private OrderNumberGenerator orderNumberGenerator;

    @Autowired
    private OrderSequenceProvisioner provisioner;

    @Test
    void startupProvisionsTheCurrentAndTheNextYear() {
        int year = today().getYear();

        assertThat(sequenceRepository.existsById(year)).isTrue();
        assertThat(sequenceRepository.existsById(year + 1)).isTrue();
    }

    @Test
    void creatingAnExistingCounterRowNeverResetsIt() {
        sequenceRepository.saveAndFlush(new OrderSequence(FAR_YEAR, 5L));
        try {
            // What a creator that lost the race does after its existence check said "missing".
            orderNumberGenerator.insertInNewTransaction(FAR_YEAR);
            orderNumberGenerator.ensureYear(FAR_YEAR);

            assertThat(sequenceRepository.findById(FAR_YEAR))
                    .get().extracting(OrderSequence::getLastValue).isEqualTo(5L);
        } finally {
            sequenceRepository.deleteById(FAR_YEAR);
        }
    }

    @Test
    void reprovisioningKeepsTheCounterAndBookingsContinueIt() throws Exception {
        int year = today().getYear();
        long before = sequenceRepository.findById(year).orElseThrow().getLastValue();

        provisioner.provision();
        assertThat(sequenceRepository.findById(year).orElseThrow().getLastValue()).isEqualTo(before);

        JsonNode order = createPickup(customerToken());
        try {
            assertThat(order.path("orderNumber").asText()).isEqualTo(OrderNumberGenerator.format(year, before + 1));
        } finally {
            adminCancel(order.path("id").asLong());
        }
    }
}
