"use client";

import { useEffect, useState } from "react";

type AutoDismissNoticeProps = {
  message: string | null;
  durationMs?: number;
};

export default function AutoDismissNotice({
  message,
  durationMs = 5000
}: AutoDismissNoticeProps) {
  const [visible, setVisible] = useState(Boolean(message));

  useEffect(() => {
    setVisible(Boolean(message));
    if (!message) {
      return;
    }

    const timer = window.setTimeout(() => {
      setVisible(false);
    }, durationMs);

    return () => window.clearTimeout(timer);
  }, [message, durationMs]);

  if (!message || !visible) {
    return null;
  }

  return <div className="card notice-success">{message}</div>;
}
