'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/firebase-auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export default function CreateRoom() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState<{
    name: string
    maxCards: number | ''
    rules: string[]
  }>({
    name: '',
    maxCards: 10,
    rules: ['line', 'column', 'full'],
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (!formData.name.trim()) {
      alert('Informe o nome da sala')
      return
    }

    if (formData.maxCards === '' || formData.maxCards <= 0) {
      alert('Informe a quantidade de cartelas')
      return
    }

    try {
      setLoading(true)

      const roomId = generateUUID()

      const response = await fetch(`${API_URL}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: roomId,
          name: formData.name,
          maxCards: formData.maxCards,
          rules: formData.rules,
          ownerId: user?.uid,
        }),
      })

      if (!response.ok) throw new Error('Erro ao criar sala')

      router.push(`/rooms/${roomId}`)
    } catch (error) {
      console.error(error)
      alert('Erro ao criar sala')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return <p className="text-center mt-10">Carregando...</p>
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white p-6 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">Criar Sala</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome da sala</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Quantidade de cartelas
            </label>
            <input
              type="number"
              min={1}
              value={formData.maxCards}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  maxCards:
                    e.target.value === '' ? '' : Number(e.target.value),
                })
              }
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Criando...' : 'Criar sala'}
          </button>
        </form>

        <Link
          href="/"
          className="block text-center text-sm text-blue-600 mt-4 hover:underline"
        >
          Voltar
        </Link>
      </div>
    </div>
  )
    }
