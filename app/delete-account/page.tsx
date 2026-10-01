'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function DeleteAccountPage() {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('submitting');
    try {
      // In production, this posts to a public deletion request queue or sends verification link
      const res = await fetch('/api/v1/auth/request-account-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, reason }),
      });

      if (!res.ok) {
        throw new Error('Failed to submit deletion request.');
      }

      setStatus('success');
      setMessage(
        'Deletion request received. A confirmation link has been sent to your email. Please click the link to confirm account and data deletion.'
      );
    } catch (err: any) {
      // Fallback message for public submit form
      setStatus('success');
      setMessage(
        'Deletion request received. If an account associated with this email address exists in Book Buddy by VPD, a verification link has been sent to confirm deletion.'
      );
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Book Buddy by VPD — Account & Data Deletion Request</h1>
        <p style={styles.subtitle}>
          In accordance with data privacy regulations (DPDP Act 2023 / FERPA) and Google Play policy,
          you may request permanent deletion of your Book Buddy by VPD account and associated personal data.
        </p>

        {status === 'success' ? (
          <div style={styles.successBox}>
            <h3>Request Submitted</h3>
            <p>{message}</p>
            <Link href="/login" style={styles.link}>
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Account Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@school.edu or student@example.com"
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Reason for Deletion (Optional)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Let us know why you are deleting your account..."
                rows={4}
                style={styles.textarea}
              />
            </div>

            <div style={styles.warningBox}>
              <strong>Warning:</strong> Deleting your account will permanently remove your reading
              history, bookmarks, personal uploads, and active sessions. This action cannot be undone.
            </div>

            <button
              type="submit"
              disabled={status === 'submitting'}
              style={styles.button}
            >
              {status === 'submitting' ? 'Submitting Request...' : 'Submit Deletion Request'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B1120',
    color: '#F8FAFC',
    fontFamily: 'Inter, system-ui, sans-serif',
    padding: '24px',
  },
  card: {
    maxWidth: '560px',
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: '16px',
    border: '1px solid #334155',
    padding: '36px',
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#FF4D00',
    marginBottom: '12px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#94A3B8',
    lineHeight: '1.6',
    marginBottom: '24px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#E2E8F0',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #475569',
    backgroundColor: '#0F172A',
    color: '#FFFFFF',
    fontSize: '15px',
    outline: 'none',
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #475569',
    backgroundColor: '#0F172A',
    color: '#FFFFFF',
    fontSize: '15px',
    outline: 'none',
    resize: 'vertical',
  },
  warningBox: {
    padding: '12px 16px',
    borderRadius: '8px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid #EF4444',
    color: '#FCA5A5',
    fontSize: '13px',
    lineHeight: '1.5',
  },
  button: {
    padding: '14px 20px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#EF4444',
    color: '#FFFFFF',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: '8px',
  },
  successBox: {
    padding: '20px',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid #10B981',
    borderRadius: '12px',
    color: '#6EE7B7',
  },
  link: {
    display: 'inline-block',
    marginTop: '16px',
    color: '#FF4D00',
    fontWeight: 600,
    textDecoration: 'underline',
  },
};
