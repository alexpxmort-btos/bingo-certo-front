'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const OCR_API_URL = 'https://bingo-ocr.onrender.com/ocr/cartela'

interface CardCell {
  number: number;
  marked: boolean;
}

export default function ScannerPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scannedCard, setScannedCard] = useState<CardCell[][] | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione um arquivo de imagem')
      return
    }

    setSelectedFile(file)
    setError(null)
    setScannedCard(null)

    // Criar preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleScan = async () => {
    if (!selectedFile) {
      setError('Por favor, selecione uma imagem primeiro')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch(OCR_API_URL, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro ao processar imagem' }))
        throw new Error(errorData.message || 'Erro ao processar imagem')
      }

      const data = await response.json()
      console.log('Resposta da API:', data)
      
      // A API retorna uma matriz aninhada 5x5
      if (!data.cartela || !Array.isArray(data.cartela) || data.cartela.length !== 5) {
        throw new Error('Formato de resposta inválido da API. Esperado: { "cartela": [[...], [...], ...] }')
      }
      
      // Converter a matriz aninhada para o formato de cartela
      const card: CardCell[][] = data.cartela.map((row: number[]) => {
        if (!Array.isArray(row) || row.length !== 5) {
          throw new Error('Formato de linha inválido na resposta da API')
        }
        return row.map((number: number) => ({
          number: number,
          marked: false,
        }))
      })
      
      setScannedCard(card)
    } catch (err: any) {
      console.error('Erro ao escanear cartela:', err)
      setError(err.message || 'Erro ao processar a imagem. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setSelectedFile(null)
    setPreview(null)
    setScannedCard(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Scanner de Cartela</h1>
            <Link
              href="/"
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Voltar
            </Link>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Upload de imagem */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Selecione uma imagem da cartela
              </label>
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-input"
                />
                <label
                  htmlFor="file-input"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors"
                >
                  Escolher Imagem
                </label>
                {selectedFile && (
                  <span className="text-gray-700">{selectedFile.name}</span>
                )}
              </div>
            </div>

            {/* Preview da imagem */}
            {preview && (
              <div>
                <h2 className="text-xl font-semibold mb-3">Preview da Imagem</h2>
                <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-w-full h-auto mx-auto rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Botões de ação */}
            {selectedFile && !scannedCard && (
              <div className="flex gap-4">
                <button
                  onClick={handleScan}
                  disabled={loading}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processando...' : 'Escanear Cartela'}
                </button>
                <button
                  onClick={handleReset}
                  disabled={loading}
                  className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 disabled:opacity-50"
                >
                  Limpar
                </button>
              </div>
            )}

            {/* Cartela escaneada */}
            {scannedCard && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Cartela Escaneada</h2>
                <div className="bg-white border-2 border-gray-300 rounded-lg p-6">
                  {/* Cabeçalho B I N G O */}
                  <div className="grid grid-cols-5 gap-2 mb-2">
                    {['B', 'I', 'N', 'G', 'O'].map((letter, idx) => (
                      <div
                        key={letter}
                        className="aspect-square flex items-center justify-center rounded-lg font-bold text-2xl bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-md"
                      >
                        {letter}
                      </div>
                    ))}
                  </div>
                  
                  {/* Cartela */}
                  <div className="grid grid-cols-5 gap-2">
                    {scannedCard.map((row, i) =>
                      row.map((cell, j) => {
                        const isCenter = i === 2 && j === 2
                        const isFree = cell.number === 0
                        
                        return (
                          <button
                            key={`${i}-${j}`}
                            onClick={() => {
                              if (!isCenter && !isFree) {
                                // Toggle marcação
                                setScannedCard((prev) => {
                                  if (!prev) return null
                                  const newCard = prev.map((r, ri) =>
                                    r.map((c, cj) => {
                                      if (ri === i && cj === j) {
                                        return { ...c, marked: !c.marked }
                                      }
                                      return c
                                    })
                                  )
                                  return newCard
                                })
                              }
                            }}
                            disabled={isCenter || isFree}
                            className={`aspect-square flex items-center justify-center rounded-lg font-semibold text-lg transition-all ${
                              isCenter || isFree
                                ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white font-bold cursor-default'
                                : cell.marked
                                ? 'bg-green-500 text-white hover:bg-green-600 cursor-pointer'
                                : 'bg-gray-200 text-gray-800 hover:bg-gray-300 cursor-pointer'
                            }`}
                          >
                            {isCenter || isFree ? 'FREE' : cell.number || '-'}
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>

                <div className="mt-6">
                  <p className="text-sm text-gray-600 mb-4">
                    💡 Clique nos números para marcá-los como selecionados. O centro (FREE) não pode ser marcado.
                  </p>
                  <div className="flex gap-4">
                    <button
                      onClick={handleReset}
                      className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
                    >
                      Escanear Outra
                    </button>
                    <button
                      onClick={() => {
                        // Limpar todas as marcações
                        setScannedCard((prev) => {
                          if (!prev) return null
                          return prev.map((row) =>
                            row.map((cell) => ({ ...cell, marked: false }))
                          )
                        })
                      }}
                      className="px-6 py-3 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600"
                    >
                      Limpar Marcações
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

