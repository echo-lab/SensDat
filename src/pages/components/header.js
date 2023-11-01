import React from "react";
import { Container, Navbar } from "react-bootstrap";
const Header = () => {
  return (
    <Navbar className="bg-top-nav" variant="dark" expand="lg">
      <Container>
        <Navbar.Brand href="home">Octave</Navbar.Brand>
      </Container>
    </Navbar>
  );
};

export default Header;
