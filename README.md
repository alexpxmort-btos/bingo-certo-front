# 🎨 Bingo Certo - Frontend

> Interface do usuário para sistema de bingo online

[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

## 📋 Sobre

Frontend moderno e responsivo desenvolvido com **Next.js 14** (App Router), **React 18**, **Tailwind CSS** e **Socket.io Client** para comunicação em tempo real.

## 🚀 Instalação

```bash
# Instalar dependências
pnpm install

# Ou com npm
npm install
```

## ⚙️ Configuração

### 1. Copiar arquivo de ambiente

```bash
cp .env.example .env.local
```

### 2. Configurar variáveis

O arquivo `.env.example` já contém as credenciais do Firebase. Se necessário, ajuste:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBuOGYqBv7WJYw6v6XfTFgilE3sEsasNZU
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=dexti-9fec6.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=dexti-9fec6
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://dexti-9fec6.firebaseio.com
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=dexti-9fec6.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=396437306312
NEXT_PUBLIC_FIREBASE_APP_ID=1:396437306312:web:9259b391fa902cd8a41efd

NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 🏃 Como Rodar

### Desenvolvimento

```bash
pnpm dev
```

O servidor inicia em: **http://localhost:3000**

### Produção

```bash
# Build
pnpm build

# Iniciar
pnpm start
```

## 🏗️ Estrutura

```
src/
├── app/                      # App Router (Next.js 14)
│   ├── layout.tsx           # Layout raiz
│   ├── page.tsx             # Página inicial
│   ├── create-room/         # Criar sala
│   │   └── page.tsx
│   ├── join-room/           # Entrar em sala
│   │   └── page.tsx
│   └── room/                # Sala de jogo
│       └── [code]/
│           └── page.tsx
│
└── lib/                      # Utilitários
    ├── socket.ts            # Cliente Socket.io
    ├── firebase.ts          # Configuração Firebase
    └── firebase-auth.tsx    # Context de autenticação
```

## 🎨 Páginas

### `/` - Home
Página inicial com opções para criar ou entrar em uma sala.

### `/create-room` - Criar Sala
Formulário para criar uma nova sala de bingo.

### `/join-room` - Entrar em Sala
Formulário para entrar em uma sala existente usando o código.

### `/room/[code]` - Sala de Jogo
Interface do jogo com:
- Cartela do jogador
- Números sorteados
- Controles do host (se aplicável)
- Botão "BINGO!"

## 🔌 Integração com Backend

### API REST

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Criar sala
await fetch(`${API_URL}/rooms`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ... }),
});
```

### WebSocket

```typescript
import { getSocket } from '@/lib/socket';

const socket = getSocket();
socket.connect();

// Entrar na sala
socket.emit('join-room', { roomCode, visitorId });

// Escutar eventos
socket.on('number-drawn', (data) => {
  // Atualizar UI
});
```

## 📦 Dependências Principais

- `next` - Framework React
- `react` - Biblioteca UI
- `socket.io-client` - Cliente WebSocket
- `firebase` - Autenticação
- `tailwindcss` - Framework CSS

## 🎨 Design System

### Cores

- **Primary**: Azul (#0284c7)
- **Success**: Verde (para números marcados)
- **Warning**: Amarelo (para botão BINGO)
- **Error**: Vermelho (para erros)

### Tipografia

- **Font**: Inter (Google Fonts)
- **Tamanhos**: Baseado no sistema Tailwind

## 📱 Responsividade

O design é totalmente responsivo:
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

## 🧪 Testes

```bash
# Lint
pnpm lint

# Build de verificação
pnpm build
```

## 🔥 Firebase

O projeto usa Firebase para:
- **Authentication**: Login do host (Email/Password e Google)
- **Firestore**: Banco de dados (opcional)

As credenciais já estão configuradas no `.env.example`.

## 📝 Licença

MIT

---

**Frontend desenvolvido com Next.js 14 e Tailwind CSS**
