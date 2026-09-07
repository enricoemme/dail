import { useEffect, useId, useRef, useState } from 'react'
import type { Team } from '../types'

interface Props {
  teams: Team[]
  value: string
  placeholder: string
  disabled: boolean
  onChange: (id: string) => void
}

export function TeamPicker({ teams, value, placeholder, disabled, onChange }: Props) {
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const selected = teams.find((team) => team.id === value)
  const matches = teams.filter((team) => team.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  const expanded = open && !disabled
  const activeIndex = Math.min(active, matches.length - 1)

  const show = () => {
    if (disabled) return
    setQuery('')
    setActive(Math.max(0, teams.findIndex((team) => team.id === value)))
    setOpen(true)
  }
  const choose = (team: Team) => {
    onChange(team.id)
    setOpen(false)
    setQuery('')
    input.current?.focus()
  }

  useEffect(() => {
    if (!expanded) return
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [expanded])

  useEffect(() => {
    if (expanded) document.getElementById(`${id}-option-${activeIndex}`)?.scrollIntoView({ block: 'nearest' })
  }, [expanded, activeIndex, id, query])

  return (
    <div ref={root} className={'team-picker' + (expanded ? ' team-picker-open' : '')}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
      <div className="team-picker-field">
        <svg className="team-picker-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M21 20v-2a6 6 0 0 0-3-5" />
        </svg>
        <input ref={input} role="combobox" aria-label="Select your team" aria-expanded={expanded}
          aria-controls={`${id}-list`} aria-autocomplete="list"
          aria-activedescendant={expanded && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
          autoComplete="off" spellCheck={false} disabled={disabled}
          placeholder={expanded ? 'Search teams…' : placeholder}
          value={expanded ? query : selected?.name ?? ''}
          onClick={() => { if (!expanded) show() }}
          onChange={(event) => { setQuery(event.target.value); setActive(0); setOpen(true) }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault()
              if (!expanded) show()
              else setActive(Math.max(0, Math.min(matches.length - 1, activeIndex + (event.key === 'ArrowDown' ? 1 : -1))))
            } else if (event.key === 'Enter') {
              event.preventDefault()
              if (!expanded) show()
              else if (matches[activeIndex]) choose(matches[activeIndex])
            } else if (event.key === 'Escape') {
              setOpen(false)
            } else if (event.key === 'Tab') {
              setOpen(false)
            }
          }} />
        <button className="team-picker-toggle" tabIndex={-1} type="button" disabled={disabled}
          aria-label={expanded ? 'Close team list' : 'Open team list'}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => { input.current?.focus(); if (expanded) setOpen(false); else show() }}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m5 8 5 5 5-5" /></svg>
        </button>
      </div>
      {expanded && (
        <div className="team-picker-panel">
          <div className="team-picker-heading">Choose your team <span>{matches.length}</span></div>
          <ul id={`${id}-list`} role="listbox" aria-label="Registered teams" className="team-picker-list">
            {matches.map((team, index) => (
              <li key={team.id} id={`${id}-option-${index}`} role="option" aria-selected={team.id === value}
                className={'team-picker-option' + (index === activeIndex ? ' team-picker-active' : '')}
                onMouseDown={(event) => event.preventDefault()}
                onPointerMove={() => setActive(index)} onClick={() => choose(team)}>
                <span>{team.name}</span><span className="team-picker-check" aria-hidden="true">{team.id === value ? '✓' : ''}</span>
              </li>
            ))}
          </ul>
          {matches.length === 0 && <p className="team-picker-empty" role="status">No teams found. Try another name.</p>}
        </div>
      )}
    </div>
  )
}
