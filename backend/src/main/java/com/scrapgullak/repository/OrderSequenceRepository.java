package com.scrapgullak.repository;

import com.scrapgullak.domain.entity.OrderSequence;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface OrderSequenceRepository extends JpaRepository<OrderSequence, Integer> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from OrderSequence s where s.year = :year")
    Optional<OrderSequence> findForUpdate(@Param("year") int year);
}
