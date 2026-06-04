// 1. Inicializa o Supabase
const supabaseUrl = 'https://yelsvxblsipvzceinvvv.supabase.co';
const supabaseKey = 'sb_publishable_VPKkKOLo8LkjaHS9ToJBCA_-eYrT5Ga';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

let usuarioLogadoId = null;
let ligaIdAtual = null;
let todosJogos = [];
let mapaPalpites = {};
let rodadaAtual = 1;

// Redireciona para o Ranking passando o ID da Liga atual
window.irParaRanking = function() {
    if (ligaIdAtual) {
        window.location.href = `ranking.html?id=${ligaIdAtual}`;
    } else {
        alert("Erro: ID da liga não encontrado.");
    }
}

// 2. Inicialização da Página
async function inicializarPagina() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
        return;
    }
    usuarioLogadoId = session.user.id;

    const urlParams = new URLSearchParams(window.location.search);
    ligaIdAtual = urlParams.get('id');

    if (!ligaIdAtual) {
        alert("Liga não encontrada!");
        window.location.href = 'ligas.html';
        return;
    }

    carregarCabecalho();
    carregarJogos();
    
    // A função carregarExtras foi modificada para retornar uma Promessa
    await carregarExtras(); 
    
    // AQUI ESTAVA O PROBLEMA: A função foi chamada logo após carregar os extras!
    verificarTravaExtras(); 
}

async function carregarCabecalho() {
    const { data: liga } = await supabaseClient.from('ligas').select('nome').eq('id', ligaIdAtual).single();
    if (liga) document.getElementById('nome-liga-atual').textContent = liga.nome;

    const { data: perfil } = await supabaseClient.from('perfis').select('nome').eq('id', usuarioLogadoId).single();
    if (perfil && perfil.nome) document.getElementById('nome-jogador-atual').textContent = perfil.nome;
}

function formatarDataHeader(dataISO) {
    const data = new Date(dataISO);
    const opcoes = { weekday: 'long', day: 'numeric', month: 'long' };
    let formatada = data.toLocaleDateString('pt-BR', opcoes);
    return formatada.charAt(0).toUpperCase() + formatada.slice(1);
}

function formatarHora(dataISO) {
    const data = new Date(dataISO);
    return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// --- REDE DE SEGURANÇA DAS BANDEIRAS ---
function obterCaminhoBandeira(nomeTime, caminhoBanco) {
    if (!nomeTime || nomeTime === "A definir") {
        return "./img/country/default.png"; 
    }
    if (caminhoBanco) {
        return caminhoBanco;
    }
    return `./img/country/${nomeTime}.png`;
}

// 3. Carrega os Dados
async function carregarJogos() {
    const divLista = document.getElementById('lista-jogos');
    divLista.innerHTML = '<p style="color: white; text-align: center;">Carregando partidas...</p>';

    const { data: jogos } = await supabaseClient.from('jogos').select('*').order('data_jogo', { ascending: true });
    const { data: palpitesUsuario } = await supabaseClient.from('palpites').select('*').eq('usuario_id', usuarioLogadoId);

    if (palpitesUsuario) {
        palpitesUsuario.forEach(p => mapaPalpites[p.jogo_id] = p);
    }

    todosJogos = jogos.map(jogo => {
        const dataLocal = new Date(jogo.data_jogo);
        const dia = dataLocal.getDate(); 
        
        let rodada = 1;
        if (dia >= 18 && dia <= 23) rodada = 2;
        if (dia >= 24) rodada = 3;
        
        return { ...jogo, rodada };
    });

    renderizarRodada();
}

// 4. Desenha a Tela (Com Travas de Segurança e Placares Oficiais)
function renderizarRodada() {
    const divLista = document.getElementById('lista-jogos');
    divLista.innerHTML = ''; 

    document.getElementById('label-rodada').textContent = `Rodada ${rodadaAtual}`;
    document.getElementById('btn-prev').disabled = (rodadaAtual === 1);
    document.getElementById('btn-next').disabled = (rodadaAtual === 3);

    const jogosDaRodada = todosJogos.filter(j => j.rodada === rodadaAtual && (j.fase === 'GROUP_STAGE' || j.fase === 'Fase de Grupos'));
    let dataAtualGrupo = '';
    const agora = new Date(); 

    jogosDaRodada.forEach(jogo => {
        const dataFormatada = formatarDataHeader(jogo.data_jogo);
        const horaFormatada = formatarHora(jogo.data_jogo);
        const palpite = mapaPalpites[jogo.id]; 
        
        const dataHoraJogo = new Date(jogo.data_jogo);
        const jogoBloqueado = agora >= dataHoraJogo; 
        const jogoEncerrado = jogo.status === 'encerrado';

        if (dataFormatada !== dataAtualGrupo) {
            const headerData = document.createElement('h3');
            headerData.className = 'data-divisor';
            headerData.textContent = dataFormatada;
            divLista.appendChild(headerData);
            dataAtualGrupo = dataFormatada;
        }

        const valA = palpite ? palpite.palpite_gols_a : '';
        const valB = palpite ? palpite.palpite_gols_b : '';

        const inputStatus = jogoBloqueado ? 'disabled' : '';
        const cardClasse = jogoEncerrado ? 'jogo-card encerrado' : 'jogo-card';

        let htmlPlacarOficial = '';
        if (jogoEncerrado) {
            const pts = palpite ? palpite.pontos_obtidos : 0;
            htmlPlacarOficial = `
                <div class="placar-oficial-badge">
                    Resultado Oficial: ${jogo.gols_oficial_a} x ${jogo.gols_oficial_b} | Você ganhou: +${pts} pts
                </div>
            `;
        }

        const card = document.createElement('div');
        card.className = cardClasse;
        card.innerHTML = `
            <div class="jogo-info-top">
                <span class="badge-fase">${jogo.fase}</span>
                <span class="hora-jogo">${jogoBloqueado && !jogoEncerrado ? 'Em andamento' : horaFormatada}</span>
            </div>
            <div class="times-container">
                <div class="time-row">
                    <div class="time-detalhe">
                        <img src="${obterCaminhoBandeira(jogo.time_a, jogo.bandeira_a)}" alt="${jogo.time_a}" class="flag-icon-small" onerror="this.src='./img/country/default.png'">
                        <span class="time-nome">${jogo.time_a}</span>
                    </div>
                    <input type="number" id="gols_a_${jogo.id}" class="input-placar" min="0" max="15" placeholder="-" value="${valA}" ${inputStatus}>
                </div>
                <div class="time-row">
                    <div class="time-detalhe">
                        <img src="${obterCaminhoBandeira(jogo.time_b, jogo.bandeira_b)}" alt="${jogo.time_b}" class="flag-icon-small" onerror="this.src='./img/country/default.png'">
                        <span class="time-nome">${jogo.time_b}</span>
                    </div>
                    <input type="number" id="gols_b_${jogo.id}" class="input-placar" min="0" max="15" placeholder="-" value="${valB}" ${inputStatus}>
                </div>
            </div>
            ${htmlPlacarOficial}
        `;
        divLista.appendChild(card);
    });

    const temJogoAberto = jogosDaRodada.some(j => new Date(j.data_jogo) > agora);
    if (temJogoAberto) {
        const btnSalvarTudo = document.createElement('button');
        btnSalvarTudo.className = 'btn-salvar-palpite save-all-btn';
        btnSalvarTudo.textContent = `Salvar Palpites - Rodada ${rodadaAtual}`;
        btnSalvarTudo.onclick = salvarRodadaEmLote;
        divLista.appendChild(btnSalvarTudo);
    }
}

// Controles de Navegação
document.getElementById('btn-prev').addEventListener('click', () => {
    if (rodadaAtual > 1) { rodadaAtual--; renderizarRodada(); window.scrollTo(0, 0); }
});

document.getElementById('btn-next').addEventListener('click', () => {
    if (rodadaAtual < 3) { rodadaAtual++; renderizarRodada(); window.scrollTo(0, 0); }
});

// 5. AÇÃO: Salvar em Lote (Bulk Upsert)
window.salvarRodadaEmLote = async function() {
    const jogosDaRodada = todosJogos.filter(j => j.rodada === rodadaAtual && (j.fase === 'GROUP_STAGE' || j.fase === 'Fase de Grupos'));
    const palpitesParaSalvar = [];
    
    let jogosDisponiveis = 0; 
    const agora = new Date();

    jogosDaRodada.forEach(jogo => {
        const dataHoraJogo = new Date(jogo.data_jogo);
        
        if (agora < dataHoraJogo) {
            jogosDisponiveis++;
            
            const golsA = document.getElementById(`gols_a_${jogo.id}`).value;
            const golsB = document.getElementById(`gols_b_${jogo.id}`).value;

            if (golsA !== '' && golsB !== '') {
                palpitesParaSalvar.push({
                    usuario_id: usuarioLogadoId,
                    jogo_id: jogo.id,
                    palpite_gols_a: parseInt(golsA),
                    palpite_gols_b: parseInt(golsB)
                });
            }
        }
    });

    if (palpitesParaSalvar.length === 0) {
        return alert("Preencha o placar de pelo menos um jogo antes de salvar!");
    }

    if (palpitesParaSalvar.length < jogosDisponiveis) {
        const faltam = jogosDisponiveis - palpitesParaSalvar.length;
        const confirmar = confirm(`Atenção: Você deixou ${faltam} jogo(s) em branco nesta rodada.\n\nTem certeza que deseja salvar e deixar esses jogos sem palpite?`);
        
        if (!confirmar) return; 
    }

    const { error } = await supabaseClient
        .from('palpites')
        .upsert(palpitesParaSalvar, { onConflict: 'usuario_id, jogo_id' });

    if (error) {
        console.error(error);
        alert("Erro ao salvar os palpites.");
    } else {
        palpitesParaSalvar.forEach(p => {
            mapaPalpites[p.jogo_id] = p;
        });
        alert(`✅ Sucesso! ${palpitesParaSalvar.length} palpites salvos na Rodada ${rodadaAtual}.`);
    }
}

// ==========================================
// LÓGICA DE MATA-MATA E NAVEGAÇÃO
// ==========================================
const nomesFasesMataMata = {
    'LAST_32': '16 avos de final',
    'LAST_16': 'Oitavas de final',
    'QUARTER_FINALS': 'Quartas de final',
    'SEMI_FINALS': 'Semifinal',
    'THIRD_PLACE': 'Disputa de 3º Lugar',
    'FINAL': 'Final'
};

const ordemFasesMata = [
    { id: 'LAST_32', label: '16 avos de final' },
    { id: 'LAST_16', label: 'Oitavas de final' },
    { id: 'QUARTER_FINALS', label: 'Quartas de final' },
    { id: 'SEMI_FINALS', label: 'Semifinais' },
    { id: 'FINAIS', label: 'Finais' } 
];
let indiceFaseMata = 0;

function renderizarMataMata() {
    const divMata = document.getElementById('lista-jogos-mata');
    divMata.innerHTML = '';

    const faseSelecionada = ordemFasesMata[indiceFaseMata];
    document.getElementById('label-fase-mata').textContent = faseSelecionada.label;
    document.getElementById('btn-prev-mata').disabled = (indiceFaseMata === 0);
    document.getElementById('btn-next-mata').disabled = (indiceFaseMata === ordemFasesMata.length - 1);

    let jogosDaFase = todosJogos.filter(j => {
        if (faseSelecionada.id === 'FINAIS') {
            return j.fase === 'THIRD_PLACE' || j.fase === 'FINAL';
        }
        return j.fase === faseSelecionada.id;
    });

    const agora = new Date();
    let temJogoAbertoMata = false;

    jogosDaFase.forEach(jogo => {
        const nomeFaseBR = nomesFasesMataMata[jogo.fase] || jogo.fase;
        const horaFormatada = formatarHora(jogo.data_jogo);
        const palpite = mapaPalpites[jogo.id];

        if (faseSelecionada.id === 'FINAIS') {
            const headerFase = document.createElement('h3');
            headerFase.className = 'data-divisor';
            headerFase.textContent = nomeFaseBR;
            divMata.appendChild(headerFase);
        }

        const timeA_nome = jogo.time_a ? jogo.time_a : "A definir";
        const timeB_nome = jogo.time_b ? jogo.time_b : "A definir";
        
        const imgA = obterCaminhoBandeira(jogo.time_a, jogo.bandeira_a);
        const imgB = obterCaminhoBandeira(jogo.time_b, jogo.bandeira_b);

        const valA = palpite ? palpite.palpite_gols_a : '';
        const valB = palpite ? palpite.palpite_gols_b : '';

        const dataHoraJogo = new Date(jogo.data_jogo);
        const jogoBloqueado = (agora >= dataHoraJogo) || !jogo.time_a || !jogo.time_b; 
        const jogoEncerrado = jogo.status === 'encerrado';

        if (!jogoBloqueado) temJogoAbertoMata = true;

        const inputStatus = jogoBloqueado ? 'disabled' : '';
        const cardClasse = jogoEncerrado ? 'jogo-card encerrado' : 'jogo-card';

        let htmlPlacarOficial = '';
        if (jogoEncerrado) {
            const pts = palpite ? palpite.pontos_obtidos : 0;
            htmlPlacarOficial = `
                <div class="placar-oficial-badge">
                    Resultado Oficial: ${jogo.gols_oficial_a} x ${jogo.gols_oficial_b} | Você ganhou: +${pts} pts
                </div>
            `;
        }

        const card = document.createElement('div');
        card.className = cardClasse;
        card.innerHTML = `
            <div class="jogo-info-top">
                <span class="badge-fase">${formatarDataHeader(jogo.data_jogo)}</span>
                <span class="hora-jogo">${jogoBloqueado && !jogoEncerrado && jogo.time_a ? 'Em andamento' : horaFormatada}</span>
            </div>
            <div class="times-container">
                <div class="time-row" style="cursor: pointer;" onclick="if(!'${inputStatus}') document.getElementById('radio_a_${jogo.id}').click()">
                    <div class="time-detalhe">
                        <img src="${imgA}" alt="${timeA_nome}" class="flag-icon-small" onerror="this.src='./img/country/default.png'">
                        <span class="time-nome">${timeA_nome}</span>
                    </div>
                    <input type="radio" name="vencedor_${jogo.id}" id="radio_a_${jogo.id}" value="${timeA_nome}" class="radio-vencedor" ${inputStatus} ${palpite && palpite.palpite_vencedor === timeA_nome ? 'checked' : ''}>
                </div>
                <div class="time-row" style="cursor: pointer;" onclick="if(!'${inputStatus}') document.getElementById('radio_b_${jogo.id}').click()">
                    <div class="time-detalhe">
                        <img src="${imgB}" alt="${timeB_nome}" class="flag-icon-small" onerror="this.src='./img/country/default.png'">
                        <span class="time-nome">${timeB_nome}</span>
                    </div>
                    <input type="radio" name="vencedor_${jogo.id}" id="radio_b_${jogo.id}" value="${timeB_nome}" class="radio-vencedor" ${inputStatus} ${palpite && palpite.palpite_vencedor === timeB_nome ? 'checked' : ''}>
                </div>
            </div>
            ${htmlPlacarOficial}
        `;
        divMata.appendChild(card);
    });

    const btnSalvarMata = document.getElementById('btn-salvar-mata');
    btnSalvarMata.style.display = temJogoAbertoMata ? 'block' : 'none';
    btnSalvarMata.textContent = `Salvar Palpites - ${faseSelecionada.label}`;
}

document.getElementById('btn-prev-mata').addEventListener('click', () => {
    if (indiceFaseMata > 0) { 
        indiceFaseMata--; 
        renderizarMataMata(); 
        window.scrollTo(0, 0); 
    }
});

document.getElementById('btn-next-mata').addEventListener('click', () => {
    if (indiceFaseMata < ordemFasesMata.length - 1) { 
        indiceFaseMata++; 
        renderizarMataMata(); 
        window.scrollTo(0, 0); 
    }
});

window.salvarMataMataEmLote = async function() {
    const faseSelecionada = ordemFasesMata[indiceFaseMata];
    let jogosDaFase = todosJogos.filter(j => {
        if (faseSelecionada.id === 'FINAIS') return j.fase === 'THIRD_PLACE' || j.fase === 'FINAL';
        return j.fase === faseSelecionada.id;
    });

    const palpitesParaSalvar = [];
    let jogosDisponiveis = 0;
    const agora = new Date();

    jogosDaFase.forEach(jogo => {
        const dataHoraJogo = new Date(jogo.data_jogo);
        
        if (agora < dataHoraJogo && jogo.time_a && jogo.time_b) {
            jogosDisponiveis++;
            
            const radioSelecionado = document.querySelector(`input[name="vencedor_${jogo.id}"]:checked`);
            if (radioSelecionado) {
                palpitesParaSalvar.push({
                    usuario_id: usuarioLogadoId,
                    jogo_id: jogo.id,
                    palpite_vencedor: radioSelecionado.value, 
                    palpite_gols_a: null, 
                    palpite_gols_b: null
                });
            }
        }
    });

    if (palpitesParaSalvar.length === 0) return alert("Selecione quem vai avançar em pelo menos um jogo antes de salvar!");

    if (palpitesParaSalvar.length < jogosDisponiveis) {
        const faltam = jogosDisponiveis - palpitesParaSalvar.length;
        const confirmar = confirm(`Atenção: Você não escolheu o vencedor de ${faltam} jogo(s) nesta fase.\n\nTem certeza que deseja salvar assim mesmo?`);
        if (!confirmar) return;
    }

    const { error } = await supabaseClient
        .from('palpites')
        .upsert(palpitesParaSalvar, { onConflict: 'usuario_id, jogo_id' });

    if (error) {
        console.error(error);
        alert("Erro ao salvar os palpites do mata-mata.");
    } else {
        palpitesParaSalvar.forEach(p => { mapaPalpites[p.jogo_id] = p; });
        alert(`✅ Sucesso! ${palpitesParaSalvar.length} seleções salvas para: ${faseSelecionada.label}.`);
    }
}

inicializarPagina();

// --- LÓGICA DE TROCA DE ABAS ---
const btnExtras = document.getElementById('btn-tab-extras');
const btnGrupos = document.getElementById('btn-tab-grupos');
const btnMata = document.getElementById('btn-tab-mata');

const containerExtras = document.getElementById('container-extras');
const containerGrupos = document.getElementById('container-grupos');
const containerMata = document.getElementById('container-mata'); 

function alterarAba(abaAtiva) {
    btnExtras.classList.remove('active');
    btnGrupos.classList.remove('active');
    btnMata.classList.remove('active');

    containerExtras.style.display = 'none';
    containerGrupos.style.display = 'none';
    containerMata.style.display = 'none'; 

    if (abaAtiva === 'extras') {
        btnExtras.classList.add('active');
        containerExtras.style.display = 'block';
    } else if (abaAtiva === 'grupos') {
        btnGrupos.classList.add('active');
        containerGrupos.style.display = 'block';
    } else if (abaAtiva === 'mata') {
        btnMata.classList.add('active');
        containerMata.style.display = 'block'; 
        renderizarMataMata(); 
    }
}

btnExtras.addEventListener('click', () => alterarAba('extras'));
btnGrupos.addEventListener('click', () => alterarAba('grupos'));
btnMata.addEventListener('click', () => alterarAba('mata'));

// ==========================================
// LÓGICA DE PALPITES EXTRAS
// ==========================================
async function carregarExtras() {
    const { data: extrasUsuario, error } = await supabaseClient
        .from('palpites_extras')
        .select('*')
        .eq('usuario_id', usuarioLogadoId)
        .single(); 

    if (extrasUsuario) {
        if (extrasUsuario.campeao) document.getElementById('extra-campeao').value = extrasUsuario.campeao;
        if (extrasUsuario.vice) document.getElementById('extra-vice').value = extrasUsuario.vice;
        if (extrasUsuario.zebra) document.getElementById('extra-zebra').value = extrasUsuario.zebra;
        if (extrasUsuario.decepcao) document.getElementById('extra-decepcao').value = extrasUsuario.decepcao;
        if (extrasUsuario.artilheiro) document.getElementById('extra-artilheiro').value = extrasUsuario.artilheiro;
        if (extrasUsuario.assistente) document.getElementById('extra-assistente').value = extrasUsuario.assistente;
        if (extrasUsuario.melhor_jogador) document.getElementById('extra-melhor').value = extrasUsuario.melhor_jogador;
    }
}

window.salvarExtras = async function() {
    // 🔒 CADEADO DUPLO: Bloqueia a ação se o prazo já passou
    const dataLimite = new Date('2026-06-11T15:59:00-03:00'); // Lembre de colocar a data oficial aqui depois dos testes
    if (new Date() > dataLimite) {
        return alert("O prazo para os palpites extras já foi encerrado!");
    }

    // Captura o que foi selecionado na tela
    const campeao = document.getElementById('extra-campeao').value;
    // ... o resto da função continua igualzinho ...

    // Captura o que foi selecionado na tela
    const campeao = document.getElementById('extra-campeao').value;
    // ... o resto da função continua igualzinho ...
    const campeao = document.getElementById('extra-campeao').value;
    const vice = document.getElementById('extra-vice').value;
    const zebra = document.getElementById('extra-zebra').value;
    const decepcao = document.getElementById('extra-decepcao').value;
    const artilheiro = document.getElementById('extra-artilheiro').value;
    const assistente = document.getElementById('extra-assistente').value;
    const melhor_jogador = document.getElementById('extra-melhor').value;

    if (!campeao && !vice && !zebra && !decepcao && !artilheiro && !assistente && !melhor_jogador) {
        return alert("Preencha ao menos um palpite extra para salvar!");
    }

    const { error } = await supabaseClient
        .from('palpites_extras')
        .upsert({
            usuario_id: usuarioLogadoId,
            campeao: campeao || null,
            vice: vice || null,
            zebra: zebra || null,
            decepcao: decepcao || null,
            artilheiro: artilheiro || null,
            assistente: assistente || null,
            melhor_jogador: melhor_jogador || null
        }, { onConflict: 'usuario_id' }); 

    if (error) {
        console.error("Erro no Supabase:", error);
        alert("Erro ao salvar os palpites extras. Tente novamente.");
    } else {
        alert("Palpites Extras salvos com sucesso! 🌟");
    }
}

// 8.Travar Palpites Extras (Data Limite)
function verificarTravaExtras() {
    // Define a data limite
    const dataLimite = new Date('2026-06-04T13:23:00-03:00');
    const agora = new Date();

    if (agora > dataLimite) {
        const camposExtras = document.querySelectorAll('.extra-input, .extra-select');
        camposExtras.forEach(campo => {
            campo.disabled = true;
            campo.style.opacity = '0.6';
            campo.style.cursor = 'not-allowed';
        });

        const btnSalvarExtras = document.getElementById('btn-salvar-extras'); 
        if (btnSalvarExtras) {
            btnSalvarExtras.disabled = true;
            btnSalvarExtras.textContent = '🔒 Palpites Encerrados';
            btnSalvarExtras.style.cursor = 'not-allowed';
            btnSalvarExtras.style.opacity = '0.5';
        }
    }
}