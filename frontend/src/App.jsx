import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import {
  Activity,
  BarChart3,
  Brain,
  ChevronRight,
  Clock3,
  Home,
  LogOut,
  PanelRightClose,
  PanelRightOpen,
  Send,
  Settings,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import Login from './pages/Login'
import HistoryPage from './pages/History'
import { auth, db } from './firebase'
import './App.css'

const BACKEND_URL = 'http://localhost:8000/ask'
const subjects = ['Physics', 'Chemistry', 'Maths', 'Biology']
const difficulties = ['Easy', 'Medium', 'Hard']
const quickStartPrompts = [
  "Explain Newton's Laws with examples",
  'What is photosynthesis in simple terms?',
  'Solve a quadratic equation step by step',
]
const analysisMessages = [
  'Analyzing your question...',
  'Searching knowledge base...',
  'Detecting your emotion...',
]

const themeMap = {
  Confident: {
    key: 'confident',
    label: 'Confident',
    visible: true,
    bannerText: 'Great understanding! Going deeper...',
    chipClass: 'emotion-chip emotion-chip--confident',
    dotClass: 'emotion-chip__dot emotion-chip__dot--confident',
  },
  Struggling: {
    key: 'struggling',
    label: 'Struggling',
    visible: true,
    bannerText:
      "VidyaBot detected you're struggling - simplifying explanation...",
    chipClass: 'emotion-chip emotion-chip--struggling',
    dotClass: 'emotion-chip__dot emotion-chip__dot--struggling',
  },
  Confused: {
    key: 'confused',
    label: 'Confused',
    visible: true,
    bannerText: 'Let me break this down differently for you...',
    chipClass: 'emotion-chip emotion-chip--confused',
    dotClass: 'emotion-chip__dot emotion-chip__dot--confused',
  },
  Neutral: {
    key: 'neutral',
    label: 'Neutral',
    visible: false,
    bannerText: '',
    chipClass: 'emotion-chip emotion-chip--neutral',
    dotClass: 'emotion-chip__dot emotion-chip__dot--neutral',
  },
}

const makeId = () =>
  window.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(16).slice(2)}`

const normalizeEmotion = (emotion) => {
  const raw = String(emotion || '').trim().toLowerCase()

  if (raw.includes('joy') || raw.includes('surprise') || raw.includes('confident')) {
    return 'Confident'
  }

  if (
    raw.includes('fear') ||
    raw.includes('sadness') ||
    raw.includes('disgust') ||
    raw.includes('strug')
  ) {
    return 'Struggling'
  }

  if (raw.includes('anger') || raw.includes('confus')) {
    return 'Confused'
  }

  return 'Neutral'
}

const getEmotionTheme = (emotion) =>
  themeMap[normalizeEmotion(emotion)] || themeMap.Neutral

const getUserLabel = (user) =>
  user?.displayName || user?.email || user?.phoneNumber || 'Student'

const formatSessionTime = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const createWelcomeMessage = () => ({
  id: 'welcome',
  role: 'assistant',
  text:
    'Welcome to VidyaBot. Pick a subject, choose a difficulty, and ask me anything from the lesson you are studying.',
  emotion: 'Confident',
  meta: 'Ready to help',
})

const createSuggestionMessage = (subjectName) => {
  const safeSubject = subjectName || 'this subject'

  return {
    id: makeId(),
    role: 'assistant',
    variant: 'suggestion',
    subject: safeSubject,
    meta: 'Session coach',
    text:
      `Based on your session, would you like me to:\n\n` +
      `- Give you a quick quiz on ${safeSubject}?\n` +
      `- Summarize everything we covered so far?\n` +
      `- Move to the next topic?`,
    actions: [
      {
        label: 'Quick Quiz',
        prompt: `Give me a quick 3-question quiz on ${safeSubject}`,
      },
      {
        label: 'Summarize',
        prompt: 'Summarize everything we covered in this session',
      },
      {
        label: 'Next Topic',
        prompt: `What should I study next in ${safeSubject}?`,
      },
    ],
  }
}

function RailButton({ icon: Icon, label, active, onClick }) {
  return (
    <motion.button
      type="button"
      className={`rail-button group ${active ? 'rail-button--active' : ''}`}
      onClick={onClick}
      whileHover={{ scale: 1.05, x: 2 }}
      whileTap={{ scale: 0.96 }}
      aria-label={label}
    >
      <Icon size={18} strokeWidth={2.2} />
      <span className="rail-button__tooltip opacity-0 translate-x-[-8px] transition duration-200 group-hover:opacity-100 group-hover:translate-x-0">
        {label}
      </span>
    </motion.button>
  )
}

function PromptCard({ prompt, onClick, disabled }) {
  return (
    <motion.button
      type="button"
      className="hero__prompt glass"
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
    >
      <span>{prompt}</span>
      <ChevronRight size={16} />
    </motion.button>
  )
}

function SuggestionActionButton({ label, prompt, onSubmit, disabled }) {
  return (
    <motion.button
      type="button"
      className="suggestion-action"
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSubmit(prompt)}
      disabled={disabled}
    >
      {label}
    </motion.button>
  )
}

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [activeView, setActiveView] = useState('chat')
  const [subject, setSubject] = useState('Physics')
  const [difficulty, setDifficulty] = useState('Medium')
  const [displayDifficulty, setDisplayDifficulty] = useState('Medium')
  const [isAdaptingDifficulty, setIsAdaptingDifficulty] = useState(false)
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([createWelcomeMessage()])
  const [questionsAsked, setQuestionsAsked] = useState(0)
  const [emotionHistory, setEmotionHistory] = useState([])
  const [isSending, setIsSending] = useState(false)
  const [analysisStep, setAnalysisStep] = useState(0)
  const [sessionSeconds, setSessionSeconds] = useState(0)
  const [isPanelOpen, setIsPanelOpen] = useState(true)

  const endRef = useRef(null)
  const difficultyTimerRef = useRef(null)
  const typingIntervalRef = useRef(null)
  const pendingSuggestionsRef = useRef([])

  const currentStudent = getUserLabel(currentUser)
  const currentEmotion = emotionHistory[0] || 'Neutral'
  const currentEmotionTheme = useMemo(
    () => getEmotionTheme(currentEmotion),
    [currentEmotion],
  )
  const hasTypingMessages = messages.some((message) => message.isTyping)
  const isConversationEmpty = questionsAsked === 0
  const progressPercent = Math.min(100, Math.round((questionsAsked / 20) * 100))

  const subjectMastery = useMemo(() => {
    const baseScores = {
      Physics: 62,
      Chemistry: 54,
      Maths: 58,
      Biology: 50,
    }

    return subjects.map((item, index) => {
      const base = baseScores[item] || 50
      const boost = item === subject ? 10 + questionsAsked * 3 : Math.max(0, questionsAsked - index * 2)
      return {
        name: item,
        value: Math.min(96, base + boost),
      }
    })
  }, [questionsAsked, subject])

  const sessionSummary = useMemo(
    () => [
      { label: 'Learner', value: currentStudent },
      { label: 'Backend', value: 'localhost:8000/ask' },
      { label: 'Mode', value: `${subject} • ${displayDifficulty}` },
      { label: 'Emotion', value: currentEmotionTheme.label },
    ],
    [currentEmotionTheme.label, currentStudent, displayDifficulty, subject],
  )

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setCurrentUser(nextUser)
      setMessages([createWelcomeMessage()])
      setQuestionsAsked(0)
      setEmotionHistory([])
      setQuestion('')
      setDisplayDifficulty('Medium')
      setDifficulty('Medium')
      setIsAdaptingDifficulty(false)
      setAnalysisStep(0)
      setSessionSeconds(0)
      pendingSuggestionsRef.current = []
      setActiveView('chat')
      setAuthLoading(false)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!currentUser) return undefined

    const interval = window.setInterval(() => {
      setSessionSeconds((prev) => prev + 1)
    }, 1000)

    return () => window.clearInterval(interval)
  }, [currentUser])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isSending, analysisStep])

  useEffect(() => {
    return () => {
      if (difficultyTimerRef.current) {
        window.clearTimeout(difficultyTimerRef.current)
      }

      if (typingIntervalRef.current) {
        window.clearInterval(typingIntervalRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!isSending) return undefined

    const interval = window.setInterval(() => {
      setAnalysisStep((prev) => (prev + 1) % analysisMessages.length)
    }, 800)

    return () => window.clearInterval(interval)
  }, [isSending])

  useEffect(() => {
    if (!hasTypingMessages) {
      if (typingIntervalRef.current) {
        window.clearInterval(typingIntervalRef.current)
        typingIntervalRef.current = null
      }

      return undefined
    }

    if (typingIntervalRef.current) return undefined

    typingIntervalRef.current = window.setInterval(() => {
      const completedMessageIds = []

      setMessages((prev) =>
        prev.map((message) => {
          if (!message.isTyping) return message

          const fullChars = Array.from(message.fullText ?? message.text ?? '')
          const typedChars = message.typedChars ?? 0
          const nextTypedChars = Math.min(typedChars + 1, fullChars.length)
          const nextDisplayText = fullChars.slice(0, nextTypedChars).join('')
          const isComplete = nextTypedChars >= fullChars.length

          if (isComplete) {
            completedMessageIds.push(message.id)
          }

          return {
            ...message,
            displayText: nextDisplayText,
            typedChars: nextTypedChars,
            isTyping: !isComplete,
          }
        }),
      )

      if (completedMessageIds.length && pendingSuggestionsRef.current.length) {
        const completedSet = new Set(completedMessageIds)
        const nextQueue = []
        const matchedSuggestions = []

        pendingSuggestionsRef.current.forEach((item) => {
          if (completedSet.has(item.triggerMessageId)) {
            matchedSuggestions.push(item)
          } else {
            nextQueue.push(item)
          }
        })

        if (matchedSuggestions.length) {
          pendingSuggestionsRef.current = nextQueue

          matchedSuggestions.forEach((item) => {
            const suggestionMessage = createSuggestionMessage(item.subject)

            setMessages((prev) => {
              const triggerIndex = prev.findIndex(
                (message) => message.id === item.triggerMessageId,
              )

              if (triggerIndex === -1) {
                return [...prev, suggestionMessage]
              }

              const next = [...prev]
              next.splice(triggerIndex + 1, 0, suggestionMessage)
              return next
            })
          })
        }
      }
    }, 20)

    return () => {
      if (typingIntervalRef.current) {
        window.clearInterval(typingIntervalRef.current)
        typingIntervalRef.current = null
      }
    }
  }, [hasTypingMessages])

  const pushEmotion = (emotion) => {
    setEmotionHistory((prev) => [normalizeEmotion(emotion), ...prev].slice(0, 5))
  }

  const selectDifficulty = (nextDifficulty) => {
    setDifficulty(nextDifficulty)
    setIsAdaptingDifficulty(true)

    if (difficultyTimerRef.current) {
      window.clearTimeout(difficultyTimerRef.current)
    }

    difficultyTimerRef.current = window.setTimeout(() => {
      setDisplayDifficulty(nextDifficulty)
      setIsAdaptingDifficulty(false)
      difficultyTimerRef.current = null
    }, 1000)
  }

  const enqueueSuggestion = (triggerMessageId, sessionSubject) => {
    pendingSuggestionsRef.current = [
      ...pendingSuggestionsRef.current,
      { triggerMessageId, subject: sessionSubject },
    ]
  }

  const submitQuestion = async (rawQuestion) => {
    const trimmedQuestion = String(rawQuestion ?? '').trim()

    if (!trimmedQuestion || isSending) return

    const nextQuestionsAsked = questionsAsked + 1
    const userMessage = {
      id: makeId(),
      role: 'user',
      text: trimmedQuestion,
      subject,
      difficulty,
    }

    setMessages((prev) => [...prev, userMessage])
    setQuestionsAsked(nextQuestionsAsked)
    setQuestion('')
    setAnalysisStep(0)
    setIsSending(true)

    try {
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: trimmedQuestion,
          subject,
          difficulty,
          student_name: currentStudent,
        }),
      })

      const rawText = await response.text()
      let payload = {}

      try {
        payload = rawText ? JSON.parse(rawText) : {}
      } catch {
        payload = { answer: rawText }
      }

      if (!response.ok) {
        throw new Error(
          payload.detail ||
            payload.error ||
            payload.message ||
            payload.answer ||
            `Request failed with status ${response.status}`,
        )
      }

      const answer =
        payload.answer ||
        payload.response ||
        payload.reply ||
        payload.message ||
        rawText ||
        'I could not produce a response.'

      const emotion = normalizeEmotion(
        payload.emotion || payload.mood || payload.sentiment || 'Confused',
      )
      const assistantId = makeId()

      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: 'assistant',
          text: answer,
          fullText: answer,
          displayText: '',
          typedChars: 0,
          isTyping: true,
          emotion,
          meta: `${subject} • ${difficulty}`,
        },
      ])
      pushEmotion(emotion)

      if (currentUser?.uid) {
        try {
          await addDoc(collection(db, 'sessions'), {
            userId: currentUser.uid,
            userName: currentStudent,
            question: trimmedQuestion,
            answer,
            emotion,
            subject,
            difficulty,
            timestamp: serverTimestamp(),
            bookmarked: false,
          })
        } catch (saveError) {
          console.error('Could not save session to Firestore:', saveError)
        }
      }

      if (nextQuestionsAsked % 3 === 0) {
        enqueueSuggestion(assistantId, subject)
      }
    } catch (error) {
      const fallbackEmotion = 'Confused'
      const fallbackText = `I could not reach the FastAPI backend at ${BACKEND_URL}. Make sure it is running on port 8000 and try again.\n\n${error.message}`
      const assistantId = makeId()

      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: 'assistant',
          text: fallbackText,
          fullText: fallbackText,
          displayText: '',
          typedChars: 0,
          isTyping: true,
          emotion: fallbackEmotion,
          meta: 'Connection issue',
        },
      ])
      pushEmotion(fallbackEmotion)

      if (nextQuestionsAsked % 3 === 0) {
        enqueueSuggestion(assistantId, subject)
      }
    } finally {
      setIsSending(false)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Sign out failed:', error)
    } finally {
      setActiveView('chat')
    }
  }

  if (authLoading) {
    return (
      <div className="app-loading">
        <div className="app-loading__card panel-card">
          <div className="app-loading__spinner" />
          <h1>VidyaBot</h1>
          <p>Checking your learning session...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return <Login />
  }

  if (activeView === 'history') {
    return (
      <motion.div
        key="history-view"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
      >
        <HistoryPage
          user={currentUser}
          onBack={() => setActiveView('chat')}
          onLogout={handleLogout}
        />
      </motion.div>
    )
  }

  const renderMessage = (message) => {
    if (message.role === 'user') {
      return (
        <motion.article
          key={message.id}
          className="message-row message-row--user"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22 }}
          layout
        >
          <div className="message-bubble message-bubble--user">
            <div className="message-meta">
              <div className="message-meta__copy">
                <span className="message-meta__label">You</span>
                <strong>{currentStudent}</strong>
              </div>
              <span className="message-subject-chip">
                {message.subject} • {message.difficulty}
              </span>
            </div>
            <p className="message-plain">{message.text}</p>
          </div>
        </motion.article>
      )
    }

    if (message.variant === 'suggestion') {
      return (
        <motion.article
          key={message.id}
          className="message-row message-row--assistant"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22 }}
          layout
        >
          <div className="message-bubble message-bubble--suggestion">
            <div className="message-meta">
              <div className="message-meta__copy">
                <div className="message-avatar">VB</div>
                <div>
                  <span className="message-meta__label">VidyaBot</span>
                  <strong>{message.meta || 'Session coach'}</strong>
                </div>
              </div>
              <span className="emotion-chip emotion-chip--neutral">
                <span className="emotion-chip__dot emotion-chip__dot--neutral" />
                Smart suggestion
              </span>
            </div>

            <div className="message-markdown">
              <ReactMarkdown>{message.text}</ReactMarkdown>
            </div>

            <div className="suggestion-actions">
              {message.actions?.map((action) => (
                <SuggestionActionButton
                  key={action.label}
                  label={action.label}
                  prompt={action.prompt}
                  onSubmit={submitQuestion}
                  disabled={isSending}
                />
              ))}
            </div>
          </div>
        </motion.article>
      )
    }

    const assistantTheme = getEmotionTheme(message.emotion)
    const renderedText =
      message.isTyping && message.displayText !== undefined
        ? message.displayText
        : message.text

    return (
      <motion.article
        key={message.id}
        className="message-row message-row--assistant"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.22 }}
        layout
      >
        <div className={`message-bubble message-bubble--assistant message-bubble--${assistantTheme.key}`}>
          <div className="message-meta">
            <div className="message-meta__copy">
              <div className="message-avatar">VB</div>
              <div>
                <span className="message-meta__label">VidyaBot</span>
                <strong>{message.meta || 'AI tutor response'}</strong>
              </div>
            </div>

            <span className={assistantTheme.chipClass}>
              <span className={assistantTheme.dotClass} />
              {normalizeEmotion(message.emotion)}
            </span>
          </div>

          <div className="message-markdown">
            <ReactMarkdown>{renderedText}</ReactMarkdown>
          </div>

          {message.isTyping ? (
            <span className="typing-cursor" aria-hidden="true">
              ▍
            </span>
          ) : null}
        </div>
      </motion.article>
    )
  }

  const quickStart = (
    <motion.section
      key="hero"
      className="hero panel-card"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.26, ease: 'easeOut' }}
    >
      <div className="hero__copy">
        <div className="mb-2">
          <span className="text-xs font-semibold tracking-widest text-[#e94560] uppercase">
            Adaptive AI Tutor
          </span>
        </div>
        <h1 className="text-4xl font-bold text-white mb-2">
          Welcome back,{' '}
          <span className="bg-gradient-to-r from-[#e94560] to-[#7c3aed] bg-clip-text text-transparent">
            {currentUser?.displayName?.split(' ')[0] || 'Student'}
          </span>
        </h1>
        <p className="text-slate-400 text-base">
          Ready to continue your learning journey? Pick a subject and let&apos;s
          begin.
        </p>
      </div>

      <div className="hero__prompt-grid">
        {quickStartPrompts.map((prompt) => (
          <PromptCard
            key={prompt}
            prompt={prompt}
            onClick={() => submitQuestion(prompt)}
            disabled={isSending}
          />
        ))}
      </div>
    </motion.section>
  )

  const sessionProgressText = `${Math.min(20, questionsAsked)} / 20`

  return (
    <div className={`dashboard-shell dashboard-shell--${currentEmotionTheme.key}`}>
      <div className="particle particle--one" />
      <div className="particle particle--two" />
      <div className="particle particle--three" />
      <div className="particle particle--four" />
      <div className="particle particle--five" />

      <div className="dashboard-grid">
        <aside className="rail panel-card">
          <div className="rail__brand">
            <div className="rail__mark rail__mark--logo">
              <img src="/vidyabot-logo.webp" alt="VidyaBot logo" loading="eager" />
            </div>
            <div className="rail__brand-copy">
              <strong>VidyaBot</strong>
              <span>Adaptive AI Tutor</span>
            </div>
          </div>

          <nav className="rail__nav" aria-label="Primary">
            <RailButton
              icon={Home}
              label="Chat"
              active={activeView === 'chat'}
              onClick={() => setActiveView('chat')}
            />
            <RailButton
              icon={Clock3}
              label="History"
              active={activeView === 'history'}
              onClick={() => setActiveView('history')}
            />
            <RailButton
              icon={Sparkles}
              label="Progress (Coming Soon)"
              active={false}
              onClick={() => setIsPanelOpen(true)}
            />
            <RailButton
              icon={Settings}
              label="Settings (Coming Soon)"
              active={false}
              onClick={() => setIsPanelOpen(true)}
            />
          </nav>

          <div className="rail__footer">
            <div className="rail__avatar rail__avatar--static" aria-label={`Signed in as ${currentStudent}`}>
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt={currentStudent} />
              ) : (
                <UserRound size={22} />
              )}
            </div>
          </div>
        </aside>

        <main className="workspace">
          <section className="workspace-topbar panel-card">
            <div className="workspace-topbar__status">
              <span className="workspace-topbar__live">
                <span className="live-dot" />
                Live session
              </span>
              <span className="workspace-topbar__student">{currentStudent}</span>
            </div>

            <div className="workspace-topbar__actions">
              <div className="workspace-topbar__chips">
                <span className="topbar-chip topbar-chip--subject">{subject}</span>
                <span className="topbar-chip topbar-chip--mode">{displayDifficulty}</span>
              </div>

              <button
                type="button"
                className="workspace-topbar__logout"
                onClick={handleLogout}
                aria-label={`Logout ${currentStudent}`}
              >
                <span className="workspace-topbar__logout-avatar" aria-hidden="true">
                  {currentUser?.photoURL ? (
                    <img src={currentUser.photoURL} alt="" />
                  ) : (
                    <UserRound size={14} />
                  )}
                </span>
                <span className="workspace-topbar__logout-label">Log out</span>
                <LogOut size={14} />
              </button>
            </div>
          </section>

          <section className="workspace-stage">
            <section className="session-controls panel-card">
              <div className="session-controls__group">
                <span className="session-label">Subject</span>
                <div className="pill-row">
                  {subjects.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setSubject(item)}
                      className={
                        subject === item
                          ? 'pill-tab pill-tab--subject-active'
                          : 'pill-tab glass text-slate-300 hover:text-white border border-white/10'
                      }
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="session-controls__group">
                <span className="session-label">Difficulty</span>
                <div className="pill-row">
                  {difficulties.map((item) => {
                    const activeClass =
                      item === 'Easy'
                        ? 'pill-tab--easy-active'
                        : item === 'Medium'
                          ? 'pill-tab--medium-active'
                          : 'pill-tab--hard-active'

                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => selectDifficulty(item)}
                        className={
                          difficulty === item
                            ? `pill-tab ${activeClass}`
                            : 'pill-tab glass text-slate-300 hover:text-white border border-white/10'
                        }
                      >
                        {item}
                      </button>
                    )
                  })}
                </div>

                <div
                  className={`mode-badge ${
                    isAdaptingDifficulty ? 'mode-badge--active' : ''
                  }`}
                >
                  <span
                    className={`mode-spinner ${
                      isAdaptingDifficulty ? 'mode-spinner--active' : ''
                    }`}
                    aria-hidden="true"
                  />
                <span>Adapting to: {displayDifficulty} mode</span>
              </div>
              </div>
            </section>

            <section className={`conversation-shell conversation-shell--${currentEmotionTheme.key}`}>
              <AnimatePresence mode="wait">
                {isConversationEmpty ? quickStart : null}
              </AnimatePresence>

              <div
                className={`conversation-banner ${
                  currentEmotionTheme.visible ? 'conversation-banner--visible' : ''
                } conversation-banner--${currentEmotionTheme.key}`}
              >
                <Brain size={16} />
                <span>{currentEmotionTheme.bannerText}</span>
              </div>

              <div className="conversation-feed">
                <AnimatePresence initial={false}>
                  {messages.map((message) => renderMessage(message))}
                </AnimatePresence>

                {isSending ? (
                  <motion.article
                    className="message-row message-row--assistant"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.22 }}
                    layout
                  >
                    <div className="message-bubble message-bubble--analysis">
                      <div className="message-meta">
                        <div className="message-meta__copy">
                          <div className="message-avatar">VB</div>
                          <div>
                            <span className="message-meta__label">VidyaBot</span>
                            <strong>Analyzing your learning signal</strong>
                          </div>
                        </div>
                      </div>

                      <div className="analysis-card">
                        <div className="analysis-dots" aria-hidden="true">
                          <span />
                          <span />
                          <span />
                        </div>
                        <span>{analysisMessages[analysisStep]}</span>
                      </div>
                    </div>
                  </motion.article>
                ) : null}

                <div ref={endRef} />
              </div>

              <form className="composer panel-card" onSubmit={(event) => { event.preventDefault(); submitQuestion(question) }}>
                <div className="composer__label-row">
                  <span className="composer__eyebrow">Ask your question</span>
                  <span className="composer__hint">
                    Press Enter to send. Use Shift+Enter for a new line.
                  </span>
                </div>

                <div className="composer__row">
                  <textarea
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        submitQuestion(question)
                      }
                    }}
                    placeholder="Type a question about the selected subject..."
                    rows={2}
                  />

                  <button type="submit" disabled={isSending || !question.trim()}>
                    <Send size={18} />
                    <span>{isSending ? 'Sending...' : 'Ask VidyaBot'}</span>
                  </button>
                </div>
              </form>
            </section>
          </section>
        </main>

        <AnimatePresence mode="wait">
          {isPanelOpen ? (
            <motion.aside
              key="panel-open"
              className="insight-panel panel-card"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <div className="insight-panel__header">
                <div>
                  <span className="insight-panel__eyebrow">Adaptive panel</span>
                  <h3>Learning pulse</h3>
                </div>

                <button
                  type="button"
                  className="panel-toggle"
                  onClick={() => setIsPanelOpen(false)}
                  aria-label="Collapse insights"
                >
                  <PanelRightClose size={18} />
                </button>
              </div>

              <section className="session-card">
                <div className="session-card__content">
                  <div className="session-card__bar">
                    <motion.span
                      className="session-card__bar-fill"
                      initial={{ height: 0 }}
                      animate={{ height: `${progressPercent}%` }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                    />
                  </div>

                  <div className="session-card__copy">
                    <strong>{questionsAsked}</strong>
                    <span>questions this session</span>
                    <div className="session-card__timer">
                      <Clock3 size={14} />
                      <span>{formatSessionTime(sessionSeconds)}</span>
                    </div>
                    <small>Goal progress: {sessionProgressText}</small>
                  </div>
                </div>

                <div className="session-card__progress">
                  <span>Progress to 20 questions</span>
                  <div className="session-card__progress-track">
                    <motion.div
                      className="session-card__progress-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </section>

              <div className="insight-section">
                <div className="insight-section__head">
                  <Brain size={16} />
                  <h4>Emotion tracker</h4>
                </div>

                <div className="insight-current">
                  <span className={currentEmotionTheme.chipClass}>
                    <span className={currentEmotionTheme.dotClass} />
                    {normalizeEmotion(currentEmotion)}
                  </span>
                  <small>Last 5 detected states</small>
                </div>

                <div className="emotion-stack">
                  {emotionHistory.length ? (
                    emotionHistory.map((emotion, index) => {
                      const tone = getEmotionTheme(emotion)
                      return (
                        <div key={`${emotion}-${index}`} className="emotion-stack__item">
                          <div className="emotion-stack__index">
                            <span className={tone.dotClass} />
                            <span>#{index + 1}</span>
                          </div>
                          <span className={tone.chipClass}>
                            <span className={tone.dotClass} />
                            {emotion}
                          </span>
                        </div>
                      )
                    })
                  ) : (
                    <div className="empty-state">
                      No emotion history yet. Send a question to start tracking the
                      session.
                    </div>
                  )}
                </div>
              </div>

              <div className="insight-section">
                <div className="insight-section__head">
                  <BarChart3 size={16} />
                  <h4>Subject mastery</h4>
                </div>

                <div className="mastery-list">
                  {subjectMastery.map((item) => (
                    <div key={item.name} className="mastery-item">
                      <div className="mastery-item__top">
                        <span>{item.name}</span>
                        <strong>{item.value}%</strong>
                      </div>
                      <div className="mastery-bar">
                        <motion.span
                          initial={{ width: 0 }}
                          animate={{ width: `${item.value}%` }}
                          transition={{ duration: 0.55, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="insight-section">
                <div className="insight-section__head">
                  <Activity size={16} />
                  <h4>Session snapshot</h4>
                </div>

                <div className="snapshot-list">
                  {sessionSummary.map((item) => (
                    <div key={item.label} className="snapshot-row">
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </motion.aside>
          ) : (
            <motion.aside
              key="panel-collapsed"
              className="insight-panel insight-panel--collapsed panel-card"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <button
                type="button"
                className="panel-toggle panel-toggle--center"
                onClick={() => setIsPanelOpen(true)}
                aria-label="Expand insights"
              >
                <PanelRightOpen size={18} />
              </button>

              <div className="collapsed-pill-stack" aria-hidden="true">
                <span className="collapsed-pill">{questionsAsked}</span>
                <span className="collapsed-pill">{normalizeEmotion(currentEmotion)}</span>
                <span className="collapsed-pill">{subject}</span>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      <footer className="site-footer text-center text-xs text-slate-600 py-3 border-t border-white/5 w-full">
        Powered by LangChain + FAISS + Groq AI | VidyaBot 2026 | Bharat Academix CodeQuest
      </footer>
    </div>
  )
}

export default App
