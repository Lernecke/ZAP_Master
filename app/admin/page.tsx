'use client'

import React, { useState, useEffect } from 'react'
import {
  checkAdminAuthAction,
  loginAdminAction,
  logoutAdminAction,
  getAdminPaymentsDataAction,
  getAdminUsersDataAction,
  manuallyMarkPaymentSucceededAction,
  type AdminPaymentRecord,
  type AdminUserRecord,
} from './actions'

export default function AdminDashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [passwordInput, setPasswordInput] = useState('')
  const [authError, setAuthError] = useState('')

  const [activeTab, setActiveTab] = useState<'payments' | 'users'>('payments')
  
  const [paymentSearch, setPaymentSearch] = useState('')
  const [payments, setPayments] = useState<AdminPaymentRecord[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)

  const [userSearch, setUserSearch] = useState('')
  const [users, setUsers] = useState<AdminUserRecord[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  const [updatingPaymentId, setUpdatingPaymentId] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  async function fetchPayments(query: string) {
    setLoadingPayments(true)
    const res = await getAdminPaymentsDataAction(query)
    if (res.payments) {
      setPayments(res.payments)
    }
    setLoadingPayments(false)
  }

  async function fetchUsers(query: string) {
    setLoadingUsers(true)
    const res = await getAdminUsersDataAction(query)
    if (res.users) {
      setUsers(res.users)
    }
    setLoadingUsers(false)
  }

  useEffect(() => {
    checkAdminAuthAction().then((authed) => {
      setIsAuthenticated(authed)
      if (authed) {
        fetchPayments('')
        fetchUsers('')
      }
    })
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    const res = await loginAdminAction(passwordInput)
    if (res.success) {
      setIsAuthenticated(true)
      fetchPayments('')
      fetchUsers('')
    } else {
      setAuthError(res.error || 'Login fehlgeschlagen')
    }
  }

  const handleLogout = async () => {
    await logoutAdminAction()
    setIsAuthenticated(false)
    setPasswordInput('')
  }

  const handlePaymentSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchPayments(paymentSearch)
  }

  const handleUserSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchUsers(userSearch)
  }

  const handleManualMarkSucceeded = async (paymentId: string) => {
    if (!confirm('Möchtest du diese Zahlung wirklich manuell als "succeeded" (Bezahlt) markieren?')) {
      return
    }

    setUpdatingPaymentId(paymentId)
    setActionMessage(null)

    const res = await manuallyMarkPaymentSucceededAction(paymentId)

    if (res.success) {
      setActionMessage(`Zahlung ${paymentId.slice(0, 8)}... wurde erfolgreich als Bezahlt (succeeded) markiert.`)
      await fetchPayments(paymentSearch)
      await fetchUsers(userSearch)
    } else {
      alert(`Fehler: ${res.error || 'Aktion fehlgeschlagen'}`)
    }

    setUpdatingPaymentId(null)
  }

  if (isAuthenticated === null) {
    return <div style={{ padding: '20px', fontFamily: 'monospace' }}>Prüfe Authentifizierung...</div>
  }

  if (!isAuthenticated) {
    return (
      <div style={{ padding: '40px', maxWidth: '400px', margin: '40px auto', fontFamily: 'sans-serif', border: '1px solid #ccc' }}>
        <h2>Admin Dashboard Login</h2>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ fontSize: '14px' }}>Passwort (ADMIN_PAYMENTS_PASSWORD):</label>
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            style={{ padding: '8px', border: '1px solid #999' }}
            placeholder="Passwort eingeben..."
            autoFocus
          />
          {authError && <div style={{ color: 'red', fontSize: '13px' }}>{authError}</div>}
          <button type="submit" style={{ padding: '8px', cursor: 'pointer' }}>Anmelden</button>
        </form>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#fff', color: '#000', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #333', paddingBottom: '10px', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px' }}>Admin Dashboard (/admin)</h1>
          <span style={{ fontSize: '12px', color: '#666' }}>Passwortgeschützter Bereich (Env) — Zahlungen &amp; Benutzer</span>
        </div>
        <button onClick={handleLogout} style={{ padding: '6px 12px', cursor: 'pointer', background: '#eee', border: '1px solid #999' }}>
          Abmelden
        </button>
      </div>

      {actionMessage && (
        <div style={{ padding: '10px', background: '#d4edda', color: '#155724', border: '1px solid #c3e6cb', marginBottom: '15px', borderRadius: '4px' }}>
          {actionMessage}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('payments')}
          style={{
            padding: '8px 16px',
            cursor: 'pointer',
            fontWeight: activeTab === 'payments' ? 'bold' : 'normal',
            border: '1px solid #333',
            background: activeTab === 'payments' ? '#333' : '#fff',
            color: activeTab === 'payments' ? '#fff' : '#000',
          }}
        >
          Zahlungen ({payments.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '8px 16px',
            cursor: 'pointer',
            fontWeight: activeTab === 'users' ? 'bold' : 'normal',
            border: '1px solid #333',
            background: activeTab === 'users' ? '#333' : '#fff',
            color: activeTab === 'users' ? '#fff' : '#000',
          }}
        >
          Benutzer ({users.length})
        </button>
      </div>

      {/* PAYMENTS TAB */}
      {activeTab === 'payments' && (
        <div>
          {/* Search Box */}
          <form onSubmit={handlePaymentSearchSubmit} style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
            <input
              type="text"
              value={paymentSearch}
              onChange={(e) => setPaymentSearch(e.target.value)}
              placeholder="Suche in Zahlungen (E-Mail, User-ID, Session-ID, Status, Betrag)..."
              style={{ flex: 1, padding: '8px', border: '1px solid #999' }}
            />
            <button type="submit" style={{ padding: '8px 16px', cursor: 'pointer' }}>Suchen</button>
            <button
              type="button"
              onClick={() => {
                setPaymentSearch('')
                fetchPayments('')
              }}
              style={{ padding: '8px 12px', cursor: 'pointer' }}
            >
              Zurücksetzen
            </button>
          </form>

          {loadingPayments ? (
            <div>Lade Zahlungen...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }} border={1} cellPadding={6}>
              <thead>
                <tr style={{ background: '#eee' }}>
                  <th>Datum</th>
                  <th>Betrag</th>
                  <th>Status</th>
                  <th>Methode</th>
                  <th>Zugehöriger Benutzer / Kontakt</th>
                  <th>Zahlungs-ID &amp; Details</th>
                  <th>Aktion (Manuell)</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>Keine Zahlungen gefunden.</td>
                  </tr>
                ) : (
                  payments.map((p) => {
                    const formattedDate = new Date(p.created_at).toLocaleString('de-CH')
                    const amount = (p.amount_rappen / 100).toFixed(2)
                    const customerEmail = typeof p.metadata?.customer_email === 'string' ? p.metadata.customer_email : null

                    return (
                      <tr key={p.id}>
                        <td>{formattedDate}</td>
                        <td><strong>{p.currency.toUpperCase()} {amount}</strong></td>
                        <td>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '3px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            background: p.status === 'succeeded' ? '#d4edda' : p.status === 'pending' ? '#fff3cd' : '#f8d7da',
                            color: p.status === 'succeeded' ? '#155724' : p.status === 'pending' ? '#856404' : '#721c24'
                          }}>
                            {p.status}
                          </span>
                        </td>
                        <td>{p.payment_method_types?.join(', ') || 'card, twint'}</td>
                        <td>
                          {p.user ? (
                            <div>
                              <div><strong>{p.user.name || 'Kein Name'}</strong></div>
                              <div style={{ color: '#333' }}>{p.user.email || customerEmail || 'Keine E-Mail'}</div>
                              <div style={{ fontSize: '10px', color: '#666' }}>ID: {p.user.id} ({p.user.source || 'User'})</div>
                            </div>
                          ) : customerEmail ? (
                            <div>
                              <div><strong>Gast / Kontakt:</strong> {customerEmail}</div>
                              <div style={{ fontSize: '10px', color: '#666' }}>User-ID: {p.user_id || 'Gast'}</div>
                            </div>
                          ) : (
                            <div style={{ color: '#666' }}>
                              <div>User-ID: {p.user_id || 'Keine'}</div>
                              {p.anmeldung_id && <div>Anmeldung: {p.anmeldung_id}</div>}
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                          <div>ID: {p.id}</div>
                          {p.stripe_checkout_session_id && <div>Session: {p.stripe_checkout_session_id}</div>}
                          {p.stripe_payment_intent_id && <div>Intent: {p.stripe_payment_intent_id}</div>}
                        </td>
                        <td>
                          {p.status !== 'succeeded' ? (
                            <button
                              onClick={() => handleManualMarkSucceeded(p.id)}
                              disabled={updatingPaymentId === p.id}
                              style={{
                                padding: '4px 8px',
                                fontSize: '11px',
                                background: '#28a745',
                                color: '#fff',
                                border: 'none',
                                cursor: 'pointer',
                                borderRadius: '3px',
                              }}
                            >
                              {updatingPaymentId === p.id ? 'Wird aktualisiert...' : 'Als "Bezahlt" markieren'}
                            </button>
                          ) : (
                            <span style={{ fontSize: '11px', color: 'green' }}>✓ Bezahlt</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div>
          {/* User Search Box */}
          <form onSubmit={handleUserSearchSubmit} style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Suche nach Benutzern (Name, E-Mail, Rolle, User-ID)..."
              style={{ flex: 1, padding: '8px', border: '1px solid #999' }}
            />
            <button type="submit" style={{ padding: '8px 16px', cursor: 'pointer' }}>Suchen</button>
            <button
              type="button"
              onClick={() => {
                setUserSearch('')
                fetchUsers('')
              }}
              style={{ padding: '8px 12px', cursor: 'pointer' }}
            >
              Zurücksetzen
            </button>
          </form>

          {loadingUsers ? (
            <div>Lade Benutzer...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }} border={1} cellPadding={6}>
              <thead>
                <tr style={{ background: '#eee' }}>
                  <th>User ID</th>
                  <th>Name</th>
                  <th>E-Mail</th>
                  <th>Rolle / Typ</th>
                  <th>Quelle</th>
                  <th>Registriert am</th>
                  <th>Anzahl Zahlungen</th>
                  <th>Gesamtsumme Bezahlt</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '20px' }}>Keine Benutzer gefunden.</td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const regDate = u.created_at ? new Date(u.created_at).toLocaleDateString('de-CH') : '-'
                    const sumChf = (u.succeeded_amount_rappen / 100).toFixed(2)

                    return (
                      <tr key={u.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{u.id}</td>
                        <td><strong>{u.name || '-'}</strong></td>
                        <td>{u.email || '-'}</td>
                        <td><span style={{ background: '#eee', padding: '2px 6px', borderRadius: '3px' }}>{u.role}</span></td>
                        <td><span style={{ fontSize: '11px', color: '#555' }}>{u.source || 'User'}</span></td>
                        <td>{regDate}</td>
                        <td>{u.total_payments_count}</td>
                        <td><strong>CHF {sumChf}</strong></td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
