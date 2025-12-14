'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSocket, disconnectSocket } from '@/lib/socket'
import { useAuth } from '@/lib/firebase-auth'
import { Socket } from 'socket.io-client'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface CardCell {
  number: number;
  marked: boolean;
}

interface Card {
  id: string;
  ownerId: string;
  ownerName: string;
  cells: CardCell[][];
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const roomCode = params.code as string
  const socketRef = useRef<Socket | null>(null)
  const [loading, setLoading] = useState(true)
  const [room, setRoom] = useState<any>(null)
  const [game, setGame] = useState<any>(null)
  const [myCard, setMyCard] = useState<Card | null>(null)
  const [visitorId] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`visitor-${roomCode}`)
      if (stored) return stored
      const newId = generateUUID()
      localStorage.setItem(`visitor-${roomCode}`, newId)
      return newId
    }
    return generateUUID()
  })
  const [nickname] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`nickname-${roomCode}`) || 'Visitante'
    }
    return 'Visitante'
  })
  const [isHost, setIsHost] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [winnerModal, setWinnerModal] = useState<{ show: boolean; winnerName: string; winnerId: string }>({
    show: false,
    winnerName: '',
    winnerId: '',
  })
  const [winningCells, setWinningCells] = useState<{ row?: number; col?: number; diagonal?: 'main' | 'anti' | null; full?: boolean } | null>(null)

  useEffect(() => {
    loadRoom()
    setupSocket()

    return () => {
      cleanupSocket()
    }
  }, [roomCode, visitorId, user?.uid])

  const loadRoom = async () => {
    try {
      const response = await fetch(`${API_URL}/rooms/${roomCode}`)
      if (!response.ok) {
        router.push('/join-room?code=' + roomCode)
        return
      }
      const data = await response.json()
      setRoom(data)
      if (data.game) {
        setGame({
          ...data.game,
          drawnNumbers: data.game.drawnNumbers || [],
        })
        
        // Se o jogo terminou e há vencedor, detectar células vencedoras
        if (data.game.isFinished && data.game.winner) {
          // Buscar cartela do vencedor
          const winnerCard = data.game.cards?.find((card: any) => 
            card.ownerId === data.game.winner
          )
          
          if (winnerCard && (data.game.winner === visitorId || data.game.winner === user?.uid)) {
            const cardWithCells = {
              id: winnerCard.id,
              ownerId: winnerCard.ownerId,
              ownerName: winnerCard.ownerName,
              cells: winnerCard.cells.map((row: any[]) => 
                row.map((cell: any) => ({
                  number: cell.number,
                  marked: cell.marked || false,
                }))
              ),
            }
            setMyCard(cardWithCells)
            // Detectar células vencedoras
            detectWinningCells(cardWithCells, data.rules || [])
          }
        }
      } else {
        setGame(null)
      }
      
      // Verificar se o usuário é o host
      if (user && data.hostId === user.uid) {
        setIsHost(true)
        // Se o host está na sala e o jogo já começou, buscar sua cartela
        if (data.game && data.game.cards && !data.game.isFinished) {
          const hostCard = data.game.cards.find((card: any) => card.ownerId === user.uid)
          if (hostCard && hostCard.cells) {
            // Garantir que a estrutura da cartela está correta
            const cardWithCells = {
              id: hostCard.id,
              ownerId: hostCard.ownerId,
              ownerName: hostCard.ownerName,
              cells: hostCard.cells.map((row: any[]) => 
                row.map((cell: any) => ({
                  number: cell.number,
                  marked: cell.marked || false,
                }))
              ),
            }
            setMyCard(cardWithCells)
          }
        }
      } else {
        // Se não é host, verificar se é visitante e buscar cartela
        if (data.game && data.game.cards && !data.game.isFinished) {
          const visitorCard = data.game.cards.find((card: any) => card.ownerId === visitorId)
          if (visitorCard && visitorCard.cells) {
            // Garantir que a estrutura da cartela está correta
            const cardWithCells = {
              id: visitorCard.id,
              ownerId: visitorCard.ownerId,
              ownerName: visitorCard.ownerName,
              cells: visitorCard.cells.map((row: any[]) => 
                row.map((cell: any) => ({
                  number: cell.number,
                  marked: cell.marked || false,
                }))
              ),
            }
            setMyCard(cardWithCells)
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar sala:', error)
    } finally {
      setLoading(false)
    }
  }

  const cleanupSocket = () => {
    if (socketRef.current) {
      // Remover todos os listeners
      socketRef.current.removeAllListeners('game-started')
      socketRef.current.removeAllListeners('number-drawn')
      socketRef.current.removeAllListeners('bingo-won')
      socketRef.current.removeAllListeners('bingo-validated')
      socketRef.current.removeAllListeners('bingo-invalid')
      
      // Remover listeners específicos de cartela
      const userId = user?.uid || visitorId
      socketRef.current.removeAllListeners(`card-assigned-${userId}`)
      socketRef.current.removeAllListeners(`card-updated-${userId}`)
      
      socketRef.current.disconnect()
      socketRef.current = null
    }
  }

  const setupSocket = () => {
    // Limpar listeners anteriores antes de criar novos
    cleanupSocket()

    const socket = getSocket()
    socketRef.current = socket

    // Conectar e entrar na sala
    if (!socket.connected) {
      socket.connect()
    }
    
    socket.emit('join-room', { roomCode, visitorId })

    // Handler para quando o jogo inicia
    const handleGameStarted = (data: any) => {
      console.log('Jogo iniciado recebido:', data)
      setGame((prev: any) => ({
        ...prev,
        ...data.game,
        drawnNumbers: data.game.drawnNumbers || [],
      }))
      loadRoom()
    }

    // Handler para cartela atribuída
    const userId = user?.uid || visitorId
    const handleCardAssigned = (data: any) => {
      if (data.card && data.card.cells) {
        const cardWithCells = {
          id: data.card.id,
          ownerId: data.card.ownerId,
          ownerName: data.card.ownerName,
          cells: data.card.cells.map((row: any[]) =>
            row.map((cell: any) => ({
              number: cell.number,
              marked: cell.marked || false,
            }))
          ),
        }
        setMyCard(cardWithCells)
      }
    }

    // Handler para número sorteado
    const handleNumberDrawn = (data: any) => {
      console.log('Número sorteado recebido:', data)
      
      setGame((prev: any) => {
        const newDrawnNumbers = Array.isArray(data.drawnNumbers) 
          ? data.drawnNumbers 
          : (prev?.drawnNumbers || [])
        
        const updated = {
          ...prev,
          drawnNumbers: newDrawnNumbers,
          winner: data.winner,
          isFinished: data.isFinished,
        }
        
        // Se o jogo acabou e o usuário ganhou, detectar células vencedoras
        if (data.isFinished && data.winner && myCard && 
            (data.winner === visitorId || data.winner === user?.uid)) {
          detectWinningCells(myCard, room?.rules || [])
        }
        
        return updated
      })
      
      // Atualizar cartela marcando o número sorteado
      setMyCard((prevCard: any) => {
        if (!prevCard || !data.number) return prevCard
        
        return {
          ...prevCard,
          cells: prevCard.cells.map((row: any[]) =>
            row.map((cell: any) => ({
              ...cell,
              marked: cell.number === data.number ? true : cell.marked
            }))
          ),
        }
      })

      if (soundEnabled) {
        playSound('draw')
      }
    }

    // Handler para cartela atualizada
    const handleCardUpdated = (data: any) => {
      if (data.card && data.card.cells) {
        const updatedCard = {
          id: data.card.id,
          ownerId: data.card.ownerId,
          ownerName: data.card.ownerName,
          cells: data.card.cells.map((row: any[]) =>
            row.map((cell: any) => ({
              number: cell.number,
              marked: cell.marked || false,
            }))
          ),
        }
        setMyCard(updatedCard)
      }
    }

    // Handler para bingo ganho
    const handleBingoWon = (data: any) => {
      if (soundEnabled) {
        playSound('win')
      }
      
      const winnerName = data.winnerName || 
        room?.game?.cards?.find((c: any) => c.ownerId === data.winner)?.ownerName || 
        'Alguém'
      
      setWinnerModal({
        show: true,
        winnerName: winnerName,
        winnerId: data.winner || '',
      })
      
      // Atualizar o jogo com o nome do vencedor
      setGame((prev: any) => ({
        ...prev,
        winner: data.winner,
        isFinished: true,
      }))
      
      // Detectar quais células formaram o bingo
      if (myCard && (data.winner === visitorId || data.winner === user?.uid)) {
        detectWinningCells(myCard, room?.rules || [])
      }
    }

    // Handler para bingo validado
    const handleBingoValidated = (data: any) => {
      if (data.visitorId === visitorId || data.visitorId === user?.uid) {
        if (soundEnabled) {
          playSound('win')
        }
      }
    }

    // Handler para bingo inválido
    const handleBingoInvalid = (data: any) => {
      if (data.visitorId === visitorId || data.visitorId === user?.uid) {
        if (soundEnabled) {
          playSound('error')
        }
        alert('Bingo inválido!')
      }
    }

    // Registrar todos os listeners
    socket.on('game-started', handleGameStarted)
    socket.on(`card-assigned-${userId}`, handleCardAssigned)
    socket.on('number-drawn', handleNumberDrawn)
    socket.on(`card-updated-${userId}`, handleCardUpdated)
    socket.on('bingo-won', handleBingoWon)
    socket.on('bingo-validated', handleBingoValidated)
    socket.on('bingo-invalid', handleBingoInvalid)

    // Tratamento de erros e reconexão
    socket.on('connect', () => {
      console.log('WebSocket conectado')
      socket.emit('join-room', { roomCode, visitorId })
    })

    socket.on('disconnect', () => {
      console.log('WebSocket desconectado')
    })

    socket.on('connect_error', (error) => {
      console.error('Erro de conexão WebSocket:', error)
    })
  }

  const detectWinningCells = (card: Card, rules: string[]) => {
    // Verificar cartela cheia primeiro (tem prioridade)
    if (rules.includes('full') && card.cells.every(row => row.every(cell => cell.marked))) {
      setWinningCells({ full: true })
      return
    }
    
    // Verificar linhas
    if (rules.includes('line')) {
      for (let i = 0; i < 5; i++) {
        if (card.cells[i].every(cell => cell.marked)) {
          setWinningCells({ row: i })
          return
        }
      }
    }
    
    // Verificar colunas
    if (rules.includes('column')) {
      for (let j = 0; j < 5; j++) {
        if (card.cells.every(row => row[j] && row[j].marked)) {
          setWinningCells({ col: j })
          return
        }
      }
    }
    
    // Verificar diagonais
    if (rules.includes('diagonal')) {
      // Diagonal principal (0,0 -> 4,4)
      let mainDiagonalComplete = true
      for (let i = 0; i < 5; i++) {
        if (!card.cells[i] || !card.cells[i][i] || !card.cells[i][i].marked) {
          mainDiagonalComplete = false
          break
        }
      }
      if (mainDiagonalComplete) {
        setWinningCells({ diagonal: 'main' })
        return
      }
      
      // Diagonal secundária (0,4 -> 4,0)
      let antiDiagonalComplete = true
      for (let i = 0; i < 5; i++) {
        if (!card.cells[i] || !card.cells[i][4 - i] || !card.cells[i][4 - i].marked) {
          antiDiagonalComplete = false
          break
        }
      }
      if (antiDiagonalComplete) {
        setWinningCells({ diagonal: 'anti' })
        return
      }
    }
    
    // Se nenhuma regra foi encontrada, limpar
    setWinningCells(null)
  }

  const playSound = (type: 'draw' | 'win' | 'error') => {
    if (typeof window === 'undefined') return
    
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

    switch (type) {
      case 'draw':
        {
          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()
          oscillator.connect(gainNode)
          gainNode.connect(audioContext.destination)
          oscillator.frequency.value = 800
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.2)
        }
        break
      case 'win':
        // Música de vitória: melodia de fanfarra
        playVictoryMusic(audioContext)
        break
      case 'error':
        {
          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()
          oscillator.connect(gainNode)
          gainNode.connect(audioContext.destination)
          oscillator.frequency.value = 300
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.3)
        }
        break
    }
  }

  const playVictoryMusic = (audioContext: AudioContext) => {
    // Melodia de vitória: sequência de notas ascendentes (fanfarra de vitória)
    const notes = [
      { freq: 523.25, time: 0, duration: 0.2 },   // C5
      { freq: 587.33, time: 0.2, duration: 0.2 }, // D5
      { freq: 659.25, time: 0.4, duration: 0.2 }, // E5
      { freq: 698.46, time: 0.6, duration: 0.2 }, // F5
      { freq: 783.99, time: 0.8, duration: 0.4 }, // G5 (mais longo)
      { freq: 880, time: 1.2, duration: 0.3 },    // A5
      { freq: 987.77, time: 1.5, duration: 0.5 }, // B5 (final - mais longo)
    ]

    notes.forEach((note) => {
      setTimeout(() => {
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.type = 'sine'
        oscillator.frequency.value = note.freq
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        const startTime = audioContext.currentTime
        gainNode.gain.setValueAtTime(0, startTime)
        gainNode.gain.linearRampToValueAtTime(0.5, startTime + 0.05)
        gainNode.gain.linearRampToValueAtTime(0.4, startTime + note.duration - 0.1)
        gainNode.gain.linearRampToValueAtTime(0, startTime + note.duration)
        
        oscillator.start(startTime)
        oscillator.stop(startTime + note.duration)
      }, note.time * 1000)
    })
  }

  const handleStartGame = async () => {
    try {
      const response = await fetch(`${API_URL}/rooms/${roomCode}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId: room.hostId }),
      })
      if (!response.ok) {
        const error = await response.json()
        alert(error.message || 'Erro ao iniciar jogo')
        return
      }
      const data = await response.json()
      setGame(data.game)
      
      // Encontrar e definir a cartela do host
      if (data.game && data.game.cards && user) {
        const hostCard = data.game.cards.find((card: any) => card.ownerId === user.uid)
        if (hostCard && hostCard.cells) {
          setMyCard(hostCard)
        }
      }
      
      // Recarregar sala para garantir dados atualizados
      await loadRoom()
    } catch (error: any) {
      console.error('Erro ao iniciar jogo:', error)
      alert(error.message || 'Erro ao iniciar jogo')
    }
  }

  const handleDrawNumber = async () => {
    try {
      const response = await fetch(`${API_URL}/game/${roomCode}/draw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId: room.hostId }),
      })
      
      if (!response.ok) {
        const error = await response.json()
        console.error('Erro ao sortear número:', error)
        alert(error.message || 'Erro ao sortear número')
        return
      }
      
      const data = await response.json()
      console.log('Número sorteado:', data)
    } catch (error: any) {
      console.error('Erro ao sortear número:', error)
      alert('Erro ao sortear número. Verifique se o jogo está ativo.')
    }
  }

  const handleBingo = async () => {
    if (!myCard) return
    
    try {
      await fetch(`${API_URL}/game/${roomCode}/validate-bingo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: myCard.id, visitorId }),
      })
    } catch (error) {
      console.error('Erro ao validar bingo:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Carregando...</div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">Sala não encontrada</div>
      </div>
    )
  }

  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{room.name}</h1>
              <p className="text-gray-600">Código: {room.code}</p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="w-4 h-4"
                />
                <span>🔊 Sons</span>
              </label>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Sair
              </button>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-gray-700">
              Participantes: {room.visitors?.length || 0} / {room.maxCards}
            </p>
          </div>

          {!game && isHost && (
            <button
              onClick={handleStartGame}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700"
            >
              Iniciar Jogo
            </button>
          )}

          {game && isHost && !game.isFinished && (
            <button
              onClick={handleDrawNumber}
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
            >
              Sortear Número
            </button>
          )}
        </div>

        {game && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">Números Sorteados</h2>
            {game.drawnNumbers && Array.isArray(game.drawnNumbers) && game.drawnNumbers.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {game.drawnNumbers.map((num: number, index: number) => (
                  <span
                    key={`${num}-${index}`}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold text-lg"
                  >
                    {num}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">Aguardando primeiro sorteio...</p>
            )}
          </div>
        )}

        {myCard && game && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Minha Cartela</h2>
              <button
                onClick={handleBingo}
                className="px-6 py-3 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600"
              >
                🎉 BINGO!
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2 relative">
              {myCard.cells.map((row, i) =>
                row.map((cell, j) => {
                  const isWinningCell = winningCells && (
                    winningCells.full ||
                    winningCells.row === i ||
                    winningCells.col === j ||
                    (winningCells.diagonal === 'main' && i === j) ||
                    (winningCells.diagonal === 'anti' && i === 4 - j)
                  )
                  
                  return (
                    <div
                      key={`${i}-${j}`}
                      className={`aspect-square flex items-center justify-center rounded-lg font-semibold text-lg relative overflow-hidden ${
                        cell.marked
                          ? isWinningCell
                            ? 'bg-yellow-500 text-white'
                            : 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      <span className="relative z-10">{cell.number}</span>
                      {isWinningCell && !winningCells.full && (
                        <>
                          {/* Risco horizontal para linha */}
                          {winningCells.row === i && (
                            <div className="absolute inset-0 flex items-center pointer-events-none">
                              <div className="w-full h-1 bg-red-600 shadow-lg"></div>
                            </div>
                          )}
                          {/* Risco vertical para coluna */}
                          {winningCells.col === j && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="h-full w-1 bg-red-600 shadow-lg"></div>
                            </div>
                          )}
                          {/* Risco diagonal principal */}
                          {winningCells.diagonal === 'main' && i === j && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-full h-1 bg-red-600 transform rotate-45 origin-center shadow-lg"></div>
                            </div>
                          )}
                          {/* Risco diagonal secundária */}
                          {winningCells.diagonal === 'anti' && i === 4 - j && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-full h-1 bg-red-600 transform -rotate-45 origin-center shadow-lg"></div>
                            </div>
                          )}
                        </>
                      )}
                      {isWinningCell && winningCells.full && (
                        <div className="absolute inset-0 border-4 border-red-600 rounded-lg pointer-events-none"></div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {game?.isFinished && game.winner && (
          <div className="bg-yellow-100 border-4 border-yellow-500 rounded-lg p-6 mt-6 text-center">
            <h2 className="text-4xl font-bold text-yellow-800 mb-2">
              🎉 BINGO! 🎉
            </h2>
            <p className="text-2xl text-yellow-700">
              {game.winner === visitorId || game.winner === user?.uid 
                ? 'Você ganhou!' 
                : `${winnerModal.winnerName || room?.game?.cards?.find((c: any) => c.ownerId === game.winner)?.ownerName || 'Alguém'} ganhou!`}
            </p>
          </div>
        )}
      </div>

      {/* Modal de Vencedor */}
      {winnerModal.show && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn"
          onClick={() => setWinnerModal({ show: false, winnerName: '', winnerId: '' })}
        >
          <div 
            className="bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all animate-bounce border-4 border-yellow-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="text-7xl mb-4 animate-pulse">🎉</div>
              <h2 className="text-5xl font-bold text-white mb-3 drop-shadow-lg">
                BINGO!
              </h2>
              <div className="bg-white rounded-lg p-4 mb-6 shadow-lg">
                <p className="text-2xl text-gray-800 font-bold mb-2">
                  {winnerModal.winnerName}
                </p>
                <p className="text-lg text-gray-600">
                  {winnerModal.winnerId === visitorId || winnerModal.winnerId === user?.uid 
                    ? 'Parabéns! Você é o vencedor! 🏆' 
                    : 'é o vencedor! 🎊'}
                </p>
                {winningCells && (
                  <p className="text-sm text-gray-500 mt-2">
                    {winningCells.full && 'Cartela Cheia'}
                    {winningCells.row !== undefined && `Linha ${winningCells.row + 1}`}
                    {winningCells.col !== undefined && `Coluna ${winningCells.col + 1}`}
                    {winningCells.diagonal === 'main' && 'Diagonal Principal'}
                    {winningCells.diagonal === 'anti' && 'Diagonal Secundária'}
                  </p>
                )}
              </div>
              <button
                onClick={() => setWinnerModal({ show: false, winnerName: '', winnerId: '' })}
                className="px-8 py-3 bg-white text-yellow-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

