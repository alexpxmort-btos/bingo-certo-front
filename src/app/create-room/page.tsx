'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/firebase-auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function CreateRoom() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    maxCards: 10,
    rules: ['line', 'column', 'full'] as string[]
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      router.push('/login')
      return
    }

    setLoading(true)
    
    try {
      const response = await fetch(`${API_URL}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          hostId: user.uid,
          hostName: user.displayName || user.email || 'Host',
          maxCards: formData.maxCards,
          rules: formData.rules,
        }),
      })

      if (!response.ok) {
        throw new Error('Erro ao criar sala')
      }

      const room = await response.json()
      router.push(`/room/${room.code}`)
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao criar sala. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Carregando...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const toggleRule = (rule: string) => {
    setFormData(prev => ({
      ...prev,
      rules: prev.rules.includes(rule)
        ? prev.rules.filter(r => r !== rule)
        : [...prev.rules, rule]
    }))
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <Link href="/" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
          ← Voltar
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Criar Sala de Bingo
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Nome da Sala
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Ex: Bingo da Família"
              required
            />
          </div>

          <div>
            <label htmlFor="maxCards" className="block text-sm font-medium text-gray-700 mb-2">
              Quantidade Máxima de Cartelas
            </label>
            <input
              type="number"
              id="maxCards"
              value={formData.maxCards}
              onChange={(e) => setFormData(prev => ({ ...prev, maxCards: parseInt(e.target.value) || 10 }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              min="1"
              max="50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Regras do Bingo
            </label>
            <div className="space-y-2">
              {[
                { value: 'line', label: 'Linha' },
                { value: 'column', label: 'Coluna' },
                { value: 'diagonal', label: 'Diagonal' },
                { value: 'full', label: 'Cartela Cheia' }
              ].map(rule => (
                <label key={rule.value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.rules.includes(rule.value)}
                    onChange={() => toggleRule(rule.value)}
                    className="mr-2 w-4 h-4 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-gray-700">{rule.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || formData.rules.length === 0}
            className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Criando...' : 'Criar Sala'}
          </button>
        </form>
      </div>
    </main>
  )
}

