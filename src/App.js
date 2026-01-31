import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';

const CATEGORIAS_DISPONIVEIS = [
  'Nome', 'Animal', 'Cor', 'Cidade', 'Comida', 
  'Carro', 'Fruta', 'País', 'Objeto', 'Profissão'
];
const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const socket = io(window.location.hostname === 'localhost' ? 'http://localhost:3001' : `http://${window.location.hostname}:3001`, {
  transports: ['websocket', 'polling'],
  withCredentials: true
});

function App() {
  const [nickname, setNickname] = useState('');
  const [entrou, setEntrou] = useState(false);
  const [codigoSala, setCodigoSala] = useState('');
  const [criandoSala, setCriandoSala] = useState(false);
  const [entrandoSala, setEntrandoSala] = useState(false);
  const [letraSorteada, setLetraSorteada] = useState('');
  const [respostas, setRespostas] = useState({});
  const [jogoBloqueado, setJogoBloqueado] = useState(false);
  const [jogoIniciado, setJogoIniciado] = useState(false);
  const [animando, setAnimando] = useState(false);
  const [letraAnimacao, setLetraAnimacao] = useState('');
  const [mostrarJa, setMostrarJa] = useState(false);
  const [jogadores, setJogadores] = useState({});
  const [donoSala, setDonoSala] = useState(null);
  const [meuId, setMeuId] = useState(null);
  const [jogoFinalizado, setJogoFinalizado] = useState(false);
  const [respostasRodadaAtual, setRespostasRodadaAtual] = useState({});
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState([]);
  const [categoriasRenomeadas, setCategoriasRenomeadas] = useState({});
  const [selecionandoCategorias, setSelecionandoCategorias] = useState(false);
  const [emValidacao, setEmValidacao] = useState(false);
  const [categoriaValidando, setCategoriaValidando] = useState(null);
  const [votosValidacao, setVotosValidacao] = useState({});
  const [votosGerais, setVotosGerais] = useState({});
  const [editandoCategoria, setEditandoCategoria] = useState(null);
  const [nomeEditando, setNomeEditando] = useState('');
  const [codigoCopiado, setCodigoCopiado] = useState(false);

  useEffect(() => {
    socket.on('connect', () => {
      setMeuId(socket.id);
    });

    socket.on('salacriada', (data) => {
      setCodigoSala(data.codigoSala);
      setSelecionandoCategorias(true);
    });

    socket.on('salaEntrada', (data) => {
      setCodigoSala(data.codigoSala);
      setEntrou(true);
      setCategoriasSelecionadas(data.categorias || []);
      setLetraSorteada(data.estadoJogo.letraSorteada);
      setJogoBloqueado(data.estadoJogo.jogoBloqueado);
      setJogoIniciado(data.estadoJogo.jogoIniciado);
      setAnimando(data.estadoJogo.animando);
      setJogoFinalizado(data.estadoJogo.jogoFinalizado);
    });

    socket.on('categoriasDefinidas', (categorias) => {
      setCategoriasSelecionadas(categorias);
      setEntrou(true);
      setSelecionandoCategorias(false);
    });

    socket.on('erroSala', (mensagem) => {
      alert(mensagem);
      setEntrandoSala(false);
    });

    socket.on('atualizarJogadores', (data) => {
      setJogadores(data.jogadores);
      setDonoSala(data.donoSala);
      if (data.respostasRodada) {
        setRespostasRodadaAtual(data.respostasRodada);
      }
    });

    socket.on('iniciarAnimacao', () => {
      setAnimando(true);
      setMostrarJa(false);
      setRespostas({});
      setJogoBloqueado(false);
      setJogoIniciado(true);
      setRespostasRodadaAtual({});
      animarLetras();
    });

    socket.on('letraSorteada', (letra) => {
      setLetraSorteada(letra);
      setLetraAnimacao(letra);
      setAnimando(false);
      setMostrarJa(true);
      setTimeout(() => setMostrarJa(false), 1500);
    });

    socket.on('jogoBloqueado', () => {
      setJogoBloqueado(true);
    });

    socket.on('iniciarValidacao', (data) => {
      setEmValidacao(true);
      setCategoriaValidando(data.categoria);
      setVotosValidacao({});
      setVotosGerais({});
    });

    socket.on('atualizarVotos', (votos) => {
      setVotosGerais(votos);
    });

    socket.on('proximaCategoria', (data) => {
      setCategoriaValidando(data.categoria);
      setVotosValidacao({});
      setVotosGerais({});
    });

    socket.on('finalizarValidacao', () => {
      setEmValidacao(false);
      setCategoriaValidando(null);
      setVotosValidacao({});
    });

    socket.on('jogoFinalizado', (jogadoresFinais) => {
      setJogoFinalizado(true);
      setJogadores(jogadoresFinais);
    });

    socket.on('jogoReiniciado', () => {
      setJogoFinalizado(false);
      setJogoIniciado(false);
      setLetraSorteada('');
      setRespostas({});
      setJogoBloqueado(false);
    });

    return () => {
      socket.off('connect');
      socket.off('salacriada');
      socket.off('salaEntrada');
      socket.off('erroSala');
      socket.off('categoriasDefinidas');
      socket.off('iniciarAnimacao');
      socket.off('letraSorteada');
      socket.off('jogoBloqueado');
      socket.off('iniciarValidacao');
      socket.off('proximaCategoria');
      socket.off('finalizarValidacao');
      socket.off('atualizarVotos');
      socket.off('atualizarJogadores');
      socket.off('jogoFinalizado');
      socket.off('jogoReiniciado');
    };
  }, []);

  const animarLetras = () => {
    let contador = 0;
    const intervalo = setInterval(() => {
      const letraAleatoria = LETRAS[Math.floor(Math.random() * LETRAS.length)];
      setLetraAnimacao(letraAleatoria);
      contador++;
      if (contador > 30) {
        clearInterval(intervalo);
      }
    }, 100);
  };

  const criarSala = () => {
    if (nickname.trim()) {
      socket.emit('criarSala', nickname.trim());
      setCriandoSala(true);
    }
  };

  const entrarNaSala = () => {
    if (nickname.trim() && codigoSala.trim()) {
      socket.emit('entrarSala', { nickname: nickname.trim(), codigoSala: codigoSala.trim().toUpperCase() });
      setEntrandoSala(true);
    }
  };

  const sortearLetra = () => {
    socket.emit('sortearLetra', codigoSala);
  };

  const handleInputChange = (categoria, valor) => {
    if (!jogoBloqueado && !animando) {
      const novasRespostas = { ...respostas, [categoria]: valor };
      setRespostas(novasRespostas);
      socket.emit('enviarRespostas', { codigoSala, respostas: novasRespostas });
    }
  };

  const handleStop = () => {
    socket.emit('stop', codigoSala);
  };

  const finalizarJogo = () => {
    socket.emit('finalizarJogo', codigoSala);
  };

  const reiniciarJogo = () => {
    socket.emit('reiniciarJogo', codigoSala);
  };

  const toggleCategoria = (cat) => {
    const categoriaAtual = Object.keys(categoriasRenomeadas).find(k => categoriasRenomeadas[k] === cat) || cat;
    if (categoriasSelecionadas.includes(categoriaAtual)) {
      setCategoriasSelecionadas(categoriasSelecionadas.filter(c => c !== categoriaAtual));
    } else if (categoriasSelecionadas.length < 10) {
      setCategoriasSelecionadas([...categoriasSelecionadas, categoriaAtual]);
    }
  };

  const renomearCategoria = (categoriaOriginal, novoNome) => {
    if (novoNome && novoNome.trim()) {
      setCategoriasRenomeadas({...categoriasRenomeadas, [categoriaOriginal]: novoNome.trim()});
    }
    setEditandoCategoria(null);
    setNomeEditando('');
  };

  const confirmarCategorias = () => {
    if (categoriasSelecionadas.length >= 3) {
      const categoriasFinais = categoriasSelecionadas.map(cat => categoriasRenomeadas[cat] || cat);
      socket.emit('definirCategorias', { codigoSala, categorias: categoriasFinais });
    }
  };

  const votar = (jogadorId, pontos) => {
    setVotosValidacao({ ...votosValidacao, [jogadorId]: pontos });
    socket.emit('votar', { codigoSala, jogadorId, pontos });
  };

  const proximaCategoria = () => {
    socket.emit('proximaCategoria', codigoSala);
  };

  const finalizarValidacao = () => {
    socket.emit('finalizarValidacao', codigoSala);
  };

  const souDono = meuId === donoSala;

  const gerarNoticias = () => {
    const noticias = [];
    const jogadoresArray = Object.values(jogadores);
    
    if (jogadoresArray.length === 0) return [];

    // Maior pontuador da última rodada
    const jogadoresComRespostas = jogadoresArray.filter(j => j.respostas && j.respostas.length > 0);
    if (jogadoresComRespostas.length > 0) {
      const ultimaRodada = jogadoresComRespostas.map(j => ({
        nick: j.nickname,
        pontos: j.respostas[j.respostas.length - 1]?.total || 0
      })).sort((a, b) => b.pontos - a.pontos);
      
      if (ultimaRodada[0].pontos > 0) {
        noticias.push(`🏆 ${ultimaRodada[0].nick} foi o MAIOR PONTUADOR da última rodada com ${ultimaRodada[0].pontos} pontos!`);
      }
      
      if (ultimaRodada[ultimaRodada.length - 1].pontos >= 0) {
        noticias.push(`😢 ${ultimaRodada[ultimaRodada.length - 1].nick} teve o PIOR DESEMPENHO na última rodada com ${ultimaRodada[ultimaRodada.length - 1].pontos} pontos`);
      }
    }

    // Melhor das últimas 3 rodadas
    const ultimas3 = jogadoresComRespostas.map(j => ({
      nick: j.nickname,
      pontos: j.respostas.slice(-3).reduce((sum, r) => sum + (r.total || 0), 0)
    })).sort((a, b) => b.pontos - a.pontos);
    
    if (ultimas3.length > 0 && ultimas3[0].pontos > 0) {
      noticias.push(`🔥 ${ultimas3[0].nick} está EM CHAMAS com ${ultimas3[0].pontos} pontos nas últimas 3 rodadas!`);
    }

    // Líder geral
    const lider = jogadoresArray.sort((a, b) => b.pontuacaoTotal - a.pontuacaoTotal)[0];
    if (lider && lider.pontuacaoTotal > 0) {
      noticias.push(`👑 ${lider.nickname} lidera o jogo com ${lider.pontuacaoTotal} pontos totais!`);
    }

    // Melhor por categoria
    categoriasSelecionadas.forEach(cat => {
      const pontosPorCategoria = {};
      jogadoresComRespostas.forEach(j => {
        const total = j.respostas.reduce((sum, r) => sum + (r.pontos[cat] || 0), 0);
        if (total > 0) pontosPorCategoria[j.nickname] = total;
      });
      
      const melhor = Object.entries(pontosPorCategoria).sort((a, b) => b[1] - a[1])[0];
      if (melhor) {
        noticias.push(`⭐ ${melhor[0]} domina em ${cat} com ${melhor[1]} pontos!`);
      }
    });

    return noticias;
  };

  if (!entrou && !selecionandoCategorias) {
    return (
      <div className="App">
        <div className="nickname-container">
          <img src="/mainicon.png" alt="ILHOTA STOP" style={{width: '150px'}} />
          <h1 style={{color: '#FFD700', textShadow: '3px 3px 0px #000, -1px -1px 0px #FF1493', letterSpacing: '3px', transform: 'skew(-5deg)', marginBottom: '30px'}}>ILHOTA STOP</h1>
          <div className="nickname-box">
            <input
              type="text"
              placeholder="Digite seu nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={15}
            />
            {!criandoSala && !entrandoSala ? (
              <>
                <div className="divisor-linha"></div>
                <button onClick={criarSala} className="btn-criar">Criar Sala</button>
                <div className="entrada-sala-container">
                  <input
                    type="text"
                    placeholder="Código da sala"
                    value={codigoSala}
                    onChange={(e) => setCodigoSala(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="input-codigo"
                  />
                  <button onClick={entrarNaSala} className="btn-entrar">Entrar</button>
                </div>
              </>
            ) : (
              <p className="aguardando">Aguardando...</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (selecionandoCategorias) {
    return (
      <div className="App">
        <div className="nickname-container">
          <div className="nickname-box" style={{maxWidth: '600px'}}>
            <h1><img src="/mainicon.png" alt="icon" style={{width: '40px', verticalAlign: 'middle', marginRight: '10px'}} />Selecione as Categorias</h1>
            <p style={{color: '#00CED1', marginBottom: '10px'}}>Escolha de 3 a 10 categorias</p>
            <p style={{color: '#FFD700', fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '20px'}}>
              {categoriasSelecionadas.length}/10 selecionadas
            </p>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px'}}>
              {CATEGORIAS_DISPONIVEIS.map((cat) => {
                const nomeExibido = categoriasRenomeadas[cat] || cat;
                const estaSelecionada = categoriasSelecionadas.includes(cat);
                
                return (
                  <button
                    key={cat}
                    onClick={() => !editandoCategoria && toggleCategoria(cat)}
                    style={{
                      padding: '15px',
                      fontSize: '1rem',
                      background: estaSelecionada 
                        ? 'linear-gradient(45deg, #FF1493, #00CED1)' 
                        : 'rgba(0, 0, 0, 0.7)',
                      color: estaSelecionada ? 'white' : '#FFD700',
                      border: estaSelecionada ? '2px solid #FFD700' : '2px solid #00CED1',
                      borderRadius: '5px',
                      cursor: editandoCategoria ? 'default' : 'pointer',
                      fontFamily: 'Impact, sans-serif',
                      textTransform: 'uppercase',
                      boxShadow: estaSelecionada ? '0 0 15px rgba(255, 215, 0, 0.5)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      position: 'relative',
                      height: '50px'
                    }}
                  >
                    {editandoCategoria === cat ? (
                      <div style={{display: 'flex', gap: '5px', width: '100%', alignItems: 'stretch', height: '100%'}}>
                        <input
                          type="text"
                          className="input-editar-categoria"
                          value={nomeEditando}
                          onChange={(e) => setNomeEditando(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') renomearCategoria(cat, nomeEditando);
                            if (e.key === 'Escape') { setEditandoCategoria(null); setNomeEditando(''); }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: '80%',
                            padding: '5px',
                            fontSize: '0.9rem',
                            background: 'white',
                            color: 'black',
                            border: 'none',
                            borderRadius: '3px',
                            fontFamily: 'Impact, sans-serif',
                            textTransform: 'uppercase',
                            textAlign: 'center',
                            boxSizing: 'border-box'
                          }}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            renomearCategoria(cat, nomeEditando);
                          }}
                          style={{
                            background: '#00FF00',
                            border: 'none',
                            borderRadius: '3px',
                            padding: '5px',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            width: '18%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxSizing: 'border-box'
                          }}
                        >
                          ✓
                        </button>
                      </div>
                    ) : (
                      <>
                        {nomeExibido}
                        {estaSelecionada && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditandoCategoria(cat);
                              setNomeEditando(nomeExibido);
                            }}
                            style={{
                              cursor: 'pointer',
                              fontSize: '0.9rem',
                              marginLeft: '5px'
                            }}
                          >
                            ✏️
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
            <button 
              onClick={confirmarCategorias}
              disabled={categoriasSelecionadas.length < 3}
              style={{
                width: '100%',
                padding: '15px',
                fontSize: '1.2rem',
                background: categoriasSelecionadas.length >= 3 
                  ? 'linear-gradient(45deg, #00FF00, #00CED1)' 
                  : '#333',
                color: categoriasSelecionadas.length >= 3 ? 'black' : '#666',
                border: '3px solid #FFD700',
                borderRadius: '5px',
                cursor: categoriasSelecionadas.length >= 3 ? 'pointer' : 'not-allowed',
                fontFamily: 'Impact, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                fontWeight: 'bold',
                boxShadow: '3px 3px 0px rgba(0, 0, 0, 0.5)',
                opacity: categoriasSelecionadas.length >= 3 ? 1 : 0.5
              }}
            >
              Confirmar e Iniciar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (jogoFinalizado) {
    const ranking = Object.values(jogadores).sort((a, b) => b.pontuacaoTotal - a.pontuacaoTotal);
    return (
      <div className="App">
        <header className="App-header">
          <h1><img src="/mainicon.png" alt="icon" style={{width: '50px', verticalAlign: 'middle', marginRight: '10px'}} />ILHOTA STOP</h1>
          <div className="info-sala">
            <span className="codigo-sala" onClick={() => {
              navigator.clipboard.writeText(codigoSala);
              setCodigoCopiado(true);
              setTimeout(() => setCodigoCopiado(false), 2000);
            }}>
              Sala: <span style={{color: 'white', textShadow: 'none'}}>{codigoCopiado ? 'Copiado!' : codigoSala}</span>
            </span>
            <span className="meu-nickname">Você: {nickname} {souDono && '👑'}</span>
          </div>
        </header>
        <div className="resultado-final">
          <h1>🏆 Jogo Finalizado!</h1>
          <div className="ranking">
            {ranking.map((jogador, index) => (
              <div key={jogador.id} className={`ranking-item ${index === 0 ? 'vencedor' : ''}`}>
                <span className="posicao">{index + 1}º</span>
                <span className="nome">{jogador.nickname}</span>
                <span className="pontos">{jogador.pontuacaoTotal} pts</span>
              </div>
            ))}
          </div>
          {souDono && (
            <button className="btn-reiniciar" onClick={reiniciarJogo}>
              Novo Jogo
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {emValidacao && (
        <div className="modal-validacao">
          <div className="modal-content">
            <h2>Validação - {categoriaValidando}</h2>
            <p className="info-validacao">Vote nas respostas dos outros jogadores</p>
            <div className="lista-respostas">
              {Object.keys(respostasRodadaAtual).length === 0 ? (
                <p style={{color: '#FFD700', textAlign: 'center'}}>Carregando respostas...</p>
              ) : (
                Object.values(jogadores)
                  .map((jogador) => {
                  const resposta = respostasRodadaAtual[jogador.id]?.[categoriaValidando];
                  if (!resposta || resposta.trim() === '') return null;
                  
                  const votosResposta = votosGerais[jogador.id] || [];
                  const contagem = { 0: 0, 5: 0, 10: 0 };
                  votosResposta.forEach(v => {
                    contagem[v.pontos]++;
                  });
                  
                  const ehMeuVoto = jogador.id === meuId;
                  
                  const totalVotos = contagem[0] + contagem[5] + contagem[10];
                  const pontuacaoMaisVotada = contagem[10] >= contagem[5] && contagem[10] >= contagem[0] ? 10 :
                                               contagem[5] >= contagem[0] ? 5 : 0;
                  
                  return (
                    <div key={jogador.id} className="item-validacao">
                      <div className="resposta-info">
                        <strong>{jogador.nickname}{ehMeuVoto ? ' (Você)' : ''}:</strong>
                        <span className="resposta-texto">{resposta}</span>
                      </div>
                      <div className="votos-info">
                        <span className="votos-info-titulo">PONTUAÇÃO:</span>
                        <span className="votos-total">{totalVotos > 0 ? pontuacaoMaisVotada : 0}</span>
                      </div>
                      {!ehMeuVoto && (
                        <div className="botoes-voto">
                          <div className="btn-voto-container">
                            <button 
                              className={`btn-voto ${votosValidacao[jogador.id] === 0 ? 'selecionado' : ''}`}
                              onClick={() => votar(jogador.id, 0)}
                            >
                              0pts
                            </button>
                            <span className="voto-count-badge">{contagem[0]}</span>
                          </div>
                          <div className="btn-voto-container">
                            <button 
                              className={`btn-voto ${votosValidacao[jogador.id] === 5 ? 'selecionado' : ''}`}
                              onClick={() => votar(jogador.id, 5)}
                            >
                              5pts
                            </button>
                            <span className="voto-count-badge">{contagem[5]}</span>
                          </div>
                          <div className="btn-voto-container">
                            <button 
                              className={`btn-voto ${votosValidacao[jogador.id] === 10 ? 'selecionado' : ''}`}
                              onClick={() => votar(jogador.id, 10)}
                            >
                              10pts
                            </button>
                            <span className="voto-count-badge">{contagem[10]}</span>
                          </div>
                        </div>
                      )}
                      {ehMeuVoto && (
                        <p className="sua-resposta">Sua resposta - Não pode votar</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            {souDono && (
              <div className="botoes-host">
                <button className="btn-proxima" onClick={proximaCategoria}>
                  Próxima Categoria
                </button>
                <button className="btn-finalizar-validacao" onClick={finalizarValidacao}>
                  Finalizar Validação
                </button>
              </div>
            )}
            {!souDono && <p className="aguardando-host">Aguardando host...</p>}
          </div>
        </div>
      )}

      <header className="App-header">
        <h1><img src="/mainicon.png" alt="icon" style={{width: '50px', verticalAlign: 'middle', marginRight: '10px'}} />ILHOTA STOP</h1>
        <div className="info-sala">
          <span className="codigo-sala" onClick={() => {
            navigator.clipboard.writeText(codigoSala);
            setCodigoCopiado(true);
            setTimeout(() => setCodigoCopiado(false), 2000);
          }}>
            Sala: <span style={{color: 'white', textShadow: 'none'}}>{codigoCopiado ? 'Copiado!' : codigoSala}</span>
          </span>
          <span className="meu-nickname">Você: {nickname} {souDono && '👑'}</span>
        </div>
      </header>

      <div className="container-jogo">
        {animando && (
          <div className="overlay-sorteio">
            <div className="sorteio-modal">
              <h1 className="letra-gigante">{letraAnimacao}</h1>
              <p className="sorteando-texto">🎲 SORTEANDO...</p>
            </div>
          </div>
        )}

        {mostrarJa && (
          <div className="overlay-ja">
            <h1 className="ja-texto">{letraSorteada}</h1>
          </div>
        )}

        <div className="area-jogo">
        {!jogoIniciado ? (
          <button className="btn-sortear" onClick={sortearLetra} disabled={!souDono}>
            {souDono ? 'Sortear Letra e Começar' : 'Aguardando dono iniciar...'}
          </button>
        ) : (
          <>
            <div className="letra-sorteada">
              <h2>Letra Sorteada: <span>{letraSorteada}</span></h2>
            </div>

            <div className="formulario">
              {categoriasSelecionadas.map((categoria) => (
                <div key={categoria} className="campo">
                  <label>{categoria}:</label>
                  <input
                    type="text"
                    value={respostas[categoria] || ''}
                    onChange={(e) => handleInputChange(categoria, e.target.value)}
                    disabled={jogoBloqueado || animando}
                    placeholder={`Digite um(a) ${categoria.toLowerCase()} com ${letraSorteada}`}
                  />
                </div>
              ))}
            </div>

            <div className="botoes">
              <button 
                className="btn-stop" 
                onClick={handleStop}
                disabled={jogoBloqueado || animando}
              >
                {jogoBloqueado ? '🔒 BLOQUEADO' : 'STOP!'}
              </button>
              {souDono && (
                <>
                  <button className="btn-nova-rodada" onClick={sortearLetra} disabled={!jogoBloqueado}>
                    Nova Rodada
                  </button>
                  <button className="btn-finalizar" onClick={finalizarJogo}>
                    Finalizar Jogo
                  </button>
                </>
              )}
            </div>

            {jogoBloqueado && Object.keys(jogadores).length > 0 && (
              <div className="resultado">
                <h3>Última Rodada:</h3>
                <div className="grid-resultados">
                  {Object.values(jogadores).map((jogador) => {
                    if (!jogador.respostas || jogador.respostas.length === 0) return null;
                    const ultima = jogador.respostas[jogador.respostas.length - 1];
                    return (
                      <div key={jogador.id} className="coluna-jogador">
                        <div className="nome-jogador">{jogador.nickname}</div>
                        {categoriasSelecionadas.map((categoria) => (
                          <div key={categoria} className="linha-categoria">
                            <span className="cat">{categoria.substring(0, 3)}:</span>
                            <span className="resp">{ultima.respostas[categoria] || '-'}</span>
                            <span className="pts">+{ultima.pontos[categoria]}</span>
                          </div>
                        ))}
                        <div className="total-jogador">Total: {ultima.total}pts</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
        </div>

        <div className="painel-acompanhamento">
          <h2>Acompanhamento</h2>
          <div className="tabela-scroll-acompanhamento">
            <table className="tabela-acompanhamento">
              <thead>
                <tr>
                  <th>Letra</th>
                  <th>Jogador</th>
                  {categoriasSelecionadas.map(cat => (
                    <th key={cat}>{cat.substring(0, 3)}</th>
                  ))}
                  <th>Pts</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const todasRodadas = [];
                  Object.values(jogadores).forEach(jogador => {
                    jogador.respostas.forEach((rodada, idx) => {
                      todasRodadas.push({ jogador, rodada, indiceRodada: idx });
                    });
                  });
                  
                  todasRodadas.sort((a, b) => {
                    if (a.indiceRodada !== b.indiceRodada) return a.indiceRodada - b.indiceRodada;
                    return a.rodada.letra.localeCompare(b.rodada.letra);
                  });
                  
                  let letraAnterior = null;
                  let contadorLetra = 0;
                  const linhasPorLetra = {};
                  
                  todasRodadas.forEach(item => {
                    const letra = item.rodada.letra;
                    if (!linhasPorLetra[letra]) linhasPorLetra[letra] = 0;
                    linhasPorLetra[letra]++;
                  });
                  
                  return todasRodadas.map((item, idx) => {
                    const { jogador, rodada } = item;
                    const letra = rodada.letra;
                    const primeiraLetra = letra !== letraAnterior;
                    
                    if (primeiraLetra) {
                      letraAnterior = letra;
                      contadorLetra = 0;
                    }
                    
                    const mostrarLetra = contadorLetra === 0;
                    contadorLetra++;
                    
                    return (
                      <tr key={`${jogador.id}-${idx}`} className={primeiraLetra ? 'nova-letra' : ''}>
                        {mostrarLetra ? (
                          <td className="letra-col" rowSpan={linhasPorLetra[letra]}>{letra}</td>
                        ) : null}
                        <td className="nick-col">
                          {jogador.nickname} {jogador.id === donoSala && '👑'}
                        </td>
                        {categoriasSelecionadas.map(cat => (
                          <td key={cat} title={rodada.respostas[cat]}>{rodada.respostas[cat] || '-'}</td>
                        ))}
                        <td className="pts-col">{rodada.total}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>

        <div className="painel-lateral">
          <h2>Ranking</h2>
          {Object.values(jogadores)
            .sort((a, b) => b.pontuacaoTotal - a.pontuacaoTotal)
            .map((jogador, index) => (
              <div key={jogador.id} className={`ranking-item-placar ${index === 0 ? 'primeiro' : ''}`}>
                <span className="nick">
                  {index + 1}º {jogador.nickname} {jogador.id === donoSala && '👑'}
                </span>
                <span className="pontos">{jogador.pontuacaoTotal}pts</span>
              </div>
            ))}
        </div>
      </div>
      
      {jogoIniciado && (
        <div className="rodape-noticias">
          <div className="ticker-wrapper">
            <div className="ticker-content">
              {gerarNoticias().map((noticia, idx) => (
                <span key={idx} className="ticker-item">{noticia}</span>
              ))}
              {gerarNoticias().map((noticia, idx) => (
                <span key={`dup-${idx}`} className="ticker-item">{noticia}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

