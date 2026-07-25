import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import '../Dashboard.css'

function Meetings() {
  const [checkingSession, setCheckingSession] = useState(true)
  const [teachers, setTeachers] = useState([])
  const [meetings, setMeetings] = useState([])
  const [recipientsByMeeting, setRecipientsByMeeting] = useState({})
  const [loadingData, setLoadingData] = useState(false)
  const [loadError, setLoadError] = useState('')

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [meetingDate, setMeetingDate] = useState('')
  const [sendToAll, setSendToAll] = useState(true)
  const [selectedTeachers, setSelectedTeachers] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate('/login')
        return
      }
      setCheckingSession(false)
      loadAll()
    })
  }, [navigate])

  async function loadAll() {
    setLoadingData(true)
    setLoadError('')

    const { data: teachersData, error: teachersError } = await supabase
      .from('profiles').select('*').eq('role', 'teacher').order('full_name')
    const { data: meetingsData, error: meetingsError } = await supabase
      .from('meetings').select('*').order('created_at', { ascending: false })

    const firstError = teachersError || meetingsError
    if (firstError) {
      setLoadError(firstError.message)
      setLoadingData(false)
      return
    }

    setTeachers(teachersData)
    setMeetings(meetingsData)

    if (meetingsData.length > 0) {
      const meetingIds = meetingsData.map((m) => m.id)
      const { data: recipientsData } = await supabase
        .from('meeting_recipients').select('*').in('meeting_id', meetingIds)

      const map = {}
      ;(recipientsData || []).forEach((r) => {
        if (!map[r.meeting_id]) map[r.meeting_id] = []
        map[r.meeting_id].push(r.profile_id)
      })
      setRecipientsByMeeting(map)
    }
    setLoadingData(false)
  }

  function toggleTeacher(id) {
    setSelectedTeachers((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!sendToAll && selectedTeachers.length === 0) {
      setError('Pick at least one teacher, or switch to "All teachers".')
      return
    }
    setSaving(true)
    setError('')

    const { data: sessionData } = await supabase.auth.getSession()
    const userId = sessionData.session?.user.id

    const { data: newMeeting, error: meetingError } = await supabase
      .from('meetings')
      .insert([{
        title,
        body,
        meeting_date: meetingDate ? new Date(meetingDate).toISOString() : null,
        send_to_all: sendToAll,
        created_by: userId,
      }])
      .select()
      .single()

    if (meetingError) {
      setError(meetingError.message)
      setSaving(false)
      return
    }

    if (!sendToAll) {
      const rows = selectedTeachers.map((teacherId) => ({ meeting_id: newMeeting.id, profile_id: teacherId }))
      const { error: recipientsError } = await supabase.from('meeting_recipients').insert(rows)
      if (recipientsError) {
        setError(`Meeting created, but couldn't set recipients: ${recipientsError.message}`)
        setSaving(false)
        return
      }
    }

    setTitle('')
    setBody('')
    setMeetingDate('')
    setSendToAll(true)
    setSelectedTeachers([])
    setSaving(false)
    loadAll()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  function recipientSummary(meeting) {
    if (meeting.send_to_all) return 'All teachers'
    const ids = recipientsByMeeting[meeting.id] || []
    const names = ids.map((id) => teachers.find((t) => t.id === id)?.full_name).filter(Boolean)
    return names.length > 0 ? names.join(', ') : 'No recipients set'
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
            <Link to="/staff">Staff</Link>
            <Link to="/meetings" className="active">Meetings</Link>
          </nav>
          <button className="nav-cta" onClick={handleLogout}>Log out</button>
        </div>
      </header>

      <div className="dashboard-body">
        <h1>Meetings & Announcements</h1>

        <form className="meeting-form" onSubmit={handleSend}>
          <label>Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label>Message
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows="3" required />
          </label>
          <label>Date & time (optional — leave blank for a general announcement)
            <input type="datetime-local" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
          </label>

          <div className="recipient-toggle">
            <button type="button" className={`toggle-btn ${sendToAll ? 'active' : ''}`} onClick={() => setSendToAll(true)}>All teachers</button>
            <button type="button" className={`toggle-btn ${!sendToAll ? 'active' : ''}`} onClick={() => setSendToAll(false)}>Select teachers</button>
          </div>

          {!sendToAll && (
            <div className="teacher-checklist">
              {teachers.length === 0 && <p>No teachers yet — add some on the Staff page first.</p>}
              {teachers.map((t) => (
                <label key={t.id} className="teacher-check-row">
                  <input type="checkbox" checked={selectedTeachers.includes(t.id)} onChange={() => toggleTeacher(t.id)} />
                  {t.full_name}
                </label>
              ))}
            </div>
          )}

          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="cta-button" disabled={saving}>{saving ? 'Sending…' : 'Send'}</button>
        </form>

        <h2 className="section-heading">Sent</h2>
        {loadingData && <p>Loading…</p>}
        {loadError && <p className="form-error">Couldn't load meetings: {loadError}</p>}
        {!loadingData && !loadError && meetings.length === 0 && <p>Nothing sent yet.</p>}

        <div className="meeting-list">
          {meetings.map((m) => (
            <div key={m.id} className="meeting-card">
              <div className="meeting-card-header">
                <h3>{m.title}</h3>
                {m.meeting_date && (
                  <span className="meeting-date-badge">
                    {new Date(m.meeting_date).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                )}
              </div>
              <p>{m.body}</p>
              <p className="meeting-recipients">To: {recipientSummary(m)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Meetings