'use client';

import { useState } from 'react';

export default function TesterButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch('/api/tester', { method: 'POST' });
      if (res.ok) {
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className="btn-tester"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? 'Setting up...' : 'Try without signing up'}
    </button>
  );
}
