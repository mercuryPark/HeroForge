import { useState } from "react"
import { motion } from "framer-motion"
import { HERO_CLASSES } from "../game/data/classes"
import { useGameStore } from "../game/state/gameStore"

export function CharacterCreationPanel() {
  const createCharacter = useGameStore((s) => s.createCharacter)
  const [step, setStep] = useState(1)
  const [name, setName] = useState("")
  const trimmedName = name.trim()

  function submitName(event) {
    event.preventDefault()
    if (!trimmedName) return
    setStep(2)
  }

  function handleChooseClass(classId) {
    if (!trimmedName) return
    createCharacter(trimmedName, classId)
  }

  return (
    <motion.section
      className="creation-panel"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <p className="eyebrow">HeroForge 시작하기</p>
      <h1>영웅을 생성하세요</h1>
      <p className="creation-copy">
        처음 한 번만 이름과 직업을 선택합니다. 직업은 생성 후 변경할 수 없습니다.
      </p>

      {step === 1 && (
        <form className="creation-form" onSubmit={submitName}>
          <label htmlFor="hero-name">캐릭터 이름</label>
          <input
            id="hero-name"
            type="text"
            maxLength={12}
            value={name}
            placeholder="영웅 이름을 입력하세요"
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
          <button type="submit" disabled={!trimmedName}>
            이름 확정하고 직업 선택하기
          </button>
        </form>
      )}

      {step === 2 && (
        <div className="creation-step">
          <div className="creation-selected">
            <span>캐릭터 이름</span>
            <strong>{trimmedName}</strong>
            <button type="button" onClick={() => setStep(1)}>
              이름 수정
            </button>
          </div>

          <div className="creation-class-grid">
            {Object.values(HERO_CLASSES).map((job) => (
              <button
                type="button"
                className={`class-card ${job.id}`}
                key={job.id}
                onClick={() => handleChooseClass(job.id)}
              >
                <strong>{job.name}</strong>
                <span>{job.title}</span>
                <p>{job.summary}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.section>
  )
}
