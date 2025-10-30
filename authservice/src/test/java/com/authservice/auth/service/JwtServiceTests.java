package com.authservice.auth.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class JwtServiceTests {
    private JwtService jwtService;

    @Value("${jwt.secret.key}")
    private String TEST_SECRET;
    private final String TEST_USER = "test@test.com";

    @BeforeEach
    public void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secretKey", TEST_SECRET);
    }

    private Claims parseToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(TEST_SECRET.getBytes())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    @Test
    public void testGenerateToken_NotNull() {
        String token = jwtService.generateToken(TEST_USER);
        assertNotNull(token);
    }

    @Test
    public void testGenerateToken_ValidSubject() {
        String token = jwtService.generateToken(TEST_USER);
        Claims claims = parseToken(token);
        assertEquals(TEST_USER, claims.getSubject());
    }

    @Test
    public void testGenerateToken_SetsExpirationInFuture() {
        String token = jwtService.generateToken(TEST_USER);
        Claims claims = parseToken(token);
        assertTrue(claims.getExpiration().getTime() > System.currentTimeMillis());
    }
}
