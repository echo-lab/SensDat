import React from "react";
import { Container, Navbar } from "react-bootstrap";
import { Link } from "react-router-dom";
import "../../styles/components/header.css";
const Header = () => {
  return (
    <Navbar className="bg-top-nav" variant="dark" expand="lg">
      <Container>
        <Link className="Header-Logo" to="/home">
          Octave
        </Link>
        <div className="Menu">
          <Link className="Menu-Logo" to="/home">
            Home
          </Link>
          <Link className="Menu-Logo" to="/about">
            About
          </Link>
          <Link className="Menu-Logo" to="/spatial-temporal">
            Sensdat
          </Link>
        </div>
      </Container>
    </Navbar>
  );
};

export default Header;
