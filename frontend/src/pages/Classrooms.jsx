import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import '../Dashboard.css'

function Classrooms() {
  const [checkingSession, setCheckingSession] = useState(true)
  const [classrooms, setClassrooms] = useState([])
  const [kidCounts, setKidCounts] = useState({})
  const [teacherNames, setTeacherNames] = useState({})
  const [loadingData, setLoadingData] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [name, setName] = useState('')
  const [ageGroup, setAgeGroup] = useState('')
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
      loadClassrooms()
    })
  }, [navigate])

  async function loadClassrooms() {
    setLoadingData(true)
    setLoadError('')

    const { data: classroomData, error: classroomError } = await supabase
      .from('classrooms').select('*').order('created_at', { ascending: true })
    const { data: kidsData, error: kidsError } = await supabase.from('kids').select('classroom_id')
    const { data: teachersData, error: teachersError } = await supabase
      .from('profiles').select('id, full_name').eq('role', 'teacher')

    const firstError = classroomError || kidsError || teachersError
    if (firstError) {
      setLoadError(firstError.message)
    } else {
      setClassrooms(classroomData)

      const counts = {}
      kidsData.forEach((k) => { counts[k.classroom_id] = (counts[k.classroom_id] || 0) + 1 })
      setKidCounts(counts)

      const names = {}
      teachersData.forEach((t) => { names[t.id] = t.full_name })
      setTeacherNames(names)
    }
    setLoadingData(false)
  }

  async function handleAdd(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { error } = await supabase.from('classrooms').insert([{ name, age_group: ageGroup || null }])

    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }
    setName('')
    setAgeGroup('')
    setSaving(false)
    loadClassrooms()
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
            <Link to="/classrooms" className="active">Classrooms</Link>
            <Link to="/staff">Staff</Link>
            <Link to="/meetings">Meetings</Link>
          </nav>
          <button className="nav-cta" onClick={handleLogout}>Log out</button>
        </div>
      </header>

      <div className="dashboard-body">
        <h1>Classrooms</h1>

        <form className="inline-form" onSubmit={handleAdd}>
          <input placeholder="Classroom name (e.g. Sunflowers)" value={name} onChange={(e) => setName(e.target.value)} required />
          <input placeholder="Age group (e.g. 3-4 years)" value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} />
          <button type="submit" className="cta-button" disabled={saving}>{saving ? 'Adding…' : 'Add classroom'}</button>
        </form>
        {error && <p className="form-error">{error}</p>}

        {loadingData && <p>Loading…</p>}
        {loadError && <p className="form-error">Couldn't load classrooms: {loadError}</p>}
        {!loadingData && !loadError && classrooms.length === 0 && <p>No classrooms yet — add your first one above.</p>}

        <div className="classroom-grid">
          {classrooms.map((c) => (
            <Link to={`/classrooms/${c.id}`} key={c.id} className="classroom-card">
              <h3>{c.name}</h3>
              {c.age_group && <p className="classroom-age">{c.age_group}</p>}
              <p className="classroom-teacher">
                {c.teacher_profile_id ? (teacherNames[c.teacher_profile_id] || 'Teacher assigned') : 'No teacher assigned yet'}
              </p>
              <p className="classroom-count">{kidCounts[c.id] || 0} kid{kidCounts[c.id] === 1 ? '' : 's'} enrolled</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Classrooms