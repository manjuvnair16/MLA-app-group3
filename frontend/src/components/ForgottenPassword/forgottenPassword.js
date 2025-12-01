import React, { useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  CircularProgress,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const response = await axios.post(
        "http://localhost:8080/api/auth/send-reset-email",
        { email }
      );

      if (response.status === 200) {
        setSuccess(true);
        setEmail("");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to send reset email. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        mt: 1,
        maxWidth: 420,
        mx: "auto",
        p: 4,
        borderRadius: 4,
        boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.1)",
        backgroundColor: "white",
      }}
    >
      <Button
        component={RouterLink}
        to="/login"
        startIcon={<ArrowBackIcon />}
        sx={{
          mb: 2,
          color: "text.secondary",
          textTransform: "none",
          "&:hover": {
            backgroundColor: "transparent",
            color: "var(--color-primary)",
          },
        }}
      >
        Back to Login
      </Button>

      <Typography
        variant="h5"
        align="center"
        fontWeight={600}
        mb={2}
        color="text.primary"
      >
        Forgotten Password
      </Typography>

      <Typography variant="body2" align="center" color="text.secondary" mb={3}>
        Enter your email address and we'll send you a link to reset your
        password.
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Password reset email sent! Please check your inbox.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={2.5}>
          <TextField
            label="Email"
            name="email"
            type="email"
            variant="standard"
            fullWidth
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading || success}
          />

          <Button
            type="submit"
            variant="contained"
            disabled={loading || !email || success}
            sx={{
              mt: 2,
              backgroundColor: "var(--color-primary)",
              "&:hover": {
                backgroundColor: "var(--color-primary-600)",
              },
              py: 1.2,
              fontWeight: "bold",
              borderRadius: "30px",
              transition: "background-color 0.3s ease",
            }}
          >
            {loading ? <CircularProgress size={24} /> : "Send Reset Link"}
          </Button>
        </Stack>
      </Box>

      <Typography sx={{ mt: 3, textAlign: "center" }}>
        Remember your password?{" "}
        <Button
          component={RouterLink}
          to="/login"
          variant="text"
          sx={{
            textTransform: "none",
            color: "var(--color-primary)",
            fontWeight: 600,
          }}
        >
          Login
        </Button>
      </Typography>
    </Box>
  );
};

export default ForgotPassword;
