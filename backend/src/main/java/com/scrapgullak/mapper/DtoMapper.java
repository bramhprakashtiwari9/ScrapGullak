package com.scrapgullak.mapper;

import com.scrapgullak.domain.entity.OrderItem;
import com.scrapgullak.domain.entity.PickupOrder;
import com.scrapgullak.domain.entity.ScrapCategory;
import com.scrapgullak.domain.entity.User;
import com.scrapgullak.domain.entity.YardInventory;
import com.scrapgullak.domain.enums.OrderType;
import com.scrapgullak.dto.admin.AgentDto;
import com.scrapgullak.dto.admin.YardInventoryDto;
import com.scrapgullak.dto.common.UserDto;
import com.scrapgullak.dto.common.UserRef;
import com.scrapgullak.dto.passbook.PassbookTransactionDto;
import com.scrapgullak.dto.pickup.CorporateDetailsDto;
import com.scrapgullak.dto.pickup.OrderItemDto;
import com.scrapgullak.dto.pickup.PickupOrderDto;
import com.scrapgullak.dto.rate.CategoryRef;
import com.scrapgullak.dto.rate.ScrapCategoryDto;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Stream;

/**
 * Entity -> DTO mapping. Touches lazy associations, so call it inside the service transaction
 * (open-in-view is disabled). Every method returns {@code null} for a {@code null} input.
 */
@Component
public class DtoMapper {

    public UserDto toUserDto(User user) {
        if (user == null) {
            return null;
        }
        return new UserDto(
                user.getId(),
                user.getFullName(),
                user.getPhone(),
                user.getEmail(),
                user.getRole(),
                user.getAccountType(),
                user.getGstNumber(),
                user.getCompanyName(),
                user.getAddress(),
                user.getNoidaSector(),
                user.getVehicle(),
                user.getGullakTotalEarnings(),
                user.getTotalRecycledKg(),
                user.getCreatedAt());
    }

    /** Company name for corporate customers when set, otherwise the person's name. */
    public UserRef toUserRef(User user) {
        if (user == null) {
            return null;
        }
        String displayName = hasText(user.getCompanyName()) ? user.getCompanyName() : user.getFullName();
        return new UserRef(user.getId(), displayName, user.getPhone());
    }

    /** @param includeMill whether to expose the mill selling rate (admins only) */
    public ScrapCategoryDto toCategoryDto(ScrapCategory category, boolean includeMill) {
        if (category == null) {
            return null;
        }
        return new ScrapCategoryDto(
                category.getId(),
                category.getName(),
                category.getCategoryGroup(),
                category.getUnit(),
                category.getBuyingRateInr(),
                includeMill ? category.getMillSellingRateInr() : null,
                category.getIconName(),
                category.isActive(),
                category.getUpdatedAt());
    }

    public CategoryRef toCategoryRef(ScrapCategory category) {
        if (category == null) {
            return null;
        }
        return new CategoryRef(category.getId(), category.getName(), category.getCategoryGroup(), category.getUnit());
    }

    public PickupOrderDto toOrderDto(PickupOrder order) {
        if (order == null) {
            return null;
        }
        List<OrderItemDto> items = order.getItems() == null
                ? List.of()
                : order.getItems().stream().map(this::toItemDto).toList();
        List<String> scrapGroups = order.getScrapGroups() == null ? List.of() : List.copyOf(order.getScrapGroups());
        return new PickupOrderDto(
                order.getId(),
                order.getOrderNumber(),
                toUserRef(order.getCustomer()),
                toUserRef(order.getAssignedAgent()),
                order.getOrderType(),
                order.getStatus(),
                order.getNoidaSector(),
                order.getFullAddress(),
                order.getGpsLat(),
                order.getGpsLng(),
                order.getScheduledDate(),
                order.getTimeSlot(),
                order.getEstimatedWeightRange(),
                order.getPhotoUrl(),
                scrapGroups,
                order.getNotes(),
                toCorporateDetails(order),
                items,
                order.getFinalTotalWeightKg(),
                order.getFinalPayoutInr(),
                order.getPaymentMode(),
                order.getUpiTransactionRef(),
                order.getCreatedAt(),
                order.getPaidAt());
    }

    /**
     * Corporate block of an order, or {@code null} for a household pickup that carries no corporate data
     * (the frontends test {@code corporateDetails} for null).
     */
    public CorporateDetailsDto toCorporateDetails(PickupOrder order) {
        if (order == null) {
            return null;
        }
        boolean anyCorporateField = Stream.of(order.getCompanyName(), order.getCorporateGstNumber(),
                        order.getContactName(), order.getContactPhone(), order.getContactEmail(),
                        order.getRequestType(), order.getFrequency())
                .anyMatch(DtoMapper::hasText);
        if (order.getOrderType() != OrderType.INDUSTRIAL_B2B && !anyCorporateField) {
            return null;
        }
        return new CorporateDetailsDto(
                order.getCompanyName(),
                order.getCorporateGstNumber(),
                order.getContactName(),
                order.getContactPhone(),
                order.getContactEmail(),
                order.getRequestType(),
                order.getFrequency());
    }

    public OrderItemDto toItemDto(OrderItem item) {
        if (item == null) {
            return null;
        }
        return new OrderItemDto(
                item.getId(),
                toCategoryRef(item.getScrapCategory()),
                item.getNetWeightKg(),
                item.getAppliedBuyingRateInr(),
                item.getSubTotalInr());
    }

    /** Passbook ledger line for a PAID order ({@code date} = paidAt). */
    public PassbookTransactionDto toPassbookTransaction(PickupOrder order) {
        if (order == null) {
            return null;
        }
        return new PassbookTransactionDto(
                order.getId(),
                order.getOrderNumber(),
                order.getPaidAt(),
                order.getFinalTotalWeightKg(),
                order.getFinalPayoutInr(),
                order.getPaymentMode(),
                order.getUpiTransactionRef());
    }

    public YardInventoryDto toInventoryDto(YardInventory inventory) {
        if (inventory == null) {
            return null;
        }
        return new YardInventoryDto(
                inventory.getId(),
                toCategoryRef(inventory.getScrapCategory()),
                inventory.getRawMixedWeightKg(),
                inventory.getSegregatedWeightKg(),
                inventory.getBaledReadyForMillWeightKg(),
                inventory.getMinTruckDispatchThresholdKg(),
                inventory.getLastUpdated());
    }

    public AgentDto toAgentDto(User user, long activePickups) {
        if (user == null) {
            return null;
        }
        return new AgentDto(
                user.getId(),
                user.getFullName(),
                user.getPhone(),
                user.getEmail(),
                user.getRole(),
                user.getNoidaSector(),
                user.getVehicle(),
                activePickups);
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
