'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Send, Moon, Sun, RotateCcw, MessageCircle } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  error?: boolean
}

const AGENT_ID = '68fd7252be2defc486f45787'

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full">
        <MessageCircle className="w-12 h-12 text-blue-500" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Welcome to Resume Chatbot
      </h2>
      <p className="text-gray-600 dark:text-gray-400 max-w-sm mb-6">
        Ask me anything about Shreyas's professional background, experience, skills, and education.
      </p>
      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
        <p className="font-semibold text-gray-700 dark:text-gray-300 mb-3">Try asking:</p>
        <div className="space-y-2">
          <p>"What is Shreyas's professional experience?"</p>
          <p>"What skills does Shreyas have?"</p>
          <p>"What is Shreyas's education?"</p>
        </div>
      </div>
    </div>
  )
}

function MessageSkeleton() {
  return (
    <div className="flex gap-3 mb-4">
      <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  )
}

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 mb-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarImage src={isUser ? '' : 'https://api.dicebear.com/7.x/avataaars/svg?seed=shreyas'} />
        <AvatarFallback className={isUser ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'}>
          {isUser ? 'You' : 'SR'}
        </AvatarFallback>
      </Avatar>

      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-xs sm:max-w-md`}>
        <div
          className={`rounded-lg px-4 py-2 ${
            isUser
              ? 'bg-blue-500 text-white rounded-br-none'
              : message.error
                ? 'bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-200 border border-red-200 dark:border-red-800 rounded-bl-none'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-none'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        </div>

        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Initialize dark mode from localStorage
  useEffect(() => {
    const isDarkMode = localStorage.getItem('theme') === 'dark'
    setIsDark(isDarkMode)
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  function toggleTheme() {
    const newIsDark = !isDark
    setIsDark(newIsDark)
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light')
    if (newIsDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()

    if (!inputValue.trim() || loading) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setLoading(true)

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          agent_id: AGENT_ID,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to get response')
      }

      // Extract response content with fallbacks for nested structure
      let responseContent = ''

      // Try raw_response first (actual content from agent)
      if (data.raw_response) {
        responseContent = data.raw_response
      }
      // Fallback to response if it's a string
      else if (typeof data.response === 'string') {
        responseContent = data.response
      }
      // Try nested fields
      else if (data.response?.result) {
        responseContent = data.response.result
      } else if (data.response?.message) {
        responseContent = data.response.message
      }
      // Last resort
      else {
        responseContent = JSON.stringify(data.response)
      }

      if (!responseContent || responseContent.trim() === '') {
        throw new Error('No content in response')
      }

      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: responseContent || 'Unable to process your question.',
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: error instanceof Error ? error.message : 'An error occurred. Please try again.',
        timestamp: new Date(),
        error: true,
      }

      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleReset() {
    setMessages([])
    setInputValue('')
    inputRef.current?.focus()
  }

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDark ? 'dark' : ''}`}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl h-screen sm:h-[600px] flex flex-col shadow-2xl border-0 sm:border bg-white dark:bg-gray-900 backdrop-blur-sm">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                Resume Chatbot
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Ask about Shreyas's background
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {isDark ? (
                  <Sun className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                )}
              </button>

              {messages.length > 0 && (
                <button
                  onClick={handleReset}
                  aria-label="Reset chat"
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                </button>
              )}
            </div>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4 sm:p-6">
            {messages.length === 0 ? (
              <EmptyState />
            ) : (
              <div>
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}

                {loading && (
                  <div className="mb-4">
                    <MessageSkeleton />
                  </div>
                )}

                <div ref={scrollRef} />
              </div>
            )}
          </ScrollArea>

          <Separator className="dark:bg-gray-800" />

          {/* Input Area */}
          <form onSubmit={handleSendMessage} className="p-4 sm:p-6">
            <div className="flex gap-3 items-end">
              <Input
                ref={inputRef}
                type="text"
                placeholder="Ask about Shreyas's experience, skills, education..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={loading}
                className="flex-1 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus-visible:ring-blue-500 disabled:opacity-50"
                aria-label="Chat message input"
              />

              <Button
                type="submit"
                disabled={loading || !inputValue.trim()}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 text-white rounded-lg px-4 py-2 sm:px-6 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex-shrink-0 font-medium shadow-md hover:shadow-lg disabled:shadow-none transform hover:scale-105 disabled:hover:scale-100 active:scale-95"
                aria-label="Send message"
              >
                <div className="flex items-center gap-2">
                  <Send className={`w-5 h-5 transition-transform duration-200 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Send</span>
                </div>
              </Button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              Information retrieved from Shreyas's resume
            </p>
          </form>
        </Card>
      </div>
    </div>
  )
}
