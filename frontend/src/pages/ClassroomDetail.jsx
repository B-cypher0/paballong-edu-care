import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import '../Dashboard.css'

function ClassroomDetail() {
  const { id } = useParams()
  const [checkingSession, setCheckingSession] = useState(true)
  const [classroom, setClassroom] = useState(null)
  const [kids, setKids] = useState([])
  const [teachers, setTeachers] = useState([])
  const [teacherChoice, setTeacherChoice] = useState('')
  const [loadingData, setLoadingData] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [assignError, setAssignError] = useState('')
  const [assigning, setAssigning] = useState(false)
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
  }, [id, navigate])

  async function loadAll() {
    setLoadingData(true)
    setLoadError('')

    const { data: classroomData, error: classroomError } = await supabase
      .from('classrooms').select('*').eq('id', id).single()
    const { data: kidsData, error: kidsError } = await supabase
      .from('kids').select('*').eq('classroom_id', id).order('full_name')
    const { data: teachersData, error: teachersError } = await supabase
      .from('profiles').select('*').eq('role', 'teacher').order('full_name')

    const firstError = classroomError || kidsError || teachersError
    if (firstError) {
      setLoadError(firstError.message)
    } else {
      setClassroom(classroomData)
      setKids(kidsData)
      setTeachers(teachersData)
      setTeacherChoice(classroomData.teacher_profile_id || '')
    }
    setLoadingData(false)
  }

  async function handleAssignTeacher() {
    setAssigning(true)
    setAssignError('')

    const { error } = await supabase
      .from('classrooms')
      .update({ teacher_profile_id: teacherChoice || null })
      .eq('id', id)

    if (error) {
      setAssignError(error.message)
    } else {
      setClassroom((prev) => ({ ...prev, teacher_profile_id: teacherChoice || null }))
    }
    setAssigning(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  function initials(name) {
    return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
  }

  function ageFromDob(dob) {
    const years = (Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    return years < 1 ? `${Math.floor(years * 12)} months` : `${Math.floor(years)} years`
  }

  const assignedTeacher = teachers.find((t) => t.id === classroom?.teacher_profile_id)

  if (checkingSession || loadingData) return <div className="dashboard-loading">Loading…</div>
  if (loadError) return <div className="dashboard-loading">Couldn't load this classroom: {loadError}</div>
  if (!classroom) return <div className="dashboard-loading">Classroom not found.</div>

  return (
    <div className="dashboard-page">
      <header className="topbar">
        <div className="topbar-inner">
          <span className="brand-name">Paballong Dashboard</span>
          <nav className="dashboard-nav">
            <Link to="/dashboard">Registrations</Link>
            <Link to="/classrooms" className="active">Classrooms</Link>
            <Link to="/staff">Staff</Link>
          </nav>
          <button className="nav-cta" onClick={handleLogout}>Log out</button>
        </div>
      </header>

      <div className="dashboard-body">
        <Link to="/classrooms" className="back-link">← All classrooms</Link>
        <h1>{classroom.name}</h1>
        {classroom.age_group && <p className="classroom-age" style={{ marginBottom: 16 }}>{classroom.age_group}</p>}

        <div className="teacher-assign-row">
          <span className="teacher-assign-label">
            {assignedTeacher ? `Teacher: ${assignedTeacher.full_name}` : 'No teacher assigned'}
          </span>
          <select
            className="classroom-select"
            value={teacherChoice}
            onChange={(e) => setTeacherChoice(e.target.value)}
          >
            <option value="">— No teacher —</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.full_name}</option>
            ))}
          </select>
          <button
            className="approve-btn"
            onClick={handleAssignTeacher}
            disabled={assigning || teacherChoice === (classroom.teacher_profile_id || '')}
          >
            {assigning ? 'Saving…' : 'Save'}
          </button>
        </div>
        {assignError && <p className="form-error">{assignError}</p>}

        {kids.length === 0 && <p>No kids enrolled in this classroom yet.</p>}

        <div className="roster-grid">
          {kids.map((k) => (
            <div key={k.id} className="roster-card">
              <div className="roster-avatar">
                {k.photo_url ? <img src={k.photo_url} alt={k.full_name} /> : <span>{initials(k.full_name)}</span>}
              </div>
              <div className="roster-info">
                <h3>{k.full_name}</h3>
                <p className="roster-age">{ageFromDob(k.dob)}</p>
                <p>{k.guardian_name} · {k.guardian_phone}</p>
                {k.medical_notes && <p className="roster-medical">⚠ {k.medical_notes}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ClassroomDetail