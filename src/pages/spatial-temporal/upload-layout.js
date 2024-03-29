import React, { useState } from "react";

import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";

import { actions } from "./app-state.js";

// Constant to represent the 
const EXAMPLE_LAYOUT_PATH = `${process.env.PUBLIC_URL}/example-layout.jpg`;

export class SiteLayout {
  #url;
  #width;
  #height;
  #scale;

  constructor(url, width, height, scale) {
    this.#url = url;
    this.#width = width;
    this.#height = height;
    this.#scale = scale || 1.0;
  }

  withScale(scale) {
    return new SiteLayout(this.#url, this.#width, this.#height, scale);
  }

  get url() {
    return this.#url;
  }

  serialize() {
    return {
      dataUrl: this.#url,
      scale: this.#scale,
    };
  }

  idealSVGParams(maxWidth, maxHeight) {
    let x, y, width, height;
    if (this.#width / this.#height <= maxWidth / maxHeight) {
      height = maxHeight;
      width = (this.#width / this.#height) * height;
      x = (maxWidth - width) / 2;
      y = 0;
    } else {
      width = maxWidth;
      height = (this.#height / this.#width) * width;
      x = 0;
      y = (maxHeight - height) / 2;
    }
    let pad = (1.0 - this.#scale) / 2;
    x = x + width * pad;
    y = y + height * pad;
    width = width - 2 * width * pad;
    height = height - 2 * height * pad;
    return { x, y, width, height };
  }

  static async Deserialize(serializedObject) {
    let dataUrl, scale;
    if (typeof serializedObject === "object") {
      ({ dataUrl, scale = 1.0 } = serializedObject);
    } else {
      dataUrl = serializedObject;
    }

    const [width, height] = await new Promise((resolve) => {
      let img = new Image();
      img.onload = () => resolve([img.width, img.height]);
      img.src = dataUrl;
    });
    return new SiteLayout(dataUrl, width, height, scale);
  }

  static async FromFile(f) {
    const url = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(reader.result));
      reader.readAsDataURL(f);
    });
    return SiteLayout.Deserialize(url);
  }
}

export function UploadLayoutWidget({ dispatch }) {
  let [siteLayout, setSiteLayout] = useState(null);

  let onCancel = () => dispatch(actions.cancelUploadLayout());
  let onSubmit = () => dispatch(actions.finishUploadLayout(siteLayout));

  let uploadStepProps = { onCancel, setSiteLayout };
  let confirmStepProps = {
    onSubmit,
    onCancel: () => setSiteLayout(null),
    siteLayout,
  };

  return (
    <Modal
      show={true}
      onHide={onCancel}
      size={siteLayout ? "lg" : "xl"}
      backdrop="static"
    >
      <Modal.Header closeButton>
        <Modal.Title>Upload Site Layout</Modal.Title>
      </Modal.Header>
      {siteLayout === null ? (
        <UploadStep {...uploadStepProps} />
      ) : (
        <ConfirmStep {...confirmStepProps} />
      )}
    </Modal>
  );
}

// This returns a Modal.Body with a form for uploading a file.
function UploadStep({ onCancel, setSiteLayout }) {
  let [error, setError] = useState("");

  let onChange = async (e) => {
    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/svg+xml",
    ];
    let f = e.target.files[0];
    if (!validTypes.includes(f.type)) {
      setError("File format must be jpg, png, or svg.");
      console.log(f);
      return;
    }

    let siteLayout = await SiteLayout.FromFile(f);
    setSiteLayout(siteLayout);
  };

  let uploadExampleLayout = async () => {
    let response = await fetch(EXAMPLE_LAYOUT_PATH);
    let f = await response.blob();
    let siteLayout = await SiteLayout.FromFile(f);
    setSiteLayout(siteLayout);
  };

  return (
    <>
      <Modal.Body>
        <Form.Group controlId="formFile" className="mb-3">
          <Form.Label>Upload a site layout (png, jpeg, or svg)</Form.Label>
          <Form.Control
            type="file"
            onChange={(e) => onChange(e)}
            isInvalid={error !== ""}
          />
          {error === "" ? null : (
            <Form.Control.Feedback type="invalid">
              {error}
            </Form.Control.Feedback>
          )}
        </Form.Group>
        <p>
          Or use already-existing layout:
          <button
            type="button"
            class="btn btn-link"
            onClick={(e) => {
              e.preventDefault();
              uploadExampleLayout();
            }}
          >
            Use Example Layout
          </button>
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onCancel}>
          Cancel
        </Button>
      </Modal.Footer>
    </>
  );
}

function ConfirmStep({ onSubmit, onCancel, siteLayout }) {
  // TODO: Make the svg width/height related to the container?
  return (
    <>
      <Modal.Body>
        <Container>
          <h5> Layout Preview </h5>
          <svg
            width="100%"
            height="600"
            viewBox="0 0 800 500"
            xmlns="http://www.w3.org/2000/svg"
          >
            <image
              href={siteLayout.url}
              width="800"
              preserveAspectRatio={"xMidYMid meet"}
            />
          </svg>
        </Container>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onCancel}>
          Back
        </Button>
        <Button variant="primary" onClick={onSubmit}>
          Done
        </Button>
      </Modal.Footer>
    </>
  );
}
