import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import '../Dashboard.css'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}
function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
}

function TeacherHome() {
  const [checkingSession, setCheckingSession] = useState(true)
  const [classroom, setClassroom] = useState(null)
  const [kids, setKids] = useState([])
  const [attendance, setAttendance] = useState({})
  const [tasks, setTasks] = useState([])
  const [taskScores, setTaskScores] = useState({})
  const [meetings, setMeetings] = useState([])
  const [myAttendance, setMyAttendance] = useState(null)
  const [attendanceActionLoading, setAttendanceActionLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [savingKidId, setSavingKidId] = useState(null)
  const [savingScoreKey, setSavingScoreKey] = useState(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskCategory, setNewTaskCategory] = useState('')
  const [creatingTask, setCreatingTask] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate('/login')
        return
      }
      loadAll(data.session.user.id)
    })
  }, [navigate])

  async function loadAll(userId) {
    setLoadingData(true)
    setLoadError('')

    const { data: myAttData } = await supabase
      .from('staff_attendance').select('*').eq('profile_id', userId).eq('date', todayStr()).maybeSingle()
    setMyAttendance(myAttData || null)

    const { data: meetingsData, error: meetingsError } = await supabase
      .from('meetings').select('*').order('created_at', { ascending: false })
    if (!meetingsError) setMeetings(meetingsData)

    const { data: classroomsData, error: classroomError } = await supabase
      .from('classrooms').select('*').eq('teacher_profile_id', userId)

    if (classroomError) {
      setLoadError(classroomError.message)
      setCheckingSession(false)
      setLoadingData(false)
      return
    }

    const myClassroom = classroomsData && classroomsData.length > 0 ? classroomsData[0] : null
    setClassroom(myClassroom)

    if (myClassroom) {
      const { data: kidsData, error: kidsError } = await supabase
        .from('kids').select('*').eq('classroom_id', myClassroom.id).order('full_name')

      if (kidsError) {
        setLoadError(kidsError.message)
        setCheckingSession(false)
        setLoadingData(false)
        return
      }
      setKids(kidsData)

      const { data: attendanceData } = await supabase
        .from('attendance').select('*').eq('classroom_id', myClassroom.id).eq('date', todayStr())
      const attMap = {}
      ;(attendanceData || []).forEach((a) => { attMap[a.kid_id] = a.status })
      setAttendance(attMap)

      const { data: tasksData } = await supabase
        .from('tasks').select('*').eq('classroom_id', myClassroom.id).eq('date', todayStr()).order('created_at')
      setTasks(tasksData || [])

      if (tasksData && tasksData.length > 0) {
        const taskIds = tasksData.map((t) => t.id)
        const { data: scoresData } = await supabase.from('task_scores').select('*').in('task_id', taskIds)
        const scoreMap = {}
        ;(scoresData || []).forEach((s) => {
          if (!scoreMap[s.task_id]) scoreMap[s.task_id] = {}
          scoreMap[s.task_id][s.kid_id] = s.score
        })
        setTaskScores(scoreMap)
      } else {
        setTaskScores({})
      }
    }

    setCheckingSession(false)
    setLoadingData(false)
  }

  async function getUserId() {
    const { data } = await supabase.auth.getSession()
    if (!data.session) {
      setActionError('Your session has expired — log out and back in.')
      return null
    }
    return data.session.user.id
  }

  async function handleCheckIn() {
    setAttendanceActionLoading(true)
    setActionError('')
    const userId = await getUserId()
    if (!userId) { setAttendanceActionLoading(false); return }

    const { data, error } = await supabase
      .from('staff_attendance')
      .upsert({ profile_id: userId, date: todayStr(), checked_in_at: new Date().toISOString() }, { onConflict: 'profile_id,date' })
      .select().single()

    if (error) setActionError(error.message)
    else setMyAttendance(data)
    setAttendanceActionLoading(false)
  }

  async function handleStartLunch() {
    setAttendanceActionLoading(true)
    setActionError('')
    const { data, error } = await supabase
      .from('staff_attendance').update({ lunch_started_at: new Date().toISOString() }).eq('id', myAttendance.id)
      .select().single()
    if (error) setActionError(error.message)
    else setMyAttendance(data)
    setAttendanceActionLoading(false)
  }

  async function handleEndLunch() {
    setAttendanceActionLoading(true)
    setActionError('')
    const { data, error } = await supabase
      .from('staff_attendance').update({ lunch_ended_at: new Date().toISOString() }).eq('id', myAttendance.id)
      .select().single()
    if (error) setActionError(error.message)
    else setMyAttendance(data)
    setAttendanceActionLoading(false)
  }

  async function handleCheckOut() {
    setAttendanceActionLoading(true)
    setActionError('')
    const { data, error } = await supabase
      .from('staff_attendance').update({ checked_out_at: new Date().toISOString() }).eq('id', myAttendance.id)
      .select().single()
    if (error) setActionError(error.message)
    else setMyAttendance(data)
    setAttendanceActionLoading(false)
  }

  async function markAttendance(kidId, status) {
    setSavingKidId(kidId)
    setActionError('')
    try {
      const userId = await getUserId()
      if (!userId) { setSavingKidId(null); return }
      const { error } = await supabase.from('attendance').upsert(
        { kid_id: kidId, classroom_id: classroom.id, date: todayStr(), status, marked_by: userId },
        { onConflict: 'kid_id,date' }
      )
      if (error) setActionError(error.message)
      else setAttendance((prev) => ({ ...prev, [kidId]: status }))
    } catch (err) {
      setActionError('Something went wrong saving attendance.')
    }
    setSavingKidId(null)
  }

  async function handleAddTask(e) {
    e.preventDefault()
    if (!newTaskTitle.trim() || !classroom) return
    setCreatingTask(true)
    setActionError('')
    try {
      const userId = await getUserId()
      if (!userId) { setCreatingTask(false); return }
      const { error } = await supabase.from('tasks').insert([{
        classroom_id: classroom.id, title: newTaskTitle, category: newTaskCategory || null, created_by: userId,
      }])
      if (error) {
        setActionError(error.message)
      } else {
        setNewTaskTitle('')
        setNewTaskCategory('')
        await loadAll(userId)
      }
    } catch (err) {
      setActionError('Something went wrong adding this activity.')
    }
    setCreatingTask(false)
  }

  async function scoreKid(taskId, kidId, score) {
    const key = `${taskId}-${kidId}`
    setSavingScoreKey(key)
    setActionError('')
    try {
      const userId = await getUserId()
      if (!userId) { setSavingScoreKey(null); return }
      const { error } = await supabase.from('task_scores').upsert(
        { task_id: taskId, kid_id: kidId, score, scored_by: userId },
        { onConflict: 'task_id,kid_id' }
      )
      if (error) {
        setActionError(error.message)
      } else {
        setTaskScores((prev) => ({ ...prev, [taskId]: { ...(prev[taskId] || {}), [kidId]: score } }))
      }
    } catch (err) {
      setActionError('Something went wrong saving this score.')
    }
    setSavingScoreKey(null)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  function initials(name) {
    return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
  }

  function renderCheckInWidget() {
    if (!myAttendance || !myAttendance.checked_in_at) {
      return (
        <div className="checkin-widget">
          <span>You haven't checked in today</span>
          <button className="cta-button" onClick={handleCheckIn} disabled={attendanceActionLoading}>
            {attendanceActionLoading ? 'Checking in…' : 'Check In'}
          </button>
        </div>
      )
    }
    if (myAttendance.checked_out_at) {
      return <div className="checkin-widget checkin-done"><span>Checked out at {formatTime(myAttendance.checked_out_at)}</span></div>
    }
    if (myAttendance.lunch_started_at && !myAttendance.lunch_ended_at) {
      return (
        <div className="checkin-widget checkin-lunch">
          <span>On lunch since {formatTime(myAttendance.lunch_started_at)}</span>
          <button className="toggle-btn" onClick={handleEndLunch} disabled={attendanceActionLoading}>
            {attendanceActionLoading ? 'Saving…' : 'End Lunch'}
          </button>
        </div>
      )
    }
    return (
      <div className="checkin-widget checkin-active">
        <span>Checked in at {formatTime(myAttendance.checked_in_at)}</span>
        <div className="checkin-widget-buttons">
          <button className="toggle-btn" onClick={handleStartLunch} disabled={attendanceActionLoading}>Start Lunch</button>
          <button className="toggle-btn" onClick={handleCheckOut} disabled={attendanceActionLoading}>Check Out</button>
        </div>
      </div>
    )
  }

  function renderAnnouncements() {
    if (meetings.length === 0) return null
    return (
      <>
        <h2 className="section-heading" style={{ marginTop: 0 }}>Announcements</h2>
        <div className="meeting-list" style={{ marginBottom: 32 }}>
          {meetings.map((m) => (
            <div key={m.id} className="meeting-card">
              <div className="meeting-card-header">
                <h3>{m.title}</h3>
                {m.meeting_date && <span className="meeting-date-badge">{new Date(m.meeting_date).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })}</span>}
              </div>
              <p>{m.body}</p>
            </div>
          ))}
        </div>
      </>
    )
  }

  if (checkingSession || loadingData) return <div className="dashboard-loading">Loading…</div>
  if (loadError) return <div className="dashboard-loading">Couldn't load your classroom: {loadError}</div>

  if (!classroom) {
    return (
      <div className="dashboard-page">
        <header className="topbar">
          <div className="topbar-inner">
            <span className="brand-name">Paballong Teacher</span>
            <button className="nav-cta" onClick={handleLogout}>Log out</button>
          </div>
        </header>
        <div className="dashboard-body">
          {renderCheckInWidget()}
          {actionError && <p className="form-error">{actionError}</p>}
          {renderAnnouncements()}
          <p>You're not assigned to a classroom yet — check with the principal.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <header className="topbar">
        <div className="topbar-inner">
          <span className="brand-name">Paballong Teacher</span>
          <button className="nav-cta" onClick={handleLogout}>Log out</button>
        </div>
      </header>

      <div className="dashboard-body">
        <h1>{classroom.name}</h1>
        <p className="classroom-age" style={{ marginBottom: 16 }}>
          {new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>

        {renderCheckInWidget()}
        {actionError && <p className="form-error">{actionError}</p>}
        {renderAnnouncements()}

        <h2 className="section-heading" style={{ marginTop: 0 }}>Attendance</h2>
        {kids.length === 0 && <p>No kids enrolled in your classroom yet.</p>}
        <div className="attendance-list">
          {kids.map((k) => (
            <div key={k.id} className="attendance-row">
              <div className="roster-avatar attendance-avatar">
                {k.photo_url ? <img src={k.photo_url} alt={k.full_name} /> : <span>{initials(k.full_name)}</span>}
              </div>
              <span className="attendance-name">{k.full_name}</span>
              <div className="attendance-buttons">
                <button className={`att-btn att-present ${attendance[k.id] === 'present' ? 'active' : ''}`} disabled={savingKidId === k.id} onClick={() => markAttendance(k.id, 'present')}>Present</button>
                <button className={`att-btn att-late ${attendance[k.id] === 'late' ? 'active' : ''}`} disabled={savingKidId === k.id} onClick={() => markAttendance(k.id, 'late')}>Late</button>
                <button className={`att-btn att-absent ${attendance[k.id] === 'absent' ? 'active' : ''}`} disabled={savingKidId === k.id} onClick={() => markAttendance(k.id, 'absent')}>Absent</button>
              </div>
            </div>
          ))}
        </div>

        <h2 className="section-heading">Today's Activities</h2>
        <form className="inline-form" onSubmit={handleAddTask}>
          <input placeholder="Activity name (e.g. Counting practice)" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} required />
          <input placeholder="Category (optional)" value={newTaskCategory} onChange={(e) => setNewTaskCategory(e.target.value)} />
          <button type="submit" className="cta-button" disabled={creatingTask}>{creatingTask ? 'Adding…' : 'Add activity'}</button>
        </form>
        {tasks.length === 0 && <p>No activities added yet today.</p>}
        {tasks.map((task) => (
          <div key={task.id} className="task-card">
            <h3>{task.title}{task.category && <span className="task-category"> · {task.category}</span>}</h3>
            <div className="attendance-list">
              {kids.map((k) => {
                const currentScore = taskScores[task.id]?.[k.id]
                const key = `${task.id}-${k.id}`
                return (
                  <div key={k.id} className="attendance-row">
                    <div className="roster-avatar attendance-avatar">
                      {k.photo_url ? <img src={k.photo_url} alt={k.full_name} /> : <span>{initials(k.full_name)}</span>}
                    </div>
                    <span className="attendance-name">{k.full_name}</span>
                    <div className="attendance-buttons">
                      <button className={`att-btn score-practice ${currentScore === 'needs_practice' ? 'active' : ''}`} disabled={savingScoreKey === key} onClick={() => scoreKid(task.id, k.id, 'needs_practice')}>Needs Practice</button>
                      <button className={`att-btn score-developing ${currentScore === 'developing' ? 'active' : ''}`} disabled={savingScoreKey === key} onClick={() => scoreKid(task.id, k.id, 'developing')}>Developing</button>
                      <button className={`att-btn score-confident ${currentScore === 'confident' ? 'active' : ''}`} disabled={savingScoreKey === key} onClick={() => scoreKid(task.id, k.id, 'confident')}>Confident</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TeacherHome