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
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

const Signup = ({ onSignup }) => {
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

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

      if (status === 200 && data.jwt) {
        localStorage.setItem("jwt", data.jwt);
        onSignup(formData.email);
      } else {
        setError(data);
      }
    } catch (err) {
      console.error("Error during registration", err);
      setError(
        err.response?.data.message ||
          "An error occurred during registration. Please try again."
      );
    }
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
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
            Signup
          </Button>
        </Stack>
      </Box>

      <Typography sx={{ mt: 2 }}>
        Already have an account?{" "}
        <Button component={RouterLink} to="/login" variant="text">
          Login
        </Button>
      </Typography>
    </Box>
  );
};

export default Signup;
