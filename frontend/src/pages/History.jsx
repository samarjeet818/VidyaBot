import { useEffect, useState } from 'react'
import { ArrowLeft, Bookmark, BookmarkCheck, Clock3, Trash2 } from 'lucide-react'
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase'

const toMillis = (value) => {
  if (!value) return 0
  if (typeof value?.toDate === 'function') return value.toDate().getTime()
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

const formatTimeAgo = (value) => {
  const dateValue = value?.toDate ? value.toDate() : new Date(value || 0)
  const diff = Date.now() - dateValue.getTime()
  if (!Number.isFinite(diff) || diff < 0) return 'Just now'

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  return `${days} day${days === 1 ? '' : 's'} ago`
}

function History({ user, onBack, onLogout }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyAction, setBusyAction] = useState('')

  useEffect(() => {
    if (!user?.uid) return undefined

    const unsubscribe = onSnapshot(
      collection(db, 'sessions'),
      (snapshot) => {
        const data = snapshot.docs
          .map((entry) => ({
            id: entry.id,
            ...entry.data(),
          }))
          .filter((entry) => entry.userId === user.uid)
          .sort((left, right) => toMillis(right.timestamp) - toMillis(left.timestamp))
          .slice(0, 20)

        setSessions(data)
        setLoading(false)
      },
      (err) => {
        setError(
          err?.message ||
            'Could not load learning history. Please check your Firestore rules.',
        )
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [user?.uid])

  const handleBookmark = async (sessionId) => {
    setBusyAction(`bookmark-${sessionId}`)

    try {
      await updateDoc(doc(db, 'sessions', sessionId), {
        bookmarked: true,
      })
    } catch (err) {
      setError(err?.message || 'Unable to bookmark this session.')
    } finally {
      setBusyAction('')
    }
  }

  const handleDelete = async (sessionId) => {
    const confirmed = window.confirm(
      'Delete this learning session from your history?',
    )

    if (!confirmed) return

    setBusyAction(`delete-${sessionId}`)

    try {
      await deleteDoc(doc(db, 'sessions', sessionId))
    } catch (err) {
      setError(err?.message || 'Unable to delete this session.')
    } finally {
      setBusyAction('')
    }
  }

  const learnerName =
    user?.displayName || user?.email || user?.phoneNumber || 'Student'

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10rem] top-20 h-72 w-72 rounded-full bg-[#e94560]/12 blur-3xl" />
        <div className="absolute right-[-8rem] top-36 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-8 md:py-12">
        <div className="rounded-[1.75rem] border border-white/10 bg-white/5 px-5 py-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-[#e94560]/40 hover:bg-[#e94560]/10"
              >
                <ArrowLeft size={16} />
                Back
              </button>

              <div>
                <h1 className="text-xl font-bold tracking-tight md:text-3xl">
                  My Learning History
                </h1>
                <p className="text-sm text-slate-400">
                  Realtime sessions saved from your VidyaBot chats.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-slate-300 md:block">
                {learnerName}
              </div>

              {onLogout ? (
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded-full border border-[#e94560]/30 bg-[#e94560]/10 px-4 py-2 text-sm font-semibold text-[#ffd6de] transition hover:bg-[#e94560]/20"
                >
                  Logout
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="grid gap-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-[1.5rem] border border-white/10 bg-white/5 p-5"
                >
                  <div className="mb-4 flex items-center gap-2">
                    <div className="h-5 w-24 rounded-full bg-white/10" />
                    <div className="h-5 w-20 rounded-full bg-white/10" />
                    <div className="ml-auto h-5 w-20 rounded-full bg-white/10" />
                  </div>
                  <div className="h-4 w-3/4 rounded-full bg-white/10" />
                  <div className="mt-4 h-3 w-full rounded-full bg-white/10" />
                  <div className="mt-2 h-3 w-5/6 rounded-full bg-white/10" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-[1.5rem] border border-rose-400/20 bg-rose-500/10 p-5 text-rose-100">
              {error}
            </div>
          ) : sessions.length ? (
            <div className="grid gap-4">
              {sessions.map((session) => {
                const preview = String(session.answer || '')
                  .replace(/\s+/g, ' ')
                  .trim()
                const shortPreview =
                  preview.length > 100 ? `${preview.slice(0, 100)}...` : preview
                const isBookmarked = Boolean(session.bookmarked)
                const isBookmarkBusy = busyAction === `bookmark-${session.id}`
                const isDeleteBusy = busyAction === `delete-${session.id}`

                return (
                  <article
                    key={session.id}
                    className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[#e94560]/30 bg-[#e94560]/10 px-3 py-1 text-xs font-semibold text-[#ffb3c0]">
                        {session.subject || 'General'}
                      </span>
                      <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                        {session.difficulty || 'Medium'}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
                        {session.emotion || 'Neutral'}
                      </span>
                      <span className="ml-auto text-xs text-slate-400">
                        {formatTimeAgo(session.timestamp)}
                      </span>
                    </div>

                    <div className="mt-4 flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-bold text-white">
                          {session.question || 'Untitled question'}
                        </h2>
                        <p className="mt-3 text-sm leading-6 text-slate-300">
                          {shortPreview || 'No answer saved yet.'}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col gap-2">
                        {isBookmarked ? (
                          <span className="inline-flex items-center justify-center rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-sm font-semibold text-amber-100">
                            <BookmarkCheck size={14} className="mr-1" />
                            Bookmarked
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleBookmark(session.id)}
                            disabled={isBookmarkBusy}
                            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-amber-300/30 hover:bg-amber-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isBookmarkBusy ? (
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-amber-300" />
                            ) : (
                              <Bookmark size={14} className="mr-1" />
                            )}
                            Bookmark
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDelete(session.id)}
                          disabled={isDeleteBusy}
                          className="inline-flex items-center justify-center rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isDeleteBusy ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose-100/40 border-t-rose-100" />
                          ) : (
                            <Trash2 size={14} className="mr-1" />
                          )}
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-10 text-center text-slate-300">
              <Clock3 size={22} className="mx-auto mb-3 text-[#e94560]" />
              No sessions yet. Start learning!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default History
