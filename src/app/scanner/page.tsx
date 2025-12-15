'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'

const OCR_API_URL = 'https://bingo-ocr.onrender.com/ocr/cartela'

interface CardCell {
  number: number
  marked: boolean
}

export default function ScannerPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scannedCard, setScannedCard] = useState<CardCell[][] | null>(null)

  // Modal edição
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return

    setSelectedFile(file)
    setScannedCard(null)
    setError(null)

    const reader = new FileReader()
    reader.onloadend = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleScan = async () => {
    if (!selectedFile) return

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch(OCR_API_URL, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      const card: CardCell[][] = data.cartela.map((row: number[]) =>
        row.map((num: number) => ({ number: num, marked: false }))
      )

      setScannedCard(card)
    } catch {
      setError('Erro ao escanear a cartela')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setSelectedFile(null)
    setPreview(null)
    setScannedCard(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // 🔵 Modal helpers
  const openEditModal = (row: number, col: number, value: number) => {
    if (row === 2 && col === 2) return // centro não edita
    setEditingCell({ row, col })
    setEditValue(value === 0 ? '' : String(value))
    setIsModalOpen(true)
  }

  const saveEdit = () => {
    if (!editingCell || !scannedCard) return
    const num = Number(editValue)
    if (isNaN(num) || num < 1 || num > 99) {
      alert('Número inválido')
      return
    }

    setScannedCard(prev =>
      prev!.map((row, i) =>
        row.map((cell, j) =>
          i === editingCell.row && j === editingCell.col
            ? { number: num, marked: false }
            : cell
        )
      )
    )

    setIsModalOpen(false)
    setEditingCell(null)
    setEditValue('')
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <div className="flex justify-between mb-6">
            <h1 className="text-3xl font-bold">Scanner de Cartela</h1>
            <Link href="/" className="px-4 py-2 bg-gray-500 text-white rounded">
              Voltar
            </Link>
          </div>

          {error && <div className="bg-red-100 p-4 rounded mb-4">{error}</div>}

          <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={handleFileSelect} />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-3 bg-blue-600 text-white rounded"
          >
            Escolher imagem
          </button>

          {preview && <img src={preview} className="mt-4 rounded" />}

          {selectedFile && !scannedCard && (
            <button
              onClick={handleScan}
              className="mt-4 px-6 py-3 bg-green-600 text-white rounded"
            >
              {loading ? 'Processando...' : 'Escanear'}
            </button>
          )}

          {scannedCard && (
            <div className="mt-6">
              <div className="grid grid-cols-5 gap-2 mb-2">
                {['B', 'I', 'N', 'G', 'O'].map(l => (
                  <div key={l} className="text-center font-bold">{l}</div>
                ))}
              </div>

              <div className="grid grid-cols-5 gap-2">
                {scannedCard.map((row, i) =>
                  row.map((cell, j) => {
                    const isCenter = i === 2 && j === 2
                    return (
                      <button
                        key={`${i}-${j}`}
                        onClick={() => openEditModal(i, j, cell.number)}
                        className={`aspect-square rounded font-bold ${
                          isCenter
                            ? 'bg-yellow-500 text-white'
                            : cell.marked
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200'
                        }`}
                      >
                        {isCenter ? 'FREE' : cell.number || 'FREE'}
                      </button>
                    )
                  })
                )}
              </div>

              <button
                onClick={handleReset}
                className="mt-4 px-6 py-3 bg-gray-500 text-white rounded"
              >
                Escanear outra
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 🔴 MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-80">
            <h2 className="text-lg font-bold mb-4">Editar número</h2>

            <input
              type="number"
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              className="w-full border p-2 rounded mb-4"
              placeholder="Digite o número"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-400 text-white rounded"
              >
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
      }
  
