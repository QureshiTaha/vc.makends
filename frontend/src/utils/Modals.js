import { useState } from "react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";

function Modals({
  title,
  msg,
  show,
  setShow,
  successButtom = {},
  cancelButtom = {},
}) {
  const handleClose = () => setShow(false);

  return (
    <>
      <Modal show={show} onHide={handleClose} animation={false}>
        <Modal.Header closeButton>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{msg}</Modal.Body>
        <Modal.Footer>
          {cancelButtom.onClickfunc && cancelButtom.label ? (
            <Button variant="secondary" onClick={cancelButtom.onClickfunc}>
              {cancelButtom.label}
            </Button>
          ) : (
            <Button variant="secondary" onClick={handleClose}>
              Close
            </Button>
          )}
          {successButtom.onClickfunc && successButtom.label ? (
            <Button variant="primary" onClick={successButtom.onClickfunc}>
              {successButtom.label}
            </Button>
          ) : (
            ""
          )}
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default Modals;
