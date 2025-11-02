import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import axios from "axios";
import { MemoryRouter } from "react-router-dom";
import Settings from "./settings.js";

jest.mock("axios");
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});
describe("Settings Component", () => {
  it("fetches and displays user data", async () => {
    axios.get.mockResolvedValue({
      data: {
        id: "1",
        email: "test@example.com",
        firstName: "Jane",
        lastName: "Doe",
      },
    });

    render(<Settings userEmail="test@example.com" />, {
      wrapper: MemoryRouter,
    });

    expect(await screen.findByDisplayValue("Jane")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Doe")).toBeInTheDocument();
    expect(screen.getByDisplayValue("test@example.com")).toBeInTheDocument();
  });

  it("toggles edit mode when clicking edit button", async () => {
    axios.get.mockResolvedValue({
      data: {
        id: "1",
        email: "test@example.com",
        firstName: "Jane",
        lastName: "Doe",
      },
    });

    render(<Settings userEmail="test@example.com" />, {
      wrapper: MemoryRouter,
    });

    const editBtn = await screen.findByRole("button", { name: /edit/i });
    fireEvent.click(editBtn);

    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
  });

  it("saves updated first/last name", async () => {
    axios.get.mockResolvedValue({
      data: {
        id: "1",
        email: "test@example.com",
        firstName: "Jane",
        lastName: "Doe",
      },
    });
    axios.patch.mockResolvedValue({
      data: "User details updated successfully",
    });

    render(<Settings userEmail="test@example.com" />, {
      wrapper: MemoryRouter,
    });

    await screen.findByDisplayValue("Jane");

    fireEvent.click(screen.getByText(/edit/i));

    const firstNameInput = screen.getByLabelText(/First Name/i);
    fireEvent.change(firstNameInput, { target: { value: "Janet" } });

    fireEvent.click(screen.getByText(/save/i));

    await waitFor(() =>
      expect(axios.patch).toHaveBeenCalledWith(
        "http://localhost:8080/api/auth/user/1",
        expect.objectContaining({ firstName: "Janet", lastName: "Doe" })
      )
    );

    expect(
      await screen.findByText(/Profile updated successfully/i)
    ).toBeInTheDocument();
  });

  it("handles API error gracefully", async () => {
    axios.get.mockResolvedValue({
      data: {
        id: "1",
        email: "test@example.com",
        firstName: "Jane",
        lastName: "Doe",
      },
    });
    axios.patch.mockRejectedValue({
      response: { data: "An error occurred while saving changes" },
    });

    render(<Settings userEmail="test@example.com" />, {
      wrapper: MemoryRouter,
    });

    await screen.findByDisplayValue("Jane");
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    const firstNameInput = screen.getByLabelText(/First Name/i);
    fireEvent.change(firstNameInput, { target: { value: "Janet" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    const alert = await waitFor(() => screen.findByRole("alert"));

    expect(within(alert).getByText(/An error occurred/i)).toBeInTheDocument();
  });

  it("navigates back to login page when signing out", async () => {
    jest.useFakeTimers();

    axios.get.mockResolvedValue({
      data: {
        id: "1",
        email: "test@test.com",
        firstName: "Jane",
        lastName: "Doe",
      },
    });
    render(<Settings userEmail="test@test.com" />, {
      wrapper: MemoryRouter,
    });
    await screen.findByDisplayValue("Jane");
    const signOutButton = screen.getByRole("button", { name: /Sign Out/i });
    fireEvent.click(signOutButton);
    jest.runAllTimers();
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
    expect(localStorage.length).toBe(0);
    jest.useRealTimers();
  });

  it("prevents invalid characters in name fields", async () => {
    axios.get.mockResolvedValue({
      data: {
        id: "1",
        email: "test@example.com",
        firstName: "Jane",
        lastName: "Doe",
      },
    });

    render(<Settings userEmail="test@example.com" />, {
      wrapper: MemoryRouter,
    });
    await screen.findByDisplayValue("Jane");
    fireEvent.click(screen.getByText(/edit/i));
    const firstNameInput = screen.getByLabelText(/First Name/i);
    fireEvent.change(firstNameInput, { target: { value: "Jane<>" } });

    expect(firstNameInput.value).toBe("Jane");
  });

  it("disables save button when name fields are empty", async () => {
    axios.get.mockResolvedValue({
      data: {
        id: "1",
        email: "test@example.com",
        firstName: "Jane",
        lastName: "Doe",
      },
    });

    render(<Settings userEmail="test@example.com" />, {
      wrapper: MemoryRouter,
    });

    await screen.findByDisplayValue("Jane");
    fireEvent.click(screen.getByText(/edit/i));
    fireEvent.change(screen.getByLabelText(/First Name/i), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText(/Last Name/i), {
      target: { value: "" },
    });

    const saveBtn = screen.getByRole("button", { name: /save/i });
    expect(saveBtn).toBeDisabled();
  });
});
