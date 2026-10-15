package com.scrapgullak.support;

import com.scrapgullak.domain.entity.OrderSequence;
import com.scrapgullak.repository.OrderSequenceRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.LocalDate;

/**
 * Issues human-friendly order numbers {@code SG-<year>-<0001>} from a per-year counter row that is locked
 * {@code PESSIMISTIC_WRITE}, so numbers are unique and gap-free per committed booking. Must run inside the
 * caller's transaction: the lock is held until the order itself commits.
 * <p>
 * Counter rows are normally created ahead of time by {@link OrderSequenceProvisioner}, so a booking never needs
 * a second database connection. Creating the row on demand is only a fallback.
 */
@Slf4j
@Component
public class OrderNumberGenerator {

    private final OrderSequenceRepository sequenceRepository;
    private final EntityManager entityManager;
    private final Clock clock;
    private final TransactionTemplate newTransaction;

    public OrderNumberGenerator(OrderSequenceRepository sequenceRepository, EntityManager entityManager,
                                Clock clock, PlatformTransactionManager transactionManager) {
        this.sequenceRepository = sequenceRepository;
        this.entityManager = entityManager;
        this.clock = clock;
        this.newTransaction = new TransactionTemplate(transactionManager);
        this.newTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public String next() {
        int year = LocalDate.now(clock).getYear();
        // ensureYear uses a plain (non-locking) existence check: a locking read of a missing row would take a
        // gap lock on MySQL and deadlock with the separate-transaction insert.
        ensureYear(year);
        OrderSequence sequence = sequenceRepository.findForUpdate(year)
                .orElseThrow(() -> new IllegalStateException("Order sequence row for " + year + " is missing"));
        long value = sequence.getLastValue() + 1;
        sequence.setLastValue(value);
        return format(year, value);
    }

    public static String format(int year, long value) {
        return String.format("SG-%d-%04d", year, value);
    }

    /**
     * Makes sure the counter row for {@code year} exists. Never throws: if the row cannot be created here, the
     * caller's {@code findForUpdate} decides whether that matters.
     */
    public void ensureYear(int year) {
        if (!sequenceRepository.existsById(year)) {
            insertInNewTransaction(year);
        }
    }

    /**
     * Commits a fresh counter row in its own short transaction, so a failed insert never marks the caller's
     * transaction rollback-only. Uses a real {@code persist} (an INSERT), never {@code merge}: with an assigned
     * id, merge would overwrite a row a concurrent creator has already committed and reset its counter to 0.
     */
    void insertInNewTransaction(int year) {
        try {
            newTransaction.executeWithoutResult(status -> {
                entityManager.persist(new OrderSequence(year, 0L));
                entityManager.flush();
            });
        } catch (DataIntegrityViolationException | PersistenceException e) {
            log.debug("Order sequence for {} was created concurrently", year);
        } catch (RuntimeException e) {
            // E.g. no free pooled connection for the extra transaction. The row may still appear meanwhile.
            log.warn("Could not create the order sequence for {}: {}", year, e.toString());
        }
    }
}
