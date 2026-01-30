# Instruções para rodar o jogo STOP com sincronização

## 1. Instalar as dependências
```bash
npm install
```

## 2. Iniciar o servidor (em um terminal)
```bash
npm run server
```

## 3. Iniciar o React (em outro terminal)
```bash
npm start
```

## 4. Como jogar
- Abra várias abas do navegador em http://localhost:3000
- Cada jogador entra com um nickname
- O primeiro jogador que entrar é o DONO (👑) da sala
- Apenas o dono pode:
  - Sortear letras
  - Iniciar novas rodadas
  - Finalizar o jogo

## Regras do jogo:
✅ Animação de 3 segundos ao sortear a letra
✅ Todos veem a mesma letra sorteada
✅ Quando alguém clica STOP, bloqueia para todos
✅ Pontuação automática:
   - 10 pontos se a resposta é única
   - 5 pontos se outro jogador colocou a mesma
   - 0 pontos se deixou em branco
✅ Painel lateral mostra placar em tempo real
✅ Podem jogar quantas rodadas quiserem até acabarem as letras
✅ Tela final com ranking quando o dono finalizar o jogo
