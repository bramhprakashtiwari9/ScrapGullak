# syntax=docker/dockerfile:1

# ---- build stage -----------------------------------------------------------
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace

# Resolve dependencies first so they are cached between source-only changes.
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn -B -q dependency:go-offline

COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B -q -DskipTests package \
    && cp target/scrapgullak-backend-*.jar /workspace/app.jar

# ---- runtime stage ---------------------------------------------------------
FROM eclipse-temurin:21-jre
WORKDIR /app

RUN groupadd --system app && useradd --system --gid app --home /app app
COPY --from=build /workspace/app.jar /app/app.jar
USER app

ENV SPRING_PROFILES_ACTIVE=mysql \
    APP_TIMEZONE=Asia/Kolkata \
    JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError"

EXPOSE 8080

# Liveness/readiness probes: /actuator/health/liveness and /actuator/health/readiness
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
