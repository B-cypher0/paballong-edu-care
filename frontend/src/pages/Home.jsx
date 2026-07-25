import { Link } from 'react-router-dom'
import logo from '../assets/paballong-logo.png'

function Home() {
  const whatsappLink = "https://wa.me/27614330777"

  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar-inner">
          <span className="brand-name">Paballong Edu-Care</span>
          <a className="nav-cta" href={whatsappLink} target="_blank" rel="noreferrer">Message Us</a>
        </div>
      </header>

      <section className="hero">
        <div className="hero-inner">
          <div className="logo-badge">
            <img src={logo} alt="Paballong Edu-Care logo" />
          </div>
          <h1>Quality care and education for your child</h1>
          <p className="hero-sub">
            At Paballong Edu-care Centre, we're committed to giving every child a safe,
            nurturing start — from their very first years through Grade R.
          </p>
          <div className="age-ribbon"><span>For ages 0–6 years</span></div>
          <Link className="cta-button" to="/register">Register Your Child</Link>
        </div>
      </section>

      <section className="mission-band">
        <p>"Re Sireletsa Setjhaba" — we protect the nation, one child at a time.</p>
      </section>

      <section className="services">
        <h2>Our services</h2>
        <div className="service-grid">
          <div className="service-card">
            <h3>Full-time & part-time care</h3>
            <p>Flexible options built around your family's schedule.</p>
          </div>
          <div className="service-card">
            <h3>Nutritious meals & snacks</h3>
            <p>Balanced meals prepared fresh, every day.</p>
          </div>
          <div className="service-card">
            <h3>Small group sizes</h3>
            <p>More one-on-one attention for every child.</p>
          </div>
          <div className="service-card">
            <h3>Caring staff</h3>
            <p>Warm, attentive teachers who know your child by name.</p>
          </div>
          <div className="service-card">
            <h3>Quality education</h3>
            <p>Early learning that builds real foundations.</p>
          </div>
        </div>
      </section>

      <section className="why-us">
        <h2>Why choose us?</h2>
        <div className="why-grid">
          <div className="why-item">
            <h3>Safe facility</h3>
            <p>A secure, supervised space your child can explore freely.</p>
          </div>
          <div className="why-item">
            <h3>Best teaching & learning experiences</h3>
            <p>Play-based learning designed for how young children actually grow.</p>
          </div>
        </div>
      </section>

      <footer className="contact-band">
        <h2>Come say hello</h2>
        <div className="contact-details">
          <a href={whatsappLink} target="_blank" rel="noreferrer">📱 061 433 0777</a>
          <span>📍 1781 Mbete Street, Phiritona, Heilbron</span>
          <a href="mailto:paballong763@gmail.com">✉️ paballong763@gmail.com</a>
        </div>
      </footer>
    </div>
  )
}

export default Home