import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NavbarComponent from "./navbar.js";

const mockNavigate = jest.fn();
const mockUseLocation = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useLocation: () => mockUseLocation(),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("NavbarComponent - Settings Tab", () => {
  it("renders Settings tab", () => {
    mockUseLocation.mockReturnValue({ pathname: "/" });

    render(
      <MemoryRouter>
        <NavbarComponent />
      </MemoryRouter>
    );

    expect(screen.getByText(/Settings/i)).toBeInTheDocument();
  });

  it("navigates to /settings when Settings tab is clicked", () => {
    mockUseLocation.mockReturnValue({ pathname: "/" });

    render(
      <MemoryRouter>
        <NavbarComponent />
      </MemoryRouter>
    );

    const settingsLink = screen.getByText(/Settings/i);
    fireEvent.click(settingsLink);

    expect(mockNavigate).toHaveBeenCalledWith("/settings");
  });

  it("applies active class when on /settings route", () => {
    mockUseLocation.mockReturnValue({ pathname: "/settings" });

    render(
      <MemoryRouter>
        <NavbarComponent />
      </MemoryRouter>
    );

    const settingsLink = screen.getByText(/Settings/i);
    expect(settingsLink).toHaveClass("active");
  });
});
