import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import '../Dashboard.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}
function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
}

function Staff() {
  const [checkingSession, setCheckingSession] = useState(true)
  const [staff, setStaff] = useState([])
  const [staffAttendanceToday, setStaffAttendanceToday] = useState({})
  const [loadingData, setLoadingData] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('teacher')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [markingAbsentId, setMarkingAbsentId] = useState(null)
  const [coverageChoice, setCoverageChoice] = useState({})
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate('/login')
        return
      }
      setCheckingSession(false)
      loadStaff()
    })
  }, [navigate])

  async function loadStaff() {
    setLoadingData(true)
    setLoadError('')

    const { data, error } = await supabase.from('profiles').select('*').order('created_at')
    if (error) {
      setLoadError(error.message)
      setLoadingData(false)
      return
    }
    setStaff(data)

    const { data: attData, error: attError } = await supabase
      .from('staff_attendance').select('*').eq('date', todayStr())
    if (!attError) {
      const map = {}
      ;(attData || []).forEach((a) => { map[a.profile_id] = a })
      setStaffAttendanceToday(map)
    }
    setLoadingData(false)
  }

  async function handleAdd(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccessMsg('')

    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token

    try {
      const res = await fetch(`${API_BASE}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ full_name: fullName, email, password, role }),
      })
      const result = await res.json()

      if (!res.ok) {
        setError(result.detail || 'Something went wrong.')
        setSaving(false)
        return
      }
      setSuccessMsg(`${fullName} added as ${role}.`)
      setFullName('')
      setEmail('')
      setPassword('')
      setRole('teacher')
      loadStaff()
    } catch (err) {
      setError('Could not reach the server. Is the backend running?')
    }
    setSaving(false)
  }

  async function markAbsent(profileId) {
    setMarkingAbsentId(profileId)
    setError('')
    const { data, error } = await supabase
      .from('staff_attendance')
      .upsert({ profile_id: profileId, date: todayStr(), marked_absent: true }, { onConflict: 'profile_id,date' })
      .select().single()

    if (error) setError(error.message)
    else setStaffAttendanceToday((prev) => ({ ...prev, [profileId]: data }))
    setMarkingAbsentId(null)
  }

  async function assignCoverage(profileId) {
    const coveringId = coverageChoice[profileId]
    if (!coveringId) return
    setError('')

    const { data, error } = await supabase
      .from('staff_attendance').update({ covered_by: coveringId })
      .eq('profile_id', profileId).eq('date', todayStr())
      .select().single()

    if (error) setError(error.message)
    else setStaffAttendanceToday((prev) => ({ ...prev, [profileId]: data }))
  }

  function attendanceStatusLabel(profileId) {
    const att = staffAttendanceToday[profileId]
    if (!att) return { label: 'Not checked in', cls: 'status-neutral' }
    if (att.marked_absent) return { label: 'Absent', cls: 'status-absent' }
    if (att.checked_out_at) return { label: `Out at ${formatTime(att.checked_out_at)}`, cls: 'status-neutral' }
    if (att.lunch_started_at && !att.lunch_ended_at) return { label: `On lunch since ${formatTime(att.lunch_started_at)}`, cls: 'status-lunch' }
    if (att.checked_in_at) return { label: `In since ${formatTime(att.checked_in_at)}`, cls: 'status-in' }
    return { label: 'Not checked in', cls: 'status-neutral' }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (checkingSession) return <div className="dashboard-loading">Loading…</div>

  return (
    <div className="dashboard-page">
      <header className="topbar">
        <div className="topbar-inner">
          <span className="brand-name">Paballong Dashboard</span>
          <nav className="dashboard-nav">
            <Link to="/dashboard">Registrations</Link>
            <Link to="/classrooms">Classrooms</Link>
            <Link to="/staff" className="active">Staff</Link>
            <Link to="/meetings">Meetings</Link>
          </nav>
          <button className="nav-cta" onClick={handleLogout}>Log out</button>
        </div>
      </header>

      <div className="dashboard-body">
        <h1>Staff</h1>

        <form className="inline-form" onSubmit={handleAdd}>
          <input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Temporary password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <select className="classroom-select" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="teacher">Teacher</option>
            <option value="registrar">Registrar</option>
            <option value="principal">Principal</option>
          </select>
          <button type="submit" className="cta-button" disabled={saving}>{saving ? 'Adding…' : 'Add staff member'}</button>
        </form>
        {error && <p className="form-error">{error}</p>}
        {successMsg && <p className="form-success">{successMsg}</p>}

        {loadingData && <p>Loading staff…</p>}
        {loadError && <p className="form-error">Couldn't load staff list: {loadError}</p>}
        {!loadingData && !loadError && staff.length === 0 && <p>No staff members yet.</p>}

        <div className="staff-list">
          {staff.map((s) => (
            <div key={s.id} className="staff-row">
              <span className="staff-name">{s.full_name}</span>
              <span className={`role-badge role-${s.role}`}>{s.role}</span>
            </div>
          ))}
        </div>

        <h2 className="section-heading">Today's Attendance</h2>
        <div className="staff-attendance-list">
          {staff.map((s) => {
            const att = staffAttendanceToday[s.id]
            const status = attendanceStatusLabel(s.id)
            const coveringPerson = att?.covered_by ? staff.find((x) => x.id === att.covered_by) : null
            return (
              <div key={s.id} className="staff-attendance-row">
                <span className="staff-name">{s.full_name}</span>
                <span className={`att-status-badge ${status.cls}`}>{status.label}</span>

                {att?.marked_absent && (
                  <div className="coverage-controls">
                    {coveringPerson ? (
                      <span className="covering-note">Covered by {coveringPerson.full_name}</span>
                    ) : (
                      <>
                        <select className="classroom-select" value={coverageChoice[s.id] || ''} onChange={(e) => setCoverageChoice((prev) => ({ ...prev, [s.id]: e.target.value }))}>
                          <option value="">Assign coverage…</option>
                          {staff.filter((x) => x.id !== s.id).map((x) => (
                            <option key={x.id} value={x.id}>{x.full_name}</option>
                          ))}
                        </select>
                        <button className="approve-btn" onClick={() => assignCoverage(s.id)} disabled={!coverageChoice[s.id]}>Assign</button>
                      </>
                    )}
                  </div>
                )}

                {!att?.checked_in_at && !att?.marked_absent && (
                  <button className="reject-btn" onClick={() => markAbsent(s.id)} disabled={markingAbsentId === s.id}>
                    {markingAbsentId === s.id ? 'Marking…' : 'Mark Absent'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Staff