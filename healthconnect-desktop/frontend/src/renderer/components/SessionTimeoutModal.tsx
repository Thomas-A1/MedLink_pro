import Modal from "./Modal";

interface SessionTimeoutModalProps {
  isOpen: boolean;
  secondsRemaining: number;
  onStaySignedIn: () => void;
  onSignOut: () => void;
}

const SessionTimeoutModal = ({
  isOpen,
  secondsRemaining,
  onStaySignedIn,
  onSignOut,
}: SessionTimeoutModalProps) => (
  <Modal
    isOpen={isOpen}
    onClose={onSignOut}
    title="Session timing out"
    width="480px"
  >
    <div className="timeout-modal">
      <p>
        For security, we sign out MedLink sessions after a period of inactivity.
        We haven&apos;t noticed any activity for a while. Your session will end
        automatically in <strong>{secondsRemaining}</strong>{" "}
        {secondsRemaining === 1 ? "second" : "seconds"}.
      </p>
      <div className="timeout-actions">
        <button type="button" className="ghost-button" onClick={onSignOut}>
          Sign out now
        </button>
        <button
          type="button"
          className="primary-button"
          onClick={onStaySignedIn}
        >
          Stay signed in
        </button>
      </div>
    </div>
  </Modal>
);

export default SessionTimeoutModal;
