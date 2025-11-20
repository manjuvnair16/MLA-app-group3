import React, { useEffect, useState } from "react";
import axios from "axios";
import { Box, Typography, Button, CircularProgress, Alert } from "@mui/material";
import { useNavigate } from "react-router-dom";

const Verify = () => {
  const [status, setStatus] = useState(""); // verifying | success | error
  const [message, setMessage] = useState("");
  const [token, setToken] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailToken = params.get("token");
    if (!emailToken) {
      setStatus("error");
      setMessage("No verification token provided");
      return;
    }
    setToken(emailToken);
  }, []);

  const handleVerify = async () => {
    if (!token) return;
    setStatus("verifying");
    setMessage("");

    try {
      await axios.get(`http://localhost:8080/api/auth/verify?token=${encodeURIComponent(token)}`);
      setStatus("success");
      setMessage("Email verified successfully! Please log in.");
    } catch (err) {
      setStatus("error");
      setMessage("Verification failed: " + 
          (err.response?.data?.message || "Something went wrong. Please try again."));
    }
  }


  if (status === "verifying") {
    return (
      <Box sx={{ textAlign: "center" }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>
          Verifying your email...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ textAlign: "center" }}>
      {status === "success" ? (
        <>
          <Alert 
            severity="success" 
            sx={{ mb: 2 }}
          >
            {message}
          </Alert>
          <Button 
            variant="contained" 
            onClick={() => navigate("/login")}
          >
            Go to login
          </Button>
        </>
      ) : status === "error" && !token ? (
        <>
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
          >
            {message}
          </Alert>
          <Button 
            variant="contained" 
            onClick={() => navigate("/signup")}
          >
            Back to signup
          </Button>
        </>
      ) : (
        <>
          {status === "error" && (
            <Alert 
              severity="error" 
              sx={{ mb: 2 }}
            >
              {message}
            </Alert>
          )}
          <Typography sx={{ mb: 2 }}>
            Click the button below to verify your email.
          </Typography>
          <Button 
            variant="contained" 
            onClick={handleVerify} 
            disabled={!token || status === "verifying"}
          >
            Verify email
          </Button>
        </>
      )}
    </Box>
  );
};

export default Verify;