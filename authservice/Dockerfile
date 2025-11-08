FROM gradle:7.2-jdk8 AS build

WORKDIR /home/gradle/src

COPY build.gradle.kts .
COPY src ./src

RUN gradle bootJar --no-daemon

FROM eclipse-temurin:8-jre-jammy

EXPOSE 8080

COPY --from=build /home/gradle/src/build/libs/*.jar /app/authservice.jar

CMD ["java", "-jar", "/app/authservice.jar"]
