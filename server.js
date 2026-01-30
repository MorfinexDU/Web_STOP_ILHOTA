const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const salas = {};

function criarEstadoValidacao() {
  return {
    emValidacao: false,
    categoriaAtual: null,
    indiceCategoriaAtual: 0,
    votos: {}
  };
}

io.on('connection', (socket) => {
  console.log('Novo jogador conectado:', socket.id);
  
  socket.on('criarSala', (nickname) => {
    const codigoSala = Math.random().toString(36).substring(2, 8).toUpperCase();
    salas[codigoSala] = {
      estadoJogo: {
        letraSorteada: '',
        jogoBloqueado: false,
        jogoIniciado: false,
        animando: false,
        letrasUsadas: [],
        donoSala: socket.id,
        jogoFinalizado: false
      },
      jogadores: {},
      respostasRodada: {},
      categorias: [],
      validacao: criarEstadoValidacao()
    };
    
    salas[codigoSala].jogadores[socket.id] = {
      id: socket.id,
      nickname,
      respostas: [],
      pontuacaoTotal: 0
    };
    
    socket.join(codigoSala);
    socket.emit('salacriada', { codigoSala });
  });

  socket.on('definirCategorias', ({ codigoSala, categorias }) => {
    if (!salas[codigoSala]) return;
    salas[codigoSala].categorias = categorias;
    io.to(codigoSala).emit('categoriasDefinidas', categorias);
    io.to(codigoSala).emit('atualizarJogadores', { 
      jogadores: salas[codigoSala].jogadores, 
      donoSala: salas[codigoSala].estadoJogo.donoSala 
    });
  });
  
  socket.on('entrarSala', ({ nickname, codigoSala }) => {
    if (!salas[codigoSala]) {
      socket.emit('erroSala', 'Sala não encontrada');
      return;
    }
    
    salas[codigoSala].jogadores[socket.id] = {
      id: socket.id,
      nickname,
      respostas: [],
      pontuacaoTotal: 0
    };
    
    socket.join(codigoSala);
    socket.emit('salaEntrada', { 
      codigoSala, 
      estadoJogo: salas[codigoSala].estadoJogo,
      categorias: salas[codigoSala].categorias
    });
    io.to(codigoSala).emit('atualizarJogadores', { 
      jogadores: salas[codigoSala].jogadores, 
      donoSala: salas[codigoSala].estadoJogo.donoSala 
    });
  });

  socket.on('sortearLetra', (codigoSala) => {
    if (!salas[codigoSala]) return;
    const sala = salas[codigoSala];
    
    if (sala.estadoJogo.animando || socket.id !== sala.estadoJogo.donoSala) return;
    
    const letrasDisponiveis = LETRAS.filter(l => !sala.estadoJogo.letrasUsadas.includes(l));
    if (letrasDisponiveis.length === 0) return;
    
    sala.estadoJogo.animando = true;
    sala.estadoJogo.jogoBloqueado = false;
    sala.estadoJogo.jogoIniciado = true;
    sala.respostasRodada = {};
    
    io.to(codigoSala).emit('iniciarAnimacao');
    
    setTimeout(() => {
      const letra = letrasDisponiveis[Math.floor(Math.random() * letrasDisponiveis.length)];
      sala.estadoJogo.letraSorteada = letra;
      sala.estadoJogo.letrasUsadas.push(letra);
      sala.estadoJogo.animando = false;
      io.to(codigoSala).emit('letraSorteada', letra);
    }, 3000);
  });

  socket.on('enviarRespostas', ({ codigoSala, respostas }) => {
    if (!salas[codigoSala]) return;
    salas[codigoSala].respostasRodada[socket.id] = respostas;
  });

  socket.on('stop', (codigoSala) => {
    if (!salas[codigoSala]) return;
    const sala = salas[codigoSala];
    
    if (!sala.estadoJogo.jogoBloqueado) {
      sala.estadoJogo.jogoBloqueado = true;
      io.to(codigoSala).emit('jogoBloqueado');
      
      io.to(codigoSala).emit('atualizarJogadores', { 
        jogadores: sala.jogadores, 
        donoSala: sala.estadoJogo.donoSala, 
        respostasRodada: sala.respostasRodada 
      });
      
      setTimeout(() => {
        sala.validacao = criarEstadoValidacao();
        sala.validacao.emValidacao = true;
        sala.validacao.indiceCategoriaAtual = 0;
        sala.validacao.categoriaAtual = sala.categorias[0];
        
        io.to(codigoSala).emit('iniciarValidacao', { categoria: sala.validacao.categoriaAtual });
      }, 500);
    }
  });

  socket.on('votar', ({ codigoSala, jogadorId, pontos }) => {
    if (!salas[codigoSala]) return;
    const sala = salas[codigoSala];
    
    if (!sala.validacao.votos[sala.validacao.categoriaAtual]) {
      sala.validacao.votos[sala.validacao.categoriaAtual] = {};
    }
    if (!sala.validacao.votos[sala.validacao.categoriaAtual][jogadorId]) {
      sala.validacao.votos[sala.validacao.categoriaAtual][jogadorId] = [];
    }
    
    const votante = socket.id;
    const votosJogador = sala.validacao.votos[sala.validacao.categoriaAtual][jogadorId];
    const votoExistente = votosJogador.findIndex(v => v.votante === votante);
    
    if (votoExistente >= 0) {
      votosJogador[votoExistente].pontos = pontos;
    } else {
      votosJogador.push({ votante, pontos });
    }
    
    io.to(codigoSala).emit('atualizarVotos', sala.validacao.votos[sala.validacao.categoriaAtual]);
  });

  socket.on('proximaCategoria', (codigoSala) => {
    if (!salas[codigoSala]) return;
    const sala = salas[codigoSala];
    
    if (socket.id !== sala.estadoJogo.donoSala) return;
    
    sala.validacao.indiceCategoriaAtual++;
    
    if (sala.validacao.indiceCategoriaAtual < sala.categorias.length) {
      sala.validacao.categoriaAtual = sala.categorias[sala.validacao.indiceCategoriaAtual];
      io.to(codigoSala).emit('proximaCategoria', { categoria: sala.validacao.categoriaAtual });
    } else {
      finalizarValidacaoSala(codigoSala);
    }
  });

  socket.on('finalizarValidacao', (codigoSala) => {
    if (!salas[codigoSala]) return;
    const sala = salas[codigoSala];
    
    if (socket.id !== sala.estadoJogo.donoSala) return;
    
    finalizarValidacaoSala(codigoSala);
  });

  socket.on('finalizarJogo', (codigoSala) => {
    if (!salas[codigoSala]) return;
    const sala = salas[codigoSala];
    
    if (socket.id === sala.estadoJogo.donoSala) {
      sala.estadoJogo.jogoFinalizado = true;
      io.to(codigoSala).emit('jogoFinalizado', sala.jogadores);
    }
  });

  socket.on('reiniciarJogo', (codigoSala) => {
    if (!salas[codigoSala]) return;
    const sala = salas[codigoSala];
    
    if (socket.id === sala.estadoJogo.donoSala) {
      sala.estadoJogo = {
        letraSorteada: '',
        jogoBloqueado: false,
        jogoIniciado: false,
        animando: false,
        letrasUsadas: [],
        donoSala: sala.estadoJogo.donoSala,
        jogoFinalizado: false
      };
      Object.keys(sala.jogadores).forEach(id => {
        sala.jogadores[id].respostas = [];
        sala.jogadores[id].pontuacaoTotal = 0;
      });
      sala.respostasRodada = {};
      io.to(codigoSala).emit('jogoReiniciado');
      io.to(codigoSala).emit('atualizarJogadores', { 
        jogadores: sala.jogadores, 
        donoSala: sala.estadoJogo.donoSala 
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Jogador desconectado:', socket.id);
    
    for (const codigoSala in salas) {
      const sala = salas[codigoSala];
      if (sala.jogadores[socket.id]) {
        delete sala.jogadores[socket.id];
        delete sala.respostasRodada[socket.id];
        
        if (sala.estadoJogo.donoSala === socket.id) {
          const idsJogadores = Object.keys(sala.jogadores);
          sala.estadoJogo.donoSala = idsJogadores.length > 0 ? idsJogadores[0] : null;
        }
        
        if (Object.keys(sala.jogadores).length === 0) {
          delete salas[codigoSala];
        } else {
          io.to(codigoSala).emit('atualizarJogadores', { 
            jogadores: sala.jogadores, 
            donoSala: sala.estadoJogo.donoSala 
          });
        }
        break;
      }
    }
  });
});

function calcularPontuacao(codigoSala) {
  const sala = salas[codigoSala];
  if (!sala) return;
  
  const categorias = sala.categorias;
  const pontuacaoRodada = {};
  
  Object.keys(sala.respostasRodada).forEach(id => {
    pontuacaoRodada[id] = { respostas: sala.respostasRodada[id], pontos: {} };
  });
  
  categorias.forEach(categoria => {
    const respostasCategoria = {};
    
    Object.keys(sala.respostasRodada).forEach(id => {
      const resposta = sala.respostasRodada[id][categoria]?.toLowerCase().trim();
      if (resposta) {
        if (!respostasCategoria[resposta]) respostasCategoria[resposta] = [];
        respostasCategoria[resposta].push(id);
      }
    });
    
    Object.keys(sala.respostasRodada).forEach(id => {
      const resposta = sala.respostasRodada[id][categoria]?.toLowerCase().trim();
      if (!resposta) {
        pontuacaoRodada[id].pontos[categoria] = 0;
      } else {
        const quantidade = respostasCategoria[resposta].length;
        pontuacaoRodada[id].pontos[categoria] = quantidade === 1 ? 10 : 5;
      }
    });
  });
  
  Object.keys(pontuacaoRodada).forEach(id => {
    const totalRodada = Object.values(pontuacaoRodada[id].pontos).reduce((a, b) => a + b, 0);
    if (sala.jogadores[id]) {
      sala.jogadores[id].respostas.push({
        letra: sala.estadoJogo.letraSorteada,
        respostas: pontuacaoRodada[id].respostas,
        pontos: pontuacaoRodada[id].pontos,
        total: totalRodada
      });
      sala.jogadores[id].pontuacaoTotal += totalRodada;
    }
  });
  
  io.to(codigoSala).emit('atualizarJogadores', { 
    jogadores: sala.jogadores, 
    donoSala: sala.estadoJogo.donoSala, 
    respostasRodada: sala.respostasRodada 
  });
}

function finalizarValidacaoSala(codigoSala) {
  const sala = salas[codigoSala];
  if (!sala) return;
  
  calcularPontuacaoComVotos(codigoSala);
  
  sala.validacao = criarEstadoValidacao();
  io.to(codigoSala).emit('finalizarValidacao');
  io.to(codigoSala).emit('atualizarJogadores', { 
    jogadores: sala.jogadores, 
    donoSala: sala.estadoJogo.donoSala, 
    respostasRodada: sala.respostasRodada 
  });
}

function calcularPontuacaoComVotos(codigoSala) {
  const sala = salas[codigoSala];
  if (!sala) return;
  
  const categorias = sala.categorias;
  const pontuacaoRodada = {};
  
  Object.keys(sala.respostasRodada).forEach(id => {
    pontuacaoRodada[id] = { respostas: sala.respostasRodada[id], pontos: {} };
  });
  
  categorias.forEach(categoria => {
    Object.keys(sala.respostasRodada).forEach(id => {
      const resposta = sala.respostasRodada[id][categoria]?.toLowerCase().trim();
      
      if (!resposta) {
        pontuacaoRodada[id].pontos[categoria] = 0;
      } else {
        const votosJogador = sala.validacao.votos[categoria]?.[id] || [];
        
        if (votosJogador.length === 0) {
          pontuacaoRodada[id].pontos[categoria] = 0;
        } else {
          const contagem = {};
          votosJogador.forEach(v => {
            contagem[v.pontos] = (contagem[v.pontos] || 0) + 1;
          });
          
          let maxVotos = 0;
          let pontosVencedores = [];
          
          Object.keys(contagem).forEach(pontos => {
            if (contagem[pontos] > maxVotos) {
              maxVotos = contagem[pontos];
              pontosVencedores = [parseInt(pontos)];
            } else if (contagem[pontos] === maxVotos) {
              pontosVencedores.push(parseInt(pontos));
            }
          });
          
          pontuacaoRodada[id].pontos[categoria] = Math.min(...pontosVencedores);
        }
      }
    });
  });
  
  Object.keys(pontuacaoRodada).forEach(id => {
    const totalRodada = Object.values(pontuacaoRodada[id].pontos).reduce((a, b) => a + b, 0);
    if (sala.jogadores[id]) {
      sala.jogadores[id].respostas.push({
        letra: sala.estadoJogo.letraSorteada,
        respostas: pontuacaoRodada[id].respostas,
        pontos: pontuacaoRodada[id].pontos,
        total: totalRodada
      });
      sala.jogadores[id].pontuacaoTotal += totalRodada;
    }
  });
}

const PORT = 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
