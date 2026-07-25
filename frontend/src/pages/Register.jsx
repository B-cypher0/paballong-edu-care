import { useState } from 'react'
import { supabase } from '../supabaseClient'

function Register() {
  const [form, setForm] = useState({
    child_full_name: '',
    child_dob: '',
    guardian_name: '',
    guardian_phone: '',
    guardian_email: '',
    relationship_to_child: '',
    home_address: '',
    medical_notes: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    consent_given: false,
  })
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('submitting')
    setErrorMsg('')

    const { error } = await supabase.from('registrations').insert([form])

    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
      return
    }
    setStatus('success')
  }

  if (status === 'success') {
    return (
      <div className="register-page">
        <div className="register-card success-card">
          <h1>Thank you!</h1>
          <p>
            We've received {form.child_full_name}'s registration. Our team will be in touch
            on {form.guardian_phone} shortly to confirm next steps.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="register-page">
      <form className="register-card" onSubmit={handleSubmit}>
        <h1>Register your child</h1>
        <p className="register-sub">Fill this in and our team will follow up to confirm your child's spot.</p>

        <h2>Child's details</h2>
        <label>
          Full name
          <input name="child_full_name" value={form.child_full_name} onChange={handleChange} required />
        </label>
        <label>
          Date of birth
          <input type="date" name="child_dob" value={form.child_dob} onChange={handleChange} required />
        </label>

        <h2>Your details</h2>
        <label>
          Your name
          <input name="guardian_name" value={form.guardian_name} onChange={handleChange} required />
        </label>
        <label>
          Phone number
          <input type="tel" name="guardian_phone" value={form.guardian_phone} onChange={handleChange} required />
        </label>
        <label>
          Email (optional)
          <input type="email" name="guardian_email" value={form.guardian_email} onChange={handleChange} />
        </label>
        <label>
          Relationship to child
          <select name="relationship_to_child" value={form.relationship_to_child} onChange={handleChange} required>
            <option value="">Select one</option>
            <option value="Mother">Mother</option>
            <option value="Father">Father</option>
            <option value="Guardian">Guardian</option>
            <option value="Other">Other</option>
          </select>
        </label>
        <label>
          Home address (optional)
          <textarea name="home_address" value={form.home_address} onChange={handleChange} rows="2" />
        </label>

        <h2>Good to know</h2>
        <label>
          Medical notes / allergies (optional)
          <textarea name="medical_notes" value={form.medical_notes} onChange={handleChange} rows="2" />
        </label>
        <label>
          Emergency contact name (optional)
          <input name="emergency_contact_name" value={form.emergency_contact_name} onChange={handleChange} />
        </label>
        <label>
          Emergency contact phone (optional)
          <input type="tel" name="emergency_contact_phone" value={form.emergency_contact_phone} onChange={handleChange} />
        </label>

        <label className="consent-row">
          <input type="checkbox" name="consent_given" checked={form.consent_given} onChange={handleChange} required />
          <span>I consent to Paballong Edu-Care collecting and storing my child's information for enrollment and care purposes.</span>
        </label>

        {status === 'error' && <p className="form-error">Something went wrong: {errorMsg}. Please try again.</p>}

        <button type="submit" className="cta-button" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Submitting…' : 'Submit registration'}
        </button>
      </form>
    </div>
  )
}

export default Register