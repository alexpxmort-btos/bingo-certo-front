'use client'

import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">
          🎱 Bingo Certo
        </h1>
        <p className="text-xl text-gray-700 mb-12">
          Crie salas de bingo e jogue com seus amigos em tempo real
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="px-8 py-4 bg-primary-600 text-white rounded-lg font-semibold text-lg hover:bg-primary-700 transition-colors shadow-lg"
          >
            Criar Sala (Login)
          </Link>
          <Link
            href="/join-room"
            className="px-8 py-4 bg-white text-primary-600 rounded-lg font-semibold text-lg hover:bg-gray-50 transition-colors shadow-lg border-2 border-primary-600"
          >
            Entrar em uma Sala
          </Link>
          <Link
            href="/scanner"
            className="px-8 py-4 bg-green-600 text-white rounded-lg font-semibold text-lg hover:bg-green-700 transition-colors shadow-lg"
          >
            📷 Scanner de Cartela
          </Link>
        </div>

        <div className="mt-16 p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            Como funciona?
          </h2>
          <ul className="text-left space-y-3 text-gray-700">
            <li className="flex items-start">
              <span className="mr-2">👤</span>
              <span>Crie uma sala (precisa de login)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">🚪</span>
              <span>Compartilhe o link da sala</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">🎲</span>
              <span>Amigos entram sem cadastro (apenas apelido)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">🎉</span>
              <span>Jogue e divirta-se!</span>
            </li>
          </ul>
        </div>
      </div>
    </main>
  )
}

