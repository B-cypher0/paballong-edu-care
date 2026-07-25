import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import '../Dashboard.css'

function Dashboard() {
  const [session, setSession] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [registrations, setRegistrations] = useState([])
  const [classrooms, setClassrooms] = useState([])
  const [loadingData, setLoadingData] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [classroomChoice, setClassroomChoice] = useState({})
  const [actionError, setActionError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate('/login')
        return
      }
      setSession(data.session)
      setCheckingSession(false)
    })
  }, [navigate])

  useEffect(() => {
    if (!session) return
    loadRegistrations()
    loadClassrooms()
  }, [session])

  async function loadRegistrations() {
    setLoadingData(true)
    setLoadError('')
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .order('submitted_at', { ascending: false })

    if (error) {
      setLoadError(error.message)
    } else {
      setRegistrations(data)
    }
    setLoadingData(false)
  }

  async function loadClassrooms() {
    const { data, error } = await supabase.from('classrooms').select('*').order('name')
    if (!error) setClassrooms(data)
  }

  async function handleApprove(registration) {
    const classroomId = classroomChoice[registration.id]
    if (!classroomId) return
    setActionError('')

    const { error: kidError } = await supabase.from('kids').insert([{
      registration_id: registration.id,
      full_name: registration.child_full_name,
      dob: registration.child_dob,
      classroom_id: classroomId,
      guardian_name: registration.guardian_name,
      guardian_phone: registration.guardian_phone,
      guardian_email: registration.guardian_email,
      medical_notes: registration.medical_notes,
      emergency_contact_name: registration.emergency_contact_name,
      emergency_contact_phone: registration.emergency_contact_phone,
    }])

    if (kidError) {
      setActionError(`Couldn't enrol: ${kidError.message}`)
      return
    }

    const { error: regError } = await supabase
      .from('registrations')
      .update({ status: 'approved' })
      .eq('id', registration.id)

    if (regError) {
      setActionError(`Enrolled, but couldn't update status: ${regError.message}`)
      return
    }

    setRegistrations((prev) =>
      prev.map((r) => (r.id === registration.id ? { ...r, status: 'approved' } : r))
    )
  }

  async function handleReject(id) {
    setActionError('')
    const { error } = await supabase
      .from('registrations')
      .update({ status: 'rejected' })
      .eq('id', id)

    if (error) {
      setActionError(error.message)
    } else {
      setRegistrations((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'rejected' } : r)))
    }
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
            <Link to="/dashboard" className="active">Registrations</Link>
            <Link to="/classrooms">Classrooms</Link>
            <Link to="/staff">Staff</Link>
            <Link to="/meetings">Meetings</Link>
          </nav>
          <button className="nav-cta" onClick={handleLogout}>Log out</button>
        </div>
      </header>

      <div className="dashboard-body">
        <h1>Registrations</h1>
        {loadingData && <p>Loading…</p>}
        {loadError && <p className="form-error">Couldn't load registrations: {loadError}</p>}
        {!loadingData && !loadError && registrations.length === 0 && <p>No registrations yet.</p>}
        {actionError && <p className="form-error">{actionError}</p>}

        <div className="reg-list">
          {registrations.map((r) => (
            <div key={r.id} className={`reg-card status-${r.status}`}>
              <div className="reg-card-header">
                <h3>{r.child_full_name}</h3>
                <span className="status-badge">{r.status}</span>
              </div>
              <p><strong>DOB:</strong> {r.child_dob}</p>
              <p><strong>Guardian:</strong> {r.guardian_name} · {r.guardian_phone}</p>
              {r.guardian_email && <p><strong>Email:</strong> {r.guardian_email}</p>}
              {r.medical_notes && <p><strong>Medical notes:</strong> {r.medical_notes}</p>}
              <p className="reg-date">Submitted {new Date(r.submitted_at).toLocaleDateString()}</p>

              {r.status === 'pending' && (
                <div className="reg-actions">
                  <select
                    className="classroom-select"
                    value={classroomChoice[r.id] || ''}
                    onChange={(e) =>
                      setClassroomChoice((prev) => ({ ...prev, [r.id]: e.target.value }))
                    }
                  >
                    <option value="">Select classroom…</option>
                    {classrooms.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button
                    className="approve-btn"
                    onClick={() => handleApprove(r)}
                    disabled={!classroomChoice[r.id]}
                  >
                    Approve & Enrol
                  </button>
                  <button className="reject-btn" onClick={() => handleReject(r.id)}>Reject</button>
                </div>
              )}

              {r.status === 'approved' && <p className="enrolled-note">✓ Enrolled</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Dashboard