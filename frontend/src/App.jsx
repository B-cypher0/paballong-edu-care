import { Routes, Route } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import Register from './pages/Register'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Classrooms from './pages/Classrooms'
import ClassroomDetail from './pages/ClassroomDetail'
import Staff from './pages/Staff'
import TeacherHome from './pages/TeacherHome'
import Meetings from './pages/Meetings'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/classrooms" element={<Classrooms />} />
      <Route path="/classrooms/:id" element={<ClassroomDetail />} />
      <Route path="/staff" element={<Staff />} />
      <Route path="/teacher" element={<TeacherHome />} />
      <Route path="/meetings" element={<Meetings />} />
    </Routes>
  )
}

export default App