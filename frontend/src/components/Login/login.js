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
import { Link as RouterLink, useNavigate } from "react-router-dom";

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unverified, setUnverified] = useState(false);
  const [resendStatus, setResendStatus] = useState(""); // sending | sent | error
  const [resendError, setResendError] = useState("");

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleResendVerification = async () => {
    setResendStatus("sending");
    setResendError("");
    try {
      const response = await axios.post(
        "http://localhost:8080/api/auth/resend-verification",
        { email: formData.email }
      );

      if (response.status === 200) {
        setResendStatus("sent");
      }
    } catch (err) {
      setResendStatus("error");
      setResendError(
        err.response?.data?.message ||
          "Failed to send email, please try again later"
      );
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setUnverified(false);
    setLoading(true);

    try {
      const loginResponse = await axios.post(
        "http://localhost:8080/api/auth/login",
        {
          email: formData.email,
          password: formData.password,
        }
      );

      if (loginResponse.status === 200 && loginResponse.data.jwt) {
        localStorage.setItem("jwt", loginResponse.data.jwt);

        const { data } = await axios.get(
          `http://localhost:8080/api/auth/user?email=${encodeURIComponent(
            formData.email
          )}`
        );
        localStorage.setItem("user", JSON.stringify(data));

        onLogin(data.email);
        navigate("/statistics");
      }
    } catch (err) {
      if (err.response && err.response.status === 403) {
        setError(
          "Your account has not been verified. Please click the link sent to your email."
        );
        setUnverified(true);
      } else if (err.response.data.message && err.response.status === 401) {
        setError(err.response.data.message);
      } else {
        setError("Failed to login");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleLogin}
      noValidate
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
        mb={3}
        color="text.primary"
      >
        Login
      </Typography>

      {error && (
        <Alert severity={unverified ? "warning" : "error"} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {unverified && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2">
            Didn't receive the email?
            <Button
              variant="text"
              disabled={resendStatus === "sending"}
              onClick={() => handleResendVerification(formData.email)}
            >
              {resendStatus === "sending" ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                "Resend email"
              )}
            </Button>
          </Typography>
          {resendStatus === "sent" && (
            <Typography variant="body2" color="success.main" sx={{ mb: 2 }}>
              Verification email sent! Please check your inbox.
            </Typography>
          )}
          {resendStatus === "error" && (
            <Typography variant="body2" color="error.main" sx={{ mb: 2 }}>
              {resendError}
            </Typography>
          )}
        </Box>
      )}

      <Stack spacing={2.5}>
        <TextField
          label="Email"
          name="email"
          type="email"
          variant="standard"
          fullWidth
          required
          value={formData.email}
          onChange={handleChange}
        />

        <TextField
          label="Password"
          name="password"
          type="password"
          variant="standard"
          fullWidth
          required
          value={formData.password}
          onChange={handleChange}
        />

        <Box sx={{ textAlign: "right" }}>
          <Button
            component={RouterLink}
            to="/forgotten-password"
            variant="text"
            sx={{
              textTransform: "none",
              color: "var(--color-primary)",
              fontSize: "0.875rem",
              p: 0,
              minWidth: "auto",
              "&:hover": {
                backgroundColor: "transparent",
                textDecoration: "underline",
              },
            }}
          >
            Forgot Password?
          </Button>
        </Box>

        <Button
          type="submit"
          variant="contained"
          disabled={loading}
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
          {loading ? <CircularProgress size={24} /> : "Login"}
        </Button>
      </Stack>

      <Typography sx={{ mt: 2, textAlign: "center" }}>
        Don't have an account?{" "}
        <Button
          component={RouterLink}
          to="/signup"
          variant="text"
          sx={{
            textTransform: "none",
            color: "var(--color-primary)",
            fontWeight: 600,
          }}
        >
          Sign up
        </Button>
      </Typography>
    </Box>
  );
};

export default Login;
