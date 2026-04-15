import React from 'react'
import 'styles/Landing.css'
import tigerImg from '../assets/TigerPath Landing Graphic.svg'
import waveImg from '../assets/TigerPath Waves.svg'


function Landing() {
  return (
    <div className="landing-container">
        {/* hidden SVG filter for sketchy button border */}
        <svg width="0" height="0" style={{position: 'relative'}}>
        <defs>
            <filter id="sketchy">
            <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" />
            </filter>
        </defs>
        </svg>

        <div className="upper-bar">
            <a href="https://docs.google.com/forms/d/e/1FAIpQLSdjBwHsURKujVqfnUk7nyocAMnFDFI6fyubDmqYMgLElpm_Nw/viewform"
                className="feedback-link hyperlink"
                target="_blank"
                rel="noopener noreferrer">
                feedback
            </a>
        </div>
    <div className="body">
        {/* left side - tiger illustration */}
        <div className="landing-left">
            <div className="landing-left-graphics">
                <img src={tigerImg} className="tiger-illustration"
                alt="Tiger on a ship" />
            </div>
            

        </div>

        {/* right side - text and button */}
        <div className="landing-right">
            <div className="landing-header">
                <h1 className="landing-title">TigerPath</h1>
                <h2 className="landing-subtitle">
                    Plan your entire Princeton journey with TigerPath.</h2>
            </div>
                <a href="/login" className="sign-in-button">SIGN IN</a>
            <p className="landing-credit">Made by <a href="https://tigerapps.org/" className="hyperlink">TigerApps</a>
            </p>
        </div>
    </div>

    <div className="wave-wrapper">
      <div className="wave-carousel">
        <img src={waveImg} className="wave-illustration" alt="Waves"/>
        <img src={waveImg} className="wave-illustration" alt="Waves"/>
        <img src={waveImg} className="wave-illustration" alt="Waves"/>
      </div>
    </div>
    </div>
  )
}

export default Landing