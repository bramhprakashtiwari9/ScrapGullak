package com.scrapgullak.repository;

import com.scrapgullak.domain.entity.YardInventory;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface YardInventoryRepository extends JpaRepository<YardInventory, Long> {

    Optional<YardInventory> findByScrapCategoryId(Long categoryId);

    /** Row-locks a category's stock while it is credited (weighing) or moved between stages. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select y from YardInventory y where y.scrapCategory.id = :categoryId")
    Optional<YardInventory> findByScrapCategoryIdForUpdate(@Param("categoryId") Long categoryId);

    @EntityGraph(attributePaths = "scrapCategory")
    List<YardInventory> findAllByOrderByScrapCategoryIdAsc();
}
