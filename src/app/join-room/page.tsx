'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function JoinRoomForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roomCode = searchParams.get('code')
  
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    code: roomCode || '',
    nickname: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const visitorId = generateUUID()
      
      const response = await fetch(`${API_URL}/rooms/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: formData.code.toUpperCase(),
          visitorId,
          nickname: formData.nickname,
        }),
      })

      if (!response.ok) {
        throw new Error('Erro ao entrar na sala')
      }

      // Salvar dados localmente
      if (typeof window !== 'undefined') {
        localStorage.setItem(`visitor-${formData.code.toUpperCase()}`, visitorId)
        localStorage.setItem(`nickname-${formData.code.toUpperCase()}`, formData.nickname)
      }

      router.push(`/room/${formData.code.toUpperCase()}`)
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao entrar na sala. Verifique o código e tente novamente.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
          Código da Sala
        </label>
        <input
          type="text"
          id="code"
          value={formData.code}
          onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent uppercase"
          placeholder="ABC123"
          required
          maxLength={6}
        />
      </div>

      <div>
        <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-2">
          Seu Apelido
        </label>
        <input
          type="text"
          id="nickname"
          value={formData.nickname}
          onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder="Ex: João"
          required
          maxLength={20}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Entrando...' : 'Entrar na Sala'}
      </button>
    </form>
  )
}

export default function JoinRoom() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <Link href="/" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
          ← Voltar
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Entrar em uma Sala
        </h1>

        <Suspense fallback={
          <div className="space-y-6">
            <div className="animate-pulse">
              <div className="h-10 bg-gray-200 rounded-lg mb-4"></div>
              <div className="h-10 bg-gray-200 rounded-lg mb-4"></div>
              <div className="h-12 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        }>
          <JoinRoomForm />
        </Suspense>
      </div>
    </main>
  )
}


