package com.scrapgullak.api;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.hamcrest.Matchers.blankOrNullString;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Login, registration and /auth/me through the HTTP API. */
class AuthApiTest extends ApiTestSupport {

    private static final String BAD_CREDENTIALS = "Invalid phone number or password.";

    @Test
    void customerLoginReturnsTokenUserAndPassbook() throws Exception {
        doPost("/auth/login", null, Map.of("phone", CUSTOMER_PHONE, "password", CUSTOMER_PASSWORD))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", not(blankOrNullString())))
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresInSeconds", greaterThan(0)))
                .andExpect(jsonPath("$.role").value("CUSTOMER"))
                .andExpect(jsonPath("$.user.phone").value(CUSTOMER_PHONE))
                .andExpect(jsonPath("$.user.fullName").value("Priya Sharma"))
                .andExpect(jsonPath("$.user.role").value("CUSTOMER"))
                .andExpect(jsonPath("$.user.accountType").value("B2C_HOUSEHOLD"))
                .andExpect(jsonPath("$.user.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.passbook").isMap())
                .andExpect(jsonPath("$.passbook.gullakTotalEarnings").isNumber())
                .andExpect(jsonPath("$.passbook.totalRecycledKg").isNumber())
                .andExpect(jsonPath("$.passbook.co2SavedKg").isNumber())
                .andExpect(jsonPath("$.passbook.totalPickups").isNumber())
                .andExpect(jsonPath("$.passbook.transactions").isArray());
    }

    @Test
    void agentLoginHasNoPassbook() throws Exception {
        doPost("/auth/login", null, Map.of("phone", AGENT_PHONE, "password", AGENT_PASSWORD))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", not(blankOrNullString())))
                .andExpect(jsonPath("$.role").value("AGENT"))
                .andExpect(jsonPath("$.user.fullName").value("Ravi Kumar"))
                .andExpect(jsonPath("$.user.vehicle").value("Tata Ace, UP16 CT 4471"))
                .andExpect(jsonPath("$.passbook").doesNotExist());
    }

    @Test
    void adminLoginHasNoPassbook() throws Exception {
        doPost("/auth/login", null, Map.of("phone", ADMIN_PHONE, "password", ADMIN_PASSWORD))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", not(blankOrNullString())))
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.role").value("ADMIN"))
                .andExpect(jsonPath("$.user.fullName").value("Vikas Gupta"))
                .andExpect(jsonPath("$.passbook").doesNotExist());
    }

    @Test
    void corporateCustomerLogin() throws Exception {
        doPost("/auth/login", null, Map.of("phone", CORPORATE_PHONE, "password", CUSTOMER_PASSWORD))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("CUSTOMER"))
                .andExpect(jsonPath("$.user.accountType").value("B2B_CORPORATE"))
                .andExpect(jsonPath("$.user.companyName").value("Ecotech Components Pvt Ltd"))
                .andExpect(jsonPath("$.user.gstNumber").value("09AABCE1234F1Z5"))
                .andExpect(jsonPath("$.passbook").isMap());
    }

    @Test
    void loginAcceptsFormattedPhoneNumbers() throws Exception {
        doPost("/auth/login", null, Map.of("phone", "+91 98765 43210", "password", CUSTOMER_PASSWORD))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.phone").value(CUSTOMER_PHONE));
    }

    @Test
    void wrongPasswordIs401WithGenericMessage() throws Exception {
        doPost("/auth/login", null, Map.of("phone", CUSTOMER_PHONE, "password", "WrongPass@1"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value(BAD_CREDENTIALS))
                .andExpect(jsonPath("$.token").doesNotExist());
    }

    @Test
    void unknownPhoneGetsTheSameMessage() throws Exception {
        doPost("/auth/login", null, Map.of("phone", "6000000001", "password", CUSTOMER_PASSWORD))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value(BAD_CREDENTIALS));
    }

    @Test
    void loginWithoutPasswordIs400() throws Exception {
        doPost("/auth/login", null, Map.of("phone", CUSTOMER_PHONE))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.password").exists());
    }

    @Test
    void meReturnsTheCaller() throws Exception {
        doGet("/auth/me", agentToken())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phone").value(AGENT_PHONE))
                .andExpect(jsonPath("$.role").value("AGENT"));
    }

    @Test
    void meWithoutTokenIs401() throws Exception {
        doGet("/auth/me", null)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Please sign in to continue."));
    }

    @Test
    void registerCreatesCustomerAndNormalizesPhone() throws Exception {
        String phone = uniquePhone();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("fullName", "Meera Iyer");
        body.put("phone", "+91 " + phone.substring(0, 5) + " " + phone.substring(5));
        body.put("email", "meera@example.in");
        body.put("password", "Secret@123");
        body.put("address", "D-9, Gaur City");
        body.put("noidaSector", "Sector 121");

        JsonNode auth = json(doPost("/auth/register", null, body)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token", not(blankOrNullString())))
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.role").value("CUSTOMER"))
                .andExpect(jsonPath("$.user.phone").value(phone))
                .andExpect(jsonPath("$.user.fullName").value("Meera Iyer"))
                .andExpect(jsonPath("$.user.accountType").value("B2C_HOUSEHOLD"))
                .andExpect(jsonPath("$.user.gullakTotalEarnings").value(0.0)));

        // The issued token works immediately, and so does a fresh login.
        doGet("/auth/me", auth.path("token").asText())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phone").value(phone));
        doPost("/auth/login", null, Map.of("phone", phone, "password", "Secret@123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("CUSTOMER"));
    }

    @Test
    void registerCannotChooseARole() throws Exception {
        String phone = uniquePhone();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("fullName", "Sneaky Admin");
        body.put("phone", phone);
        body.put("password", "Secret@123");
        body.put("role", "ADMIN");

        doPost("/auth/register", null, body)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("CUSTOMER"));
    }

    @Test
    void registerCorporateAccountWithGstin() throws Exception {
        String phone = uniquePhone();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("fullName", "Kavita Rao");
        body.put("phone", phone);
        body.put("password", "Secret@123");
        body.put("accountType", "B2B_CORPORATE");
        body.put("gstNumber", "09AABCE1234F1Z5");
        body.put("companyName", "Rao Fabricators");

        doPost("/auth/register", null, body)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.accountType").value("B2B_CORPORATE"))
                .andExpect(jsonPath("$.user.gstNumber").value("09AABCE1234F1Z5"))
                .andExpect(jsonPath("$.user.companyName").value("Rao Fabricators"));
    }

    @Test
    void duplicatePhoneIs409() throws Exception {
        String phone = uniquePhone();
        registerCustomer(phone, "Secret@123");

        Map<String, Object> again = new LinkedHashMap<>();
        again.put("fullName", "Someone Else");
        again.put("phone", "0" + phone);
        again.put("password", "Another@123");

        doPost("/auth/register", null, again)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value("An account with this phone number already exists."));
    }

    @Test
    void seededPhoneCannotBeRegisteredAgain() throws Exception {
        doPost("/auth/register", null,
                Map.of("fullName", "Fake Priya", "phone", CUSTOMER_PHONE, "password", "Secret@123"))
                .andExpect(status().isConflict());
    }

    @Test
    void invalidRegistrationIs400WithFieldErrors() throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("fullName", "");
        body.put("phone", "12345");
        body.put("email", "not-an-email");
        body.put("password", "short");

        doPost("/auth/register", null, body)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message", not(blankOrNullString())))
                .andExpect(jsonPath("$.fieldErrors.fullName").value("Enter your full name."))
                .andExpect(jsonPath("$.fieldErrors.phone").value("Enter a valid 10-digit Indian mobile number."))
                .andExpect(jsonPath("$.fieldErrors.email").value("Enter a valid email address."))
                .andExpect(jsonPath("$.fieldErrors.password").value("Password must be 8 to 72 characters long."));
    }

    @Test
    void corporateRegistrationRequiresGstin() throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("fullName", "Kavita Rao");
        body.put("phone", uniquePhone());
        body.put("password", "Secret@123");
        body.put("accountType", "B2B_CORPORATE");

        doPost("/auth/register", null, body)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Enter your company's GSTIN to register a corporate account."));
    }

    @Test
    void malformedGstinIs400() throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("fullName", "Kavita Rao");
        body.put("phone", uniquePhone());
        body.put("password", "Secret@123");
        body.put("accountType", "B2B_CORPORATE");
        body.put("gstNumber", "NOT-A-GSTIN");

        doPost("/auth/register", null, body)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.gstNumber").value("GSTIN should look like 09AABCE1234F1Z5."));
    }

    @Test
    void invalidAccountTypeIs400() throws Exception {
        String json = """
                {"fullName":"X Y","phone":"%s","password":"Secret@123","accountType":"GOVERNMENT"}
                """.formatted(uniquePhone());

        doPostRaw("/auth/register", null, json)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", startsWith("Invalid value 'GOVERNMENT' for accountType")));
    }

    @Test
    void malformedJsonIs400() throws Exception {
        doPostRaw("/auth/login", null, "{\"phone\": ")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", is("Malformed JSON request.")));
    }
}
