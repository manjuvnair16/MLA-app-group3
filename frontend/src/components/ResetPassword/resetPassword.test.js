import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import ResetPassword from "./resetPassword";

jest.mock("axios");

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams("token=valid-token")],
}));

describe("ResetPassword Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("submits new password successfully", async () => {
    axios.post.mockResolvedValueOnce({ status: 200 });

    render(
      <MemoryRouter initialEntries={["/reset-password?token=valid-token"]}>
        <ResetPassword />
      </MemoryRouter>
    );

    const passwordInput = screen.getByLabelText(/^new password/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole("button", {
      name: /reset password/i,
    });

    fireEvent.change(passwordInput, { target: { value: "NewPassword123!" } });
    fireEvent.change(confirmInput, { target: { value: "NewPassword123!" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "http://localhost:8080/api/auth/reset-password",
        {
          token: "valid-token",
          newPassword: "NewPassword123!",
        }
      );
    });
  });

  test("shows error when passwords do not match", () => {
    render(
      <MemoryRouter initialEntries={["/reset-password?token=valid-token"]}>
        <ResetPassword />
      </MemoryRouter>
    );

    const passwordInput = screen.getByLabelText(/^new password/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);
    const submitButton = screen.getByRole("button", {
      name: /reset password/i,
    });

    fireEvent.change(passwordInput, { target: { value: "Password123!" } });
    fireEvent.change(confirmInput, {
      target: { value: "DifferentPassword123!" },
    });
    fireEvent.click(submitButton);

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();
  });
});
