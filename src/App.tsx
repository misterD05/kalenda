import { useState } from 'react'
import './index.css'
import logo from "./assets/logo.svg"
import { MyCalendar } from './components'

function App() {
  return (
    <div className="flex flex-col h-screen w-screen bg-gradient-to-br from-(--indigo)/60 to-(--bg) text-[var(--text)] select-none overflow-hidden">

      <div className="h-20  flex items-center justify-between px-6 border-b border-[var(--border-color)] [-webkit-app-region:drag]">
        <div className="flex items-center space-x-3">
          <img src={logo} className='h-15 w-auto' alt="Kalenda Logo" />
          <span className="text-6xl font-bold tracking-widest text-[var(--text)] uppercase">
            Kalenda
          </span>
        </div>
      </div>

      <main className="flex-1 p-6 overflow-hidden">
        <MyCalendar />
      </main>
    </div>
  )
}

export default App
