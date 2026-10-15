package com.scrapgullak.bootstrap;

import com.scrapgullak.config.AppProperties;
import com.scrapgullak.domain.entity.OrderItem;
import com.scrapgullak.domain.entity.PickupOrder;
import com.scrapgullak.domain.entity.ScrapCategory;
import com.scrapgullak.domain.entity.User;
import com.scrapgullak.domain.entity.YardInventory;
import com.scrapgullak.domain.enums.AccountType;
import com.scrapgullak.domain.enums.CategoryGroup;
import com.scrapgullak.domain.enums.OrderStatus;
import com.scrapgullak.domain.enums.OrderType;
import com.scrapgullak.domain.enums.PaymentMode;
import com.scrapgullak.domain.enums.Role;
import com.scrapgullak.domain.enums.ScrapUnit;
import com.scrapgullak.repository.PickupOrderRepository;
import com.scrapgullak.repository.ScrapCategoryRepository;
import com.scrapgullak.repository.UserRepository;
import com.scrapgullak.repository.YardInventoryRepository;
import com.scrapgullak.support.MoneyUtils;
import com.scrapgullak.support.OrderNumberGenerator;
import com.scrapgullak.support.PricingCalculator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;
import java.util.stream.IntStream;

/**
 * Seeds reference data and demo accounts at startup (spec §9), mirroring the frontends' {@code mockData.js}.
 * <p>
 * Every step is idempotent: categories are matched by name, yard stock by category, users by phone, and the
 * sample pickups are only created while the database holds no pickup orders at all. Existing rows (and
 * passwords) are never modified. Seeded PAID orders credit their customers' Gullak totals but leave the yard
 * inventory untouched, because the seeded inventory already reflects them.
 */
@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    // ---- reference data (mockData.js CATEGORY_SEED + INVENTORY_SEED; list position + 1 = mock category id)

    private static final List<CategorySeed> CATEGORIES = List.of(
            new CategorySeed("Copper Wire (Bright)", CategoryGroup.NON_FERROUS, "680", "735", "zap", 46, 22, 310, 500),
            new CategorySeed("Brass (Peetal)", CategoryGroup.NON_FERROUS, "420", "462", "cog", 38, 15, 120, 500),
            new CategorySeed("Aluminium (Utensils & Sections)", CategoryGroup.NON_FERROUS, "145", "172", "layers", 120, 85, 640, 1000),
            new CategorySeed("HMS Iron (Heavy Melting)", CategoryGroup.FERROUS, "32", "38.5", "hammer", 1850, 2400, 7600, 8000),
            new CategorySeed("Tin / Light Iron", CategoryGroup.FERROUS, "24", "29.5", "wrench", 960, 1300, 2100, 5000),
            new CategorySeed("Corrugated Gatta (Cardboard)", CategoryGroup.PAPER, "14", "18.5", "box", 1420, 980, 6250, 6000),
            new CategorySeed("Office Paper & Files", CategoryGroup.PAPER, "12", "16", "file-text", 610, 450, 1700, 4000),
            new CategorySeed("Newspaper (Akhbaar)", CategoryGroup.PAPER, "15", "19.5", "newspaper", 380, 260, 1150, 3000),
            new CategorySeed("PET Bottles", CategoryGroup.PLASTIC, "18", "26", "cup-soda", 520, 410, 1900, 2500),
            new CategorySeed("HDPE Plastic (Cans & Drums)", CategoryGroup.PLASTIC, "22", "31", "package", 260, 180, 620, 2000),
            new CategorySeed("E-Waste & Appliances", CategoryGroup.E_WASTE, "45", "64", "cpu", 340, 210, 880, 1500),
            new CategorySeed("Mixed Day Scrap (Kabad)", CategoryGroup.FERROUS, "10", "14.5", "recycle", 1150, 0, 0, 3000));

    // ---- accounts

    private static final String ADMIN_PHONE = "9999999999";
    private static final String RAVI_PHONE = "9876500001";
    private static final String SANJAY_PHONE = "9876500002";
    private static final String IMRAN_PHONE = "9876500003";
    private static final String PRIYA_PHONE = "9876543210";
    private static final String ECOTECH_PHONE = "9810011223";

    /** Walk-in customers that only exist so the admin board has realistic orders (no usable password). */
    private static final List<WalkInSeed> WALK_INS = List.of(
            new WalkInSeed("Rohit Verma", "9811122334", false, "Sector 18"),
            new WalkInSeed("Neha Gupta", "9899012345", false, "Sector 125"),
            new WalkInSeed("Deepak Sharma", "9873456120", false, "Sector 63"),
            new WalkInSeed("Sunita Rawat", "9958123477", false, "Indirapuram"),
            new WalkInSeed("Kalpana Textiles", "9810456789", true, "Phase-2"),
            new WalkInSeed("Amit Saxena", "9717001122", false, "Sector 137"),
            new WalkInSeed("Brightwave IT Park", "9650033441", true, "Sector 135"));

    // ---- sample pickups (mockData.js defs, in definition order; `day` is relative to today)

    private static final String PRIYA_ADDRESS = "C-1204, Supertech Capetown";
    private static final String ECOTECH_ADDRESS = "Plot 14, Udyog Vihar";
    private static final String ECOTECH_SECTOR = "Ecotech-3 (Greater Noida)";

    private static final List<PickupSeed> PICKUPS = List.of(
            new PickupSeed(91, PRIYA_PHONE, OrderType.DOORSTEP_B2C, -28, OrderStatus.PAID, RAVI_PHONE, "Sector 74", PRIYA_ADDRESS,
                    "11 AM – 2 PM", "20 – 50 kg", List.of(line(6, 22.5), line(8, 14), line(9, 6.2)), List.of("PAPER", "PLASTIC"), PaymentMode.UPI),
            new PickupSeed(95, PRIYA_PHONE, OrderType.DOORSTEP_B2C, -17, OrderStatus.PAID, RAVI_PHONE, "Sector 74", PRIYA_ADDRESS,
                    "8 – 11 AM", "20 – 50 kg", List.of(line(4, 18), line(5, 9.5), line(3, 2.4)), List.of("FERROUS", "NON_FERROUS"), PaymentMode.UPI),
            new PickupSeed(98, PRIYA_PHONE, OrderType.DOORSTEP_B2C, -9, OrderStatus.PAID, RAVI_PHONE, "Sector 74", PRIYA_ADDRESS,
                    "5 – 8 PM", "Under 20 kg", List.of(line(1, 1.2), line(11, 7.8), line(7, 11)), List.of("E_WASTE", "NON_FERROUS", "PAPER"), PaymentMode.BANK_TRANSFER),
            new PickupSeed(101, PRIYA_PHONE, OrderType.DOORSTEP_B2C, -3, OrderStatus.PAID, RAVI_PHONE, "Sector 74", PRIYA_ADDRESS,
                    "2 – 5 PM", "20 – 50 kg", List.of(line(6, 16), line(10, 4.5)), List.of("PAPER", "PLASTIC"), PaymentMode.UPI),
            new PickupSeed(103, PRIYA_PHONE, OrderType.DOORSTEP_B2C, 0, OrderStatus.AGENT_ASSIGNED, RAVI_PHONE, "Sector 74", PRIYA_ADDRESS,
                    "11 AM – 2 PM", "20 – 50 kg", List.of(), List.of("PAPER", "FERROUS"), null),
            new PickupSeed(88, ECOTECH_PHONE, OrderType.INDUSTRIAL_B2B, -21, OrderStatus.PAID, SANJAY_PHONE, ECOTECH_SECTOR, ECOTECH_ADDRESS,
                    "8 – 11 AM", "1 – 5 ton", List.of(line(6, 1240), line(4, 860), line(10, 210)), List.of("PAPER", "FERROUS", "PLASTIC"), PaymentMode.BANK_TRANSFER),
            new PickupSeed(100, ECOTECH_PHONE, OrderType.INDUSTRIAL_B2B, 1, OrderStatus.BOOKED, null, ECOTECH_SECTOR, ECOTECH_ADDRESS,
                    "8 – 11 AM", "1 – 5 ton", List.of(), List.of("PAPER", "FERROUS", "E_WASTE"), null),
            new PickupSeed(99, "9811122334", OrderType.DOORSTEP_B2C, 0, OrderStatus.BOOKED, null, "Sector 18", "B-42, Atta Market lane",
                    "2 – 5 PM", "Under 20 kg", List.of(), List.of("PAPER"), null),
            new PickupSeed(102, "9899012345", OrderType.DOORSTEP_B2C, 0, OrderStatus.BOOKED, null, "Sector 125", "Tower 6, Jaypee Kosmos",
                    "5 – 8 PM", "20 – 50 kg", List.of(), List.of("E_WASTE", "PLASTIC"), null),
            new PickupSeed(93, "9873456120", OrderType.DOORSTEP_B2C, 1, OrderStatus.BOOKED, null, "Sector 63", "H-118, near Electronic City metro",
                    "11 AM – 2 PM", "50 – 100 kg", List.of(), List.of("FERROUS", "MIXED"), null),
            new PickupSeed(92, "9958123477", OrderType.DOORSTEP_B2C, 0, OrderStatus.BOOKED, null, "Indirapuram", "Shipra Suncity, Block 3",
                    "8 – 11 AM", "20 – 50 kg", List.of(), List.of("PAPER", "MIXED"), null),
            new PickupSeed(97, "9810456789", OrderType.INDUSTRIAL_B2B, 0, OrderStatus.OUT_FOR_PICKUP, SANJAY_PHONE, "Phase-2", "C-58, Hosiery Complex",
                    "8 – 11 AM", "500 kg – 1 ton", List.of(), List.of("PAPER", "PLASTIC"), null),
            new PickupSeed(96, "9717001122", OrderType.DOORSTEP_B2C, 0, OrderStatus.PAID, RAVI_PHONE, "Sector 137", "Paras Tierea, T-9",
                    "8 – 11 AM", "50 – 100 kg", List.of(line(4, 24), line(6, 30), line(9, 8)), List.of("FERROUS", "PAPER", "PLASTIC"), PaymentMode.UPI),
            new PickupSeed(94, "9650033441", OrderType.INDUSTRIAL_B2B, 0, OrderStatus.PAID, SANJAY_PHONE, "Sector 135", "Tower B, Brightwave IT Park",
                    "8 – 11 AM", "500 kg – 1 ton", List.of(line(6, 410), line(7, 260), line(11, 85)), List.of("PAPER", "E_WASTE"), PaymentMode.BANK_TRANSFER));

    /** Approximate GPS per sector (web {@code SECTOR_COORDS}); unknown sectors use the Noida centre. */
    private static final Map<String, double[]> SECTOR_COORDS = Map.ofEntries(
            Map.entry("Sector 18", new double[]{28.5708, 77.3261}),
            Map.entry("Sector 50", new double[]{28.5710, 77.3640}),
            Map.entry("Sector 62", new double[]{28.6270, 77.3727}),
            Map.entry("Sector 63", new double[]{28.6206, 77.3866}),
            Map.entry("Sector 74", new double[]{28.5770, 77.3880}),
            Map.entry("Sector 75", new double[]{28.5750, 77.3820}),
            Map.entry("Sector 80", new double[]{28.5460, 77.3930}),
            Map.entry("Sector 125", new double[]{28.5440, 77.3260}),
            Map.entry("Sector 135", new double[]{28.4970, 77.4080}),
            Map.entry("Sector 137", new double[]{28.5100, 77.4090}),
            Map.entry("Phase-2", new double[]{28.5355, 77.4050}),
            Map.entry(ECOTECH_SECTOR, new double[]{28.5560, 77.4600}),
            Map.entry("Greater Noida West", new double[]{28.6040, 77.4380}),
            Map.entry("Knowledge Park", new double[]{28.4720, 77.4880}),
            Map.entry("Indirapuram", new double[]{28.6460, 77.3690}));
    private static final double[] NOIDA_CENTRE = {28.5355, 77.391};

    private static final SecureRandom RANDOM = new SecureRandom();

    private final AppProperties props;
    private final Clock clock;
    private final PasswordEncoder passwordEncoder;
    private final PricingCalculator pricingCalculator;
    private final OrderNumberGenerator orderNumberGenerator;
    private final ScrapCategoryRepository categoryRepository;
    private final YardInventoryRepository inventoryRepository;
    private final UserRepository userRepository;
    private final PickupOrderRepository pickupOrderRepository;

    @Override
    @Transactional
    public void run(String... args) {
        AppProperties.Seed seed = props.seed();
        if (!seed.enabled()) {
            log.info("Data seeding disabled (app.seed.enabled=false)");
            return;
        }
        Stats stats = new Stats();
        Instant now = Instant.now(clock);

        Map<Integer, ScrapCategory> categories = seedCategories(now, stats);
        Map<String, User> users = new HashMap<>();
        seedCoreAccounts(seed, now, users, stats);
        if (seed.demoData()) {
            seedDemoAccounts(seed, now, users, stats);
            seedSamplePickups(categories, users, stats);
        }
        logSummary(seed, stats);
    }

    // ------------------------------------------------------------------ categories & yard

    private Map<Integer, ScrapCategory> seedCategories(Instant now, Stats stats) {
        Map<Integer, ScrapCategory> byMockId = new LinkedHashMap<>();
        for (int i = 0; i < CATEGORIES.size(); i++) {
            CategorySeed s = CATEGORIES.get(i);
            ScrapCategory category = categoryRepository.findByNameIgnoreCase(s.name()).orElseGet(() -> {
                stats.categories++;
                return categoryRepository.save(ScrapCategory.builder()
                        .name(s.name())
                        .categoryGroup(s.group())
                        .unit(ScrapUnit.KG)
                        .buyingRateInr(MoneyUtils.money(new BigDecimal(s.buyingRate())))
                        .millSellingRateInr(MoneyUtils.money(new BigDecimal(s.millRate())))
                        .iconName(s.iconName())
                        .active(true)
                        .build());
            });
            byMockId.put(i + 1, category);

            if (inventoryRepository.findByScrapCategoryId(category.getId()).isEmpty()) {
                inventoryRepository.save(YardInventory.builder()
                        .scrapCategory(category)
                        .rawMixedWeightKg(s.rawKg())
                        .segregatedWeightKg(s.segregatedKg())
                        .baledReadyForMillWeightKg(s.baledKg())
                        .minTruckDispatchThresholdKg(s.truckThresholdKg())
                        .lastUpdated(now)
                        .build());
                stats.inventoryRows++;
            }
        }
        return byMockId;
    }

    // ------------------------------------------------------------------ accounts

    private void seedCoreAccounts(AppProperties.Seed seed, Instant now, Map<String, User> users, Stats stats) {
        ensureUser(users, stats, ADMIN_PHONE, () -> User.builder()
                .fullName("Vikas Gupta").phone(ADMIN_PHONE).email("yard@scrapgullak.in")
                .passwordHash(passwordEncoder.encode(seed.adminPassword()))
                .role(Role.ADMIN).noidaSector("Phase-2")
                .createdAt(daysBefore(now, 365))
                .build());
        ensureUser(users, stats, RAVI_PHONE, () -> User.builder()
                .fullName("Ravi Kumar").phone(RAVI_PHONE)
                .passwordHash(passwordEncoder.encode(seed.agentPassword()))
                .role(Role.AGENT).noidaSector("Sector 62").vehicle("Tata Ace, UP16 CT 4471")
                .createdAt(daysBefore(now, 300))
                .build());
        ensureUser(users, stats, PRIYA_PHONE, () -> User.builder()
                .fullName("Priya Sharma").phone(PRIYA_PHONE).email("priya.sharma@example.in")
                .passwordHash(passwordEncoder.encode(seed.customerPassword()))
                .role(Role.CUSTOMER).accountType(AccountType.B2C_HOUSEHOLD)
                .address(PRIYA_ADDRESS).noidaSector("Sector 74")
                .createdAt(daysBefore(now, 120))
                .build());
    }

    private void seedDemoAccounts(AppProperties.Seed seed, Instant now, Map<String, User> users, Stats stats) {
        ensureUser(users, stats, SANJAY_PHONE, () -> User.builder()
                .fullName("Sanjay Yadav").phone(SANJAY_PHONE)
                .passwordHash(passwordEncoder.encode(seed.agentPassword()))
                .role(Role.AGENT).noidaSector("Phase-2").vehicle("Bolero Pickup, UP16 DT 2290")
                .createdAt(daysBefore(now, 240))
                .build());
        ensureUser(users, stats, IMRAN_PHONE, () -> User.builder()
                .fullName("Imran Khan").phone(IMRAN_PHONE)
                .passwordHash(passwordEncoder.encode(seed.agentPassword()))
                .role(Role.AGENT).noidaSector("Greater Noida West").vehicle("E-loader, UP16 EV 0817")
                .createdAt(daysBefore(now, 150))
                .build());
        ensureUser(users, stats, ECOTECH_PHONE, () -> User.builder()
                .fullName("Anil Mehta").companyName("Ecotech Components Pvt Ltd").phone(ECOTECH_PHONE)
                .email("facility@ecotechcomponents.in")
                .passwordHash(passwordEncoder.encode(seed.customerPassword()))
                .role(Role.CUSTOMER).accountType(AccountType.B2B_CORPORATE).gstNumber("09AABCE1234F1Z5")
                .address(ECOTECH_ADDRESS).noidaSector(ECOTECH_SECTOR)
                .createdAt(daysBefore(now, 200))
                .build());
    }

    /**
     * Returns the existing user with this phone, or persists a new one from the factory (the password is only
     * hashed when the account is actually created; existing accounts are never touched).
     */
    private User ensureUser(Map<String, User> users, Stats stats, String phone, Supplier<User> factory) {
        User user = userRepository.findByPhone(phone).orElseGet(() -> {
            stats.users++;
            return userRepository.save(factory.get());
        });
        users.put(phone, user);
        return user;
    }

    // ------------------------------------------------------------------ sample pickups

    private void seedSamplePickups(Map<Integer, ScrapCategory> categories, Map<String, User> users, Stats stats) {
        if (pickupOrderRepository.count() > 0) {
            log.info("Sample pickups skipped: pickup orders already exist");
            return;
        }
        ZoneId zone = clock.getZone();
        ZonedDateTime now = ZonedDateTime.now(clock);
        LocalDate today = now.toLocalDate();

        // Number orders in booking order (oldest first), so order numbers grow with createdAt.
        List<Integer> creationOrder = IntStream.range(0, PICKUPS.size()).boxed()
                .sorted(Comparator.comparingInt((Integer i) -> Math.min(PICKUPS.get(i).day(), 0))
                        .thenComparingInt(i -> PICKUPS.get(i).mockNumber()))
                .toList();

        for (int idx : creationOrder) {
            PickupSeed s = PICKUPS.get(idx);
            Instant createdAt = now.plusDays(Math.min(s.day(), 0) - 1L).toInstant();
            User customer = users.computeIfAbsent(s.customerPhone(), phone -> createWalkIn(phone, createdAt, stats));
            User agent = s.agentPhone() == null ? null : users.get(s.agentPhone());
            LocalDate scheduledDate = today.plusDays(s.day());
            double[] gps = SECTOR_COORDS.getOrDefault(s.sector(), NOIDA_CENTRE);

            PickupOrder order = PickupOrder.builder()
                    .orderNumber(orderNumberGenerator.next())
                    .customer(customer)
                    .assignedAgent(agent)
                    .orderType(s.orderType())
                    .status(s.status())
                    .noidaSector(s.sector())
                    .fullAddress(s.address())
                    .gpsLat(gps[0])
                    .gpsLng(gps[1])
                    .scheduledDate(scheduledDate)
                    .timeSlot(s.timeSlot())
                    .estimatedWeightRange(s.estimatedWeightRange())
                    .scrapGroups(new ArrayList<>(s.scrapGroups()))
                    .createdAt(createdAt)
                    .build();
            if (s.orderType() == OrderType.INDUSTRIAL_B2B) {
                applyCorporateDetails(order, customer);
            }
            if (s.status() == OrderStatus.PAID) {
                // Same paid-time pattern as the mock: scheduled day, 10:15 + idx, never in the future.
                Instant paidAt = scheduledDate.atTime(10 + idx % 6, 15 + idx).atZone(zone).toInstant();
                if (paidAt.isAfter(now.toInstant())) {
                    paidAt = now.toInstant();
                }
                markPaid(order, s, categories, paidAt);
                creditGullak(customer, order);
                stats.paidOrders++;
            }
            pickupOrderRepository.save(order);
            stats.pickups++;
        }
    }

    private void applyCorporateDetails(PickupOrder order, User customer) {
        boolean hasCompany = customer.getCompanyName() != null && !customer.getCompanyName().isBlank();
        order.setCompanyName(hasCompany ? customer.getCompanyName() : customer.getFullName());
        order.setContactName(hasCompany ? customer.getFullName() : null);
        order.setContactPhone(customer.getPhone());
        order.setContactEmail(customer.getEmail());
        order.setCorporateGstNumber(customer.getGstNumber());
    }

    private void markPaid(PickupOrder order, PickupSeed s, Map<Integer, ScrapCategory> categories, Instant paidAt) {
        double totalKg = 0;
        BigDecimal totalPayout = MoneyUtils.ZERO;
        for (LineSeed line : s.items()) {
            ScrapCategory category = categories.get(line.mockCategoryId());
            BigDecimal subTotal = pricingCalculator.lineTotal(category, line.netWeightKg());
            order.addItem(OrderItem.builder()
                    .scrapCategory(category)
                    .netWeightKg(line.netWeightKg())
                    .appliedBuyingRateInr(MoneyUtils.money(category.getBuyingRateInr()))
                    .subTotalInr(subTotal)
                    .build());
            totalKg += line.netWeightKg();
            totalPayout = totalPayout.add(subTotal);
        }
        PaymentMode mode = s.paymentMode() != null ? s.paymentMode() : PaymentMode.UPI;
        order.setFinalTotalWeightKg(MoneyUtils.round2(totalKg));
        order.setFinalPayoutInr(MoneyUtils.money(totalPayout));
        order.setPaymentMode(mode);
        order.setUpiTransactionRef(mode == PaymentMode.UPI
                ? String.format("4%011d", 17_000_000_000L + s.mockNumber() * 7919L)
                : null);
        order.setWeighedAt(paidAt);
        order.setPaidAt(paidAt);
    }

    /** Seeding is single-threaded at startup, so the managed entity is updated directly (no SQL increment). */
    private static void creditGullak(User customer, PickupOrder order) {
        customer.setGullakTotalEarnings(MoneyUtils.money(
                MoneyUtils.money(customer.getGullakTotalEarnings()).add(order.getFinalPayoutInr())));
        double kg = customer.getTotalRecycledKg() == null ? 0.0 : customer.getTotalRecycledKg();
        customer.setTotalRecycledKg(MoneyUtils.round2(kg + order.getFinalTotalWeightKg()));
    }

    private User createWalkIn(String phone, Instant createdAt, Stats stats) {
        return userRepository.findByPhone(phone).orElseGet(() -> {
            WalkInSeed w = WALK_INS.stream().filter(x -> x.phone().equals(phone)).findFirst()
                    .orElseThrow(() -> new IllegalStateException("No seed customer for phone " + phone));
            stats.users++;
            return userRepository.save(User.builder()
                    .fullName(w.name())
                    .companyName(w.corporate() ? w.name() : null)
                    .phone(phone)
                    .passwordHash(passwordEncoder.encode(randomSecret()))
                    .role(Role.CUSTOMER)
                    .accountType(w.corporate() ? AccountType.B2B_CORPORATE : AccountType.B2C_HOUSEHOLD)
                    .noidaSector(w.sector())
                    .createdAt(createdAt)
                    .build());
        });
    }

    // ------------------------------------------------------------------ helpers

    /**
     * Logs what was seeded. Only the publicly documented default passwords are ever printed: a password the
     * operator supplied through {@code SEED_*_PASSWORD} is a real secret and must not reach the logs.
     */
    static void logSummary(AppProperties.Seed seed, Stats stats) {
        log.info("Seed complete: created {} categories, {} yard rows, {} users, {} sample pickups ({} paid)",
                stats.categories, stats.inventoryRows, stats.users, stats.pickups, stats.paidOrders);
        if (seed.demoData()) {
            log.info("""
                    Demo accounts (phone / password of newly seeded accounts):
                      ADMIN     Vikas Gupta          {} / {}
                      AGENT     Ravi Kumar           {} / {}   (also {}, {})
                      CUSTOMER  Priya Sharma         {} / {}
                      CUSTOMER  Ecotech (B2B)        {} / {}""",
                    ADMIN_PHONE, passwordHint(seed.adminPassword(), AppProperties.Seed.DEFAULT_ADMIN_PASSWORD,
                            "SEED_ADMIN_PASSWORD"),
                    RAVI_PHONE, passwordHint(seed.agentPassword(), AppProperties.Seed.DEFAULT_AGENT_PASSWORD,
                            "SEED_AGENT_PASSWORD"), SANJAY_PHONE, IMRAN_PHONE,
                    PRIYA_PHONE, passwordHint(seed.customerPassword(), AppProperties.Seed.DEFAULT_CUSTOMER_PASSWORD,
                            "SEED_CUSTOMER_PASSWORD"),
                    ECOTECH_PHONE, passwordHint(seed.customerPassword(), AppProperties.Seed.DEFAULT_CUSTOMER_PASSWORD,
                            "SEED_CUSTOMER_PASSWORD"));
        } else {
            log.info("Seeded accounts: ADMIN {}, AGENT {}, CUSTOMER {} (passwords from SEED_*_PASSWORD)",
                    ADMIN_PHONE, RAVI_PHONE, PRIYA_PHONE);
        }
    }

    /** The documented default as-is; anything the operator configured is replaced by where it came from. */
    private static String passwordHint(String configured, String builtInDefault, String envVariable) {
        return builtInDefault.equals(configured) ? builtInDefault : "<from " + envVariable + ">";
    }

    private static Instant daysBefore(Instant now, long days) {
        return now.minus(Duration.ofDays(days));
    }

    private static String randomSecret() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getEncoder().encodeToString(bytes);
    }

    private static LineSeed line(int mockCategoryId, double netWeightKg) {
        return new LineSeed(mockCategoryId, netWeightKg);
    }

    private record CategorySeed(String name, CategoryGroup group, String buyingRate, String millRate, String iconName,
                                double rawKg, double segregatedKg, double baledKg, double truckThresholdKg) {
    }

    private record WalkInSeed(String name, String phone, boolean corporate, String sector) {
    }

    private record LineSeed(int mockCategoryId, double netWeightKg) {
    }

    private record PickupSeed(int mockNumber, String customerPhone, OrderType orderType, int day, OrderStatus status,
                              String agentPhone, String sector, String address, String timeSlot,
                              String estimatedWeightRange, List<LineSeed> items, List<String> scrapGroups,
                              PaymentMode paymentMode) {
    }

    static final class Stats {
        private int categories;
        private int inventoryRows;
        private int users;
        private int pickups;
        private int paidOrders;
    }
}
