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
  Snackbar,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

const validateName = (value) => {
  const trimmed = value.trim();
  if (/<[^>]*>/g.test(trimmed)) {
    return { valid: false, message: "Invalid characters detected." };
  }
  const nameRegex = /^[a-zA-Z\s'-]+$/;
  if (!nameRegex.test(trimmed)) {
    return {
      valid: false,
      message:
        "Names can only contain letters, spaces, apostrophes, and hyphens.",
    };
  }
  if (trimmed.length < 1 || trimmed.length > 50) {
    return { valid: false, message: "Name must be between 1–50 characters." };
  }
  return { valid: true };
};

const Settings = ({ userEmail, onLogout }) => {
  const [formData, setFormData] = useState({
    id: "",
    email: "",
    firstName: "",
    lastName: "",
  });

  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [logoutSnackbar, setLogoutSnackbar] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(
          `http://localhost:8080/api/auth/user?email=${encodeURIComponent(
            userEmail
          )}`
        );

        const user = {
          id: data.id,
          email: data.email || "",
          firstName: data.firstName || "",
          lastName: data.lastName || "",
        };
        setFormData(user);
        setUserData(user);
        setError("");
      } catch (err) {
        console.error("Error fetching user:", err);
        setError(
          typeof err.response?.data === "string"
            ? err.response.data
            : err.response?.data?.error ||
                "Failed to load user data. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    if (userEmail) {
      fetchUser();
    } else {
      const localUser = JSON.parse(localStorage.getItem("user"));
      if (localUser) {
        setFormData(localUser);
        setUserData(localUser);
      }
      setLoading(false);
    }
  }, [userEmail]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "firstName" || name === "lastName") {
      const { valid } = validateName(value);
      if (!valid && value !== "") return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleEdit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const hasChanged =
      formData.firstName !== userData.firstName ||
      formData.lastName !== userData.lastName;

    if (hasChanged) {
      try {
        const payload = {
          firstName: formData.firstName,
          lastName: formData.lastName,
        };

        const { data } = await axios.patch(
          `http://localhost:8080/api/auth/user/${formData.id}`,
          payload
        );

        if (data === "User details updated successfully") {
          setSuccess("Profile updated successfully!");
          setUserData(formData); // Update baseline
          localStorage.setItem("user", JSON.stringify(formData));
          setIsEditing(false);
        } else {
          setError(data);
        }
      } catch (err) {
        console.error("Error updating user:", err);
        setError(
          typeof err.response?.data === "string"
            ? err.response.data
            : err.response?.data?.error ||
                "An error occurred while saving changes. Please try again."
        );
      }
    } else {
      setIsEditing((prev) => !prev);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("userId");
    localStorage.removeItem("userEmail");
    if (onLogout) onLogout();
    setLogoutSnackbar(true);
    setTimeout(() => {
      navigate("/login");
    }, 1500);
  };

  const handleCloseSnackbar = () => {
    setLogoutSnackbar(false);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const isSaveDisabled =
    !formData.firstName.trim() || !formData.lastName.trim();

  const fieldLabels = {
    email: "Email",
    firstName: "First Name",
    lastName: "Last Name",
  };

  return (
    <>
      <Box
        component="form"
        onSubmit={handleToggleEdit}
        noValidate
        sx={{
          mt: 4,
          maxWidth: 420,
          mx: "auto",
          p: 4,
          backgroundColor: isEditing ? "#fff5f5" : "white",
          borderRadius: 4,
          boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.1)",
          transition: "background-color 0.3s ease",
        }}
      >
        <Typography
          variant="h5"
          align="center"
          fontWeight={600}
          mb={3}
          color={isEditing ? "error.main" : "text.primary"}
        >
          Personal Settings
        </Typography>

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

        <Stack spacing={2.5}>
          {["email", "firstName", "lastName"].map((field) => {
            const isEmailField = field === "email";
            const label = fieldLabels[field];
            return (
              <TextField
                key={field}
                label={
                  isEmailField ? (
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      {label}
                    </Box>
                  ) : (
                    label
                  )
                }
                variant="standard"
                fullWidth
                name={field}
                type="text"
                value={formData[field]}
                onChange={handleInputChange}
                InputProps={{
                  readOnly: isEmailField ? true : !isEditing,
                  sx: isEmailField
                    ? {
                        "&:before, &:after": {
                          borderBottom: "none",
                        },
                        "&:hover:not(.Mui-disabled, .Mui-error):before": {
                          borderBottom: "none",
                        },
                        "& .MuiInputBase-input": {
                          cursor: "not-allowed",
                          color: "text.secondary",
                        },
                      }
                    : {},
                }}
                InputLabelProps={
                  isEmailField
                    ? {
                        sx: {
                          color: "#9e9e9e",
                          "&.Mui-focused": {
                            color: "#9e9e9e",
                          },
                          "&.Mui-error": { color: "#9e9e9e" },
                        },
                      }
                    : {}
                }
                required={!isEmailField}
                error={
                  (isEditing && !isEmailField && !formData[field].trim()) ||
                  !validateName(formData[field]).valid
                }
                helperText={
                  !isEmailField && isEditing && !formData[field].trim()
                    ? "This field is required"
                    : isEditing &&
                      !isEmailField &&
                      !validateName(formData[field]).valid
                    ? validateName(formData[field]).message
                    : ""
                }
              />
            );
          })}

          <Button
            type="submit"
            variant="contained"
            disabled={isEditing && isSaveDisabled}
            sx={{
              mt: 3,
              borderRadius: "30px",
              py: 1.5,
              fontWeight: "bold",
              backgroundColor: isEditing ? "#d32f2f" : "var(--color-primary)",
              transition: "background-color 0.3s ease, color 0.3s ease",
              color: "#fff",

              "&.Mui-disabled": {
                backgroundColor: "#bdbdbd !important",
                color: "#757575 !important",
                pointerEvents: "none",
                boxShadow: "none",
              },

              "&:hover": {
                backgroundColor: isEditing
                  ? "#b71c1c"
                  : "var(--color-primary-600)",
              },
            }}
          >
            {isEditing ? "Save" : "Edit"}
          </Button>

          <Button
            variant="outlined"
            color="error"
            onClick={handleSignOut}
            sx={{
              mt: 2,
              borderRadius: "30px",
              py: 1.2,
              fontWeight: "bold",
              borderWidth: 2,
              "&:hover": {
                borderWidth: 2,
                backgroundColor: "#fff5f5",
              },
            }}
          >
            Sign Out
          </Button>
        </Stack>
      </Box>

      <Snackbar
        open={logoutSnackbar}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity="success"
          sx={{ width: "100%" }}
        >
          You have been logged out successfully.
        </Alert>
      </Snackbar>
    </>
  );
};

export default Settings;
