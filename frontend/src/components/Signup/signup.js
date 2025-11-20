import React, { useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Grid,
  TextField,
  Typography,
  Stack,
  CircularProgress
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

const Signup = () => {
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setSubmitted(false);
    setSuccess("");
    setError("");
    setFormData({
      email: "",
      firstName: "",
      lastName: "",
      password: "",
      confirmPassword: ""
    });
  };

  const handleResendVerification = async (email) => {
    setIsLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:8080/api/auth/resend-verification",
        { email }
      );

      if (response.status === 200) {
        setError("");
        setSuccess("Verification email has been resent");
      }
    } catch (err) {
      setSuccess("");
      setError(
        err.response?.data?.message ||
          "Failed to resend verification email, please try again later"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        password: formData.password,
      };

      const { status, data } = await axios.post(
        "http://localhost:8080/api/auth/signup",
        payload
      );

      if (status === 200) {
        setError("");
        setSuccess(data?.message);
        setSubmitted(true);
      } else {
        setSuccess("");
        setError(data?.message);
      }
    } catch (err) {
      console.error("Error during registration", err);
      setSuccess("");
      setError(
        err.response?.data.message ||
          "An error occurred during registration. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box>
      {submitted ? (
        <>
          {error && (
            <Alert severity="error" sx={{ mb: 2}}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2}}>
              {success}
            </Alert>
          )}
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Thanks for signing up!
            </Typography>
            <Typography>
              We have sent a verification link to: {formData.email}.<br />
              Please check your inbox and click the link to verify your account.
            </Typography>
            <Typography sx={{ mb: 2}}>
              Didn't receive the email?{" "}
              <Button variant="text" disabled={isLoading} onClick={() => handleResendVerification(formData.email)}>
                {isLoading ? <CircularProgress size={24} color="inherit"/> 
                : "Resend email"}
              </Button>
            </Typography>

            <Box sx={{ display: "flex", justifyContent: "center" }}> 
              <Button 
                variant="contained" 
                onClick={() => {resetForm()}}
              >
                Back to sign up
              </Button>
            </Box>
          </Box>
        </>
      ) : (
        <>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}
          <Box component="form" onSubmit={handleSignup} noValidate sx={{ mt: 1 }}>
            <Stack spacing={2.5}>
              <TextField
                label="Email"
                variant="standard"
                fullWidth
                margin="none"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />

              <TextField
                label="First Name"
                variant="standard"
                fullWidth
                margin="none"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                required
              />

              <TextField
                label="Last Name"
                variant="standard"
                fullWidth
                margin="none"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                required
              />

              <TextField
                label="Password"
                variant="standard"
                fullWidth
                margin="none"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                required
              />

              <TextField
                label="Confirm Password"
                variant="standard"
                fullWidth
                margin="none"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
              />

              <Button
                type="submit"
                variant="contained"
                sx={{
                  mt: 2,
                  backgroundColor: "var(--color-primary)",
                  "&:hover": {
                    backgroundColor: "var(--color-primary-600)",
                  },
                }}
              >
                {isLoading ? <CircularProgress size={24} color="inherit"/> : "Signup"}
              </Button>
            </Stack>
          </Box>

          <Typography sx={{ mt: 2 }}>
            Already have an account?{" "}
            <Button component={RouterLink} to="/login" variant="text">
              Login
            </Button>
          </Typography>
        </>
      )}
    </Box>
  );
};

export default Signup;
