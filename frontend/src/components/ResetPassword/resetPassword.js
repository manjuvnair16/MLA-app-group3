import React, { useState, useEffect } from "react";
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
import {
  Link as RouterLink,
  useSearchParams,
  useNavigate,
} from "react-router-dom";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [tokenValid, setTokenValid] = useState(true);
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setError("Invalid or missing reset token");
    }
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        "http://localhost:8080/api/auth/reset-password",
        {
          token,
          newPassword: formData.password,
        }
      );

      if (response.status === 200) {
        setSuccess(true);
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to reset password. The link may have expired."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!tokenValid) {
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
        <Alert severity="error" sx={{ mb: 2 }}>
          Invalid or missing reset token. Please request a new password reset.
        </Alert>
        <Button
          component={RouterLink}
          to="/forgotten-password"
          variant="contained"
          fullWidth
          sx={{
            backgroundColor: "var(--color-primary)",
            "&:hover": {
              backgroundColor: "var(--color-primary-600)",
            },
          }}
        >
          Request New Reset Link
        </Button>
      </Box>
    );
  }

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
      <Typography
        variant="h5"
        align="center"
        fontWeight={600}
        mb={2}
        color="text.primary"
      >
        Reset Password
      </Typography>

      <Typography variant="body2" align="center" color="text.secondary" mb={3}>
        Enter your new password below.
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Password reset successful! Redirecting to login...
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
            label="New Password"
            name="password"
            type="password"
            variant="standard"
            fullWidth
            required
            value={formData.password}
            onChange={handleChange}
            disabled={loading || success}
          />

          <TextField
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            variant="standard"
            fullWidth
            required
            value={formData.confirmPassword}
            onChange={handleChange}
            disabled={loading || success}
          />

          <Button
            type="submit"
            variant="contained"
            disabled={
              loading ||
              success ||
              !formData.password ||
              !formData.confirmPassword
            }
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
            {loading ? <CircularProgress size={24} /> : "Reset Password"}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

export default ResetPassword;
