import React, { useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  // Link as MUILink,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const payload = { email, password };

      const { status, data } = await axios.post(
        "http://localhost:8080/api/auth/login",
        payload
      );

      if (status === 200 && data.jwt) {
        localStorage.setItem("jwt", data.jwt);
        onLogin(email);
      }
      
    } catch (err) {
      if (err.response.data.message && err.response.status === 401) {
        setError(err.response.data.message);
      } else {
        setError("Failed to login");
      }
    }
  };

  return (
    <Box component="form" onSubmit={handleLogin} noValidate sx={{ mt: 1 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={2.5}>
        <TextField
          label="Email"
          variant="standard"
          fullWidth
          margin="none"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <TextField
          label="Password"
          variant="standard"
          fullWidth
          margin="none"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
        Login
      </Button>
      </Stack>

      <Typography sx={{ mt: 2 }}>
        Don't have an account?
        <Button component={RouterLink} to="/signup" variant="text">
          Sign up
        </Button>
      </Typography>
    </Box>

  );
};

export default Login;
