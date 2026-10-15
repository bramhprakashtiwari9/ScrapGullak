package com.scrapgullak.support;

import com.scrapgullak.domain.entity.OrderSequence;
import com.scrapgullak.repository.OrderSequenceRepository;
import jakarta.persistence.EntityManager;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.CannotCreateTransactionException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * The on-demand creation of a year's counter row is only a fallback: it must insert (never merge) and must
 * never fail the booking that triggered it.
 */
class OrderNumberGeneratorTest {

    private static final int YEAR = 2041;

    /** 00:00:30 IST on 1 Jan 2041: the first moments of a year whose counter row does not exist yet. */
    private final Clock clock = Clock.fixed(Instant.parse("2040-12-31T18:30:30Z"), ZoneId.of("Asia/Kolkata"));

    private OrderSequenceRepository repository;
    private EntityManager entityManager;
    private PlatformTransactionManager transactionManager;
    private OrderNumberGenerator generator;

    @BeforeEach
    void setUp() {
        repository = mock(OrderSequenceRepository.class);
        entityManager = mock(EntityManager.class);
        transactionManager = mock(PlatformTransactionManager.class);
        generator = new OrderNumberGenerator(repository, entityManager, clock, transactionManager);
        when(repository.existsById(YEAR)).thenReturn(false);
    }

    @Test
    void missingRowIsCreatedWithPersistNotMerge() {
        when(transactionManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        when(repository.findForUpdate(YEAR)).thenReturn(Optional.of(new OrderSequence(YEAR, 0L)));

        assertThat(generator.next()).isEqualTo("SG-2041-0001");

        verify(entityManager).persist(argThat((OrderSequence s) -> s.getYear() == YEAR && s.getLastValue() == 0L));
        verify(entityManager).flush();
        verify(entityManager, never()).merge(any());
        verify(repository, never()).saveAndFlush(any());
        verify(repository, never()).save(any());
    }

    @Test
    void losingTheCreationRaceIsIgnored() {
        when(transactionManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        doThrow(new ConstraintViolationException("duplicate key", new SQLException("dup", "23505"), "PRIMARY"))
                .when(entityManager).flush();
        when(repository.findForUpdate(YEAR)).thenReturn(Optional.of(new OrderSequence(YEAR, 3L)));

        assertThat(generator.next()).isEqualTo("SG-2041-0004");
    }

    @Test
    void noConnectionForTheExtraTransactionDoesNotFailTheBookingWhenTheRowExistsMeanwhile() {
        when(transactionManager.getTransaction(any()))
                .thenThrow(new CannotCreateTransactionException("Could not open JPA EntityManager for transaction"));
        when(repository.findForUpdate(YEAR)).thenReturn(Optional.of(new OrderSequence(YEAR, 0L)));

        assertThat(generator.next()).isEqualTo("SG-2041-0001");
        verify(entityManager, never()).persist(any());
    }

    @Test
    void ensureYearNeverThrows() {
        when(transactionManager.getTransaction(any()))
                .thenThrow(new CannotCreateTransactionException("Could not open JPA EntityManager for transaction"));

        assertThatCode(() -> generator.ensureYear(YEAR)).doesNotThrowAnyException();
    }

    @Test
    void existingRowNeedsNoExtraTransaction() {
        when(repository.existsById(YEAR)).thenReturn(true);
        when(repository.findForUpdate(YEAR)).thenReturn(Optional.of(new OrderSequence(YEAR, 41L)));

        assertThat(generator.next()).isEqualTo("SG-2041-0042");
        verify(transactionManager, never()).getTransaction(any());
    }
}
