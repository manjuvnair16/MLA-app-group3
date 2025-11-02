import React from "react";
import { Navbar, Nav } from "react-bootstrap";
import {
  useNavigate,
  useLocation,
} from "react-router-dom"; /* MN_scrum_13 - active tab diff colour  added useLocation */

const NavbarComponent = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation(); // MN_scrum_13 - active tab colour

  const onNavigate = (route) => {
    console.log("Navigating to:", route);
    switch (route) {
      case "TrackExercise":
        navigate("/trackExercise");
        break;
      case "Statistics":
        navigate("/statistics");
        break;
      case "Journal":
        navigate("/journal");
        break;
      case "Settings":
        navigate("/settings");
        break;
      default:
        console.error("Invalid route:", route);
    }
  };

  return (
    <Navbar className="nav-back custom-navbar" expand="lg">
      <Navbar.Toggle aria-controls="basic-navbar-nav" />
      <Navbar.Collapse id="basic-navbar-nav">
        <Nav className="mr-auto">
          <Nav>
            <Nav.Link
              className={`custom-nav-link ${
                location.pathname === "/trackExercise" ? "active" : ""
              }`} // MN_scrum_13
              onClick={() => onNavigate("TrackExercise")}
            >
              Track New Exercise
            </Nav.Link>
            <Nav.Link
              className={`custom-nav-link ${
                location.pathname === "/statistics" ? "active" : ""
              }`} // MN_scrum_13
              onClick={() => onNavigate("Statistics")}
            >
              Statistics
            </Nav.Link>
            <Nav.Link
              className={`custom-nav-link ${
                location.pathname === "/journal" ? "active" : ""
              }`} // MN_scrum_13
              onClick={() => onNavigate("Journal")}
            >
              Journal
            </Nav.Link>
            <Nav.Link
              className={`custom-nav-link ${
                location.pathname === "/settings" ? "active" : ""
              }`}
              onClick={() => onNavigate("Settings")}
            >
              Settings
            </Nav.Link>
          </Nav>
        </Nav>
      </Navbar.Collapse>
    </Navbar>
  );
};

export default NavbarComponent;
