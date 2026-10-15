package com.scrapgullak.repository;

import com.scrapgullak.domain.entity.User;
import com.scrapgullak.domain.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByPhone(String phone);

    boolean existsByPhone(String phone);

    List<User> findByRoleOrderByFullNameAsc(Role role);

    Optional<User> findByIdAndRole(Long id, Role role);

    /**
     * Atomically credits a paid pickup to the customer's Gullak in SQL, so concurrent weighings never lose
     * an update. The persistence context is not cleared: reload the user if the new totals are needed.
     */
    @Modifying(clearAutomatically = false, flushAutomatically = true)
    @Query("update User u set u.gullakTotalEarnings = u.gullakTotalEarnings + :amount, "
            + "u.totalRecycledKg = u.totalRecycledKg + :kg where u.id = :id")
    int addToGullak(@Param("id") Long id, @Param("amount") BigDecimal amount, @Param("kg") double kg);
}
