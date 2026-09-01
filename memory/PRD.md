# Portal "Help, Querido Dante" — PRD

## Original Problem Statement
Portal de prevenção ao suicídio com página inicial (portal), página /suicidio (Setembro Amarelo), chatbot IA "Dante" (Grok/xAI) e painel /admin em duas abas (Portal / Categorias).

## Architecture
- FastAPI + MongoDB (motor) + JWT auth
- React (react-router v7, shadcn/ui, Tailwind, Lucide) 
- LLM: xAI Grok primary + Emergent LLM key fallback (currently zero budget)

## Personas
- Visitantes em busca de ajuda / apoio emocional
- Familiares que querem apoiar alguém
- Administrador do portal (edita conteúdo)

## Core Requirements
- Portal: Saída Rápida, 2 CTAs, footer com aviso CVV, Sobre/Termos
- /suicidio: Hero, Sobre, Playlists por categoria, Vídeos Kester, Como Agir (fazer/não fazer), Canais (preciso/alguém), Vitrine Psicólogos, Leis com filtros
- Dante: pre-chat (nome/telefone/idade), aviso legal, loading, IA lê /suicidio
- Admin: login JWT, 2 abas, CRUD completo, editor prompt Dante, leads, histórico

## Implemented (2026-02)
- ✅ Backend server.py com JWT auth, seed admin + dados de exemplo, CRUD 6 recursos
- ✅ Endpoint /dante/chat com xAI Grok + fallback Emergent LLM key
- ✅ Portal.jsx (gradientes roxo/rosa fluidos + Saída Rápida)
- ✅ Suicidio.jsx (todas as 8 seções + filtros + tabs)
- ✅ DanteChat.jsx (floating Ribbon, pre-chat, loading, Enter/Shift+Enter)
- ✅ Admin.jsx (login, portal tab, categorias tab com 7 subtabs)

## Known Issues
- Chave xAI fornecida (`c6d5fd98-51e5-4bc8-90fb-30e5eaeaa8ad` e variação `xai-...`) inválida
- Emergent LLM key budget = 0 → chat retorna erro amigável

## Test Credentials
- Admin: `admin` / `dante@2026`

## Backlog / Next
- P0: Usuário adicionar chave xAI válida ou top up Emergent para chat funcionar
- P1: Sistema de agendamento com psicólogos, notificação por WhatsApp
- P2: Analytics anônimo de usos, exportação CSV de leads
