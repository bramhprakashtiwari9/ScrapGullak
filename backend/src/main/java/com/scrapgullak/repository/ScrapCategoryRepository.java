package com.scrapgullak.repository;

import com.scrapgullak.domain.entity.ScrapCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ScrapCategoryRepository extends JpaRepository<ScrapCategory, Long> {

    List<ScrapCategory> findByActiveTrueOrderByIdAsc();

    List<ScrapCategory> findAllByOrderByIdAsc();

    Optional<ScrapCategory> findByNameIgnoreCase(String name);
}
