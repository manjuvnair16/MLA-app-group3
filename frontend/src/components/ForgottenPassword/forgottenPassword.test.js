import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import axios from "axios";
import ForgotPassword from "./forgottenPassword";

jest.mock("axios");

const MockedForgotPassword = () => (
  <BrowserRouter>
    <ForgotPassword />
  </BrowserRouter>
);

describe("ForgotPassword Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders forgot password form", () => {
    render(<MockedForgotPassword />);

    expect(screen.getByText("Forgotten Password")).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send reset link/i })
    ).toBeInTheDocument();
  });

  test("displays success message on successful submission", async () => {
    axios.post.mockResolvedValueOnce({ status: 200 });

    render(<MockedForgotPassword />);

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole("button", {
      name: /send reset link/i,
    });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/password reset email sent/i)
      ).toBeInTheDocument();
    });

    expect(axios.post).toHaveBeenCalledWith(
      "http://localhost:8080/api/auth/send-reset-email",
      { email: "test@example.com" }
    );
  });

  test("displays error message on failed submission", async () => {
    axios.post.mockRejectedValueOnce({
      response: { data: { message: "User not found" } },
    });

    render(<MockedForgotPassword />);

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole("button", {
      name: /send reset link/i,
    });

    fireEvent.change(emailInput, {
      target: { value: "nonexistent@example.com" },
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("User not found")).toBeInTheDocument();
    });
  });

  test("disables submit button when email is empty", () => {
    render(<MockedForgotPassword />);

    const submitButton = screen.getByRole("button", {
      name: /send reset link/i,
    });
    expect(submitButton).toBeDisabled();
  });

  test("clears email field after successful submission", async () => {
    axios.post.mockResolvedValueOnce({ status: 200 });

    render(<MockedForgotPassword />);

    const emailInput = screen.getByLabelText(/email/i);

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(emailInput.value).toBe("");
    });
  });

  test('navigates to login page when "Back to Login" is clicked', () => {
    render(<MockedForgotPassword />);

    const loginLink = screen.getByRole("link", { name: /back to login/i });
    expect(loginLink).toHaveAttribute("href", "/login");
  });
});
