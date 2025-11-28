package com.authservice.auth.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import java.security.Key;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Collections;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
    @Value("${jwt.secret.key}")
    private String secretKey;
    private static final Duration ONE_DAY = Duration.ofDays(1);

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(secretKey.getBytes());
    }

    private String buildToken(String subject, Duration expiration, String type) {
        return Jwts.builder()
                .setSubject(subject)
                .setIssuedAt(Date.from(Instant.now()))
                .setExpiration(Date.from(Instant.now().plus(expiration)))
                .addClaims(Collections.singletonMap("typ", type))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String createUserToken(String username) {
        return buildToken(username, ONE_DAY, "session");
    }

    public String createEmailVerificationToken(String username) {
        return buildToken(username, ONE_DAY, "email");
    }

    public String createPasswordResetToken(String username) {
        return buildToken(username, ONE_DAY, "password-reset");
    }

    public Claims parseToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
