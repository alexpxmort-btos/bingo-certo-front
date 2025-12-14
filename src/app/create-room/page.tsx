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

  // IMPORTANTE: maxCards aceita number ou string vazia
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

  function handleChangeName(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData({
      ...formData,
      name: e.target.value,
    })
  }

  function handleChangeMaxCards(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value

    setFormData({
      ...formData,
      maxCards: value === '' ? '' : Number(value),
    })
  }

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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: roomId,
          name: formData.name,
          maxCards: formData.maxCards,
          rules: formData.rules,
          ownerId: user?.uid,
        }),
      })

      if (!response.ok) {
        throw new Error('Erro ao criar sala')
      }

      router.push(`/rooms/${roomId}`)
    } catch (error) {
      console.error(error)
      alert('Erro ao criar sala')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return <p>Carregando...</p>
  }

  return (
    <div style={{ maxWidth: 400, margin: '0 auto' }}>
      <h1>Criar Sala</h1>

      <form onSubmit={handleSubmit}>
        <div>
          <label>Nome da sala</label>
          <input
            type="text"
            value={formData.name}
            onChange={handleChangeName}
            required
          />
        </div>

        <div>
          <label>Quantidade de cartelas</label>
          <input
            type="number"
            min={1}
            value={formData.maxCards}
            onChange={handleChangeMaxCards}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Criando...' : 'Criar sala'}
        </button>
      </form>

      <Link href="/">Voltar</Link>
    </div>
  )
}
