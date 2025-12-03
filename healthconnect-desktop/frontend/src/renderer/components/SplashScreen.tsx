import { useEffect, useState } from "react";

interface SplashScreenProps {
  duration?: number;
  onFinish?: () => void;
}

const SplashScreen = ({ duration = 5000, onFinish }: SplashScreenProps) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setVisible(false);
      onFinish?.();
    }, duration);
    return () => window.clearTimeout(timeout);
  }, [duration, onFinish]);

  return (
    <div className={`splash-screen ${visible ? "enter" : "leave"}`}>
      <div className="splash-content">
        <img src="/medlink_clean.png" alt="MedLink" />
      </div>
    </div>
  );
};

export default SplashScreen;
