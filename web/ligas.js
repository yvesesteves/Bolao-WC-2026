// 1. Inicializa o Supabase
const supabaseUrl = 'https://yelsvxblsipvzceinvvv.supabase.co';
const supabaseKey = 'sb_publishable_VPKkKOLo8LkjaHS9ToJBCA_-eYrT5Ga';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

let usuarioLogadoId = null;

// 2. Validação de Sessão Inicial
async function inicializarPagina() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        window.location.href = 'index.html'; // Chuta pro Início se não estiver logado
        return;
    }

    usuarioLogadoId = session.user.id;
    
    // Chama a função para buscar as ligas logo que a página abre
    carregarMinhasLigas();
}

// 3. Função para gerar um código aleatório (Ex: 8XF2A9)
function gerarCodigoConvite() {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigo = '';
    for (let i = 0; i < 6; i++) {
        codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return codigo;
}

// 4. AÇÃO: Criar Novo Bolão
document.getElementById('btn-create-league').addEventListener('click', async () => {
    const nomeLiga = document.getElementById('new-league-name').value;
    if (!nomeLiga) return alert("Digite um nome para o seu bolão!");

    const codigo = gerarCodigoConvite();

    // Passo A: Insere a liga na tabela 'ligas'
    const { data: novaLiga, error: erroLiga } = await supabaseClient
        .from('ligas')
        .insert({ nome: nomeLiga, codigo_convite: codigo, criador_id: usuarioLogadoId })
        .select()
        .single(); // Select e Single trazem o ID da liga que acabou de ser criada

    if (erroLiga) return alert("Erro ao criar liga. Tente novamente.");

    // Passo B: Insere o criador automaticamente na tabela 'participantes'
    const { error: erroParticipante } = await supabaseClient
        .from('participantes')
        .insert({ liga_id: novaLiga.id, usuario_id: usuarioLogadoId });

    if (erroParticipante) return alert("Liga criada, mas houve um erro ao te colocar nela.");

    alert(`Bolão criado com sucesso! Seu código de convite é: ${codigo}`);
    document.getElementById('new-league-name').value = ''; // Limpa o campo
    carregarMinhasLigas(); // Recarrega a tela instantaneamente
});

// 5. AÇÃO: Entrar em um Bolão
document.getElementById('btn-join-league').addEventListener('click', async () => {
    // Pega o código digitado e força para maiúsculas
    const codigoDigitado = document.getElementById('join-code').value.toUpperCase(); 
    if (codigoDigitado.length !== 6) return alert("O código de convite precisa ter exatos 6 caracteres.");

    // Passo A: Verifica se a liga existe buscando pelo código
    const { data: ligaEncontrada, error: erroBusca } = await supabaseClient
        .from('ligas')
        .select('id, nome')
        .eq('codigo_convite', codigoDigitado)
        .single();

    if (erroBusca || !ligaEncontrada) return alert("Bolão não encontrado. Verifique o código com seu amigo.");

    // Passo B: Tenta inserir o usuário na tabela 'participantes'
    const { error: erroParticipante } = await supabaseClient
        .from('participantes')
        .insert({ liga_id: ligaEncontrada.id, usuario_id: usuarioLogadoId });

    if (erroParticipante) {
        // Código 23505 é o erro padrão de banco de dados para "violação de chave primária"
        // Ou seja: o usuário tentou entrar em uma liga que ele já está!
        if (erroParticipante.code === '23505') {
            return alert("Você já está participando deste bolão!");
        }
        return alert("Erro ao tentar entrar no bolão.");
    }

    alert(`Sucesso! Você entrou no bolão: ${ligaEncontrada.nome}`);
    document.getElementById('join-code').value = '';
    carregarMinhasLigas();
});

// 6. AÇÃO: Buscar e Listar os Bolões do Usuário
async function carregarMinhasLigas() {
    const grid = document.getElementById('leagues-grid');
    grid.innerHTML = '<p style="color: white; text-align: center;">Carregando seus bolões...</p>';

    // Mágica do Supabase: Busca as ligas que o usuário participa
    const { data: participacoes, error } = await supabaseClient
        .from('participantes')
        .select(`
            liga_id,
            ligas ( id, nome, codigo_convite )
        `)
        .eq('usuario_id', usuarioLogadoId);

    if (error) {
        grid.innerHTML = '<p style="color: #ef4444; text-align: center;">Erro ao carregar seus dados.</p>';
        return;
    }

    if (!participacoes || participacoes.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <h3>Você ainda não participa de nenhum bolão.</h3>
                <p>Crie uma liga ou use o código de um amigo para começar!</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = ''; // Limpa o "Carregando" da tela

    // Usamos um for...of para podermos usar await e calcular o ranking de cada liga
    for (const p of participacoes) {
        const liga = p.ligas;

        // --- INÍCIO DA LÓGICA DE RANKING DINÂMICO CORRIGIDA ---
        // 1. Pega todos os membros dessa liga
        const { data: membros } = await supabaseClient
            .from('participantes')
            .select('usuario_id')
            .eq('liga_id', liga.id);

        const idsMembros = membros ? membros.map(m => m.usuario_id) : [];

        // 2. Busca os palpites APENAS da galera que tá nessa liga (Usando .in no lugar de .eq)
        const { data: palpitesLiga, error: erroPalpites } = await supabaseClient
            .from('palpites')
            .select('usuario_id, pontos_obtidos')
            .in('usuario_id', idsMembros);

        if (erroPalpites) console.error("Erro nos palpites:", erroPalpites);

        // 3. Inicializa todos com zero e soma os pontos
        const mapaPontos = {};
        idsMembros.forEach(id => mapaPontos[id] = 0);
        
        if (palpitesLiga) {
            palpitesLiga.forEach(palpite => {
                if (mapaPontos[palpite.usuario_id] !== undefined) {
                    mapaPontos[palpite.usuario_id] += (Number(palpite.pontos_obtidos) || 0);
                }
            });
        }

        // 4. Cria a lista do ranking e ordena do maior para o menor
        const ranking = Object.keys(mapaPontos).map(id => ({
            usuario_id: id,
            total: mapaPontos[id]
        })).sort((a, b) => b.total - a.total);

        // 5. Descobre a posição e a pontuação do usuário logado
        const indexUser = ranking.findIndex(r => r.usuario_id === usuarioLogadoId);
        const minhaPontuacao = indexUser !== -1 ? ranking[indexUser].total : 0;
        const minhaPosicao = indexUser !== -1 ? (indexUser + 1) + "º" : "-";
        // --- FIM DA LÓGICA DE RANKING ---

        const card = document.createElement('div');
        card.className = 'action-card'; 
        
        // Novo HTML do Card com Pontuação e Posição dividindo o espaço
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                <h3 style="margin: 0; font-size: 1.3rem;">${liga.nome}</h3>
                <span class="status-badge on" style="font-size: 0.75rem; letter-spacing: 1px; cursor: pointer;" onclick="copiarCodigo('${liga.codigo_convite}')" title="Clique para copiar">
                    CÓD: ${liga.codigo_convite} 📋
                </span>
            </div>
            
            <div style="display: flex; justify-content: space-around; align-items: center; background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.05);">
                <div style="text-align: center; width: 45%;">
                    <span style="color: #a0aec0; font-size: 0.85rem; display: block; margin-bottom: 5px;">Sua Pontuação</span>
                    <div style="font-size: 1.8rem; font-weight: 800; color: #00f0ff; line-height: 1;">${minhaPontuacao} <span style="font-size: 0.9rem; color: #a0aec0; font-weight: normal;">pts</span></div>
                </div>
                
                <div style="width: 1px; height: 40px; background: rgba(255,255,255,0.1);"></div>
                
                <div style="text-align: center; width: 45%;">
                    <span style="color: #a0aec0; font-size: 0.85rem; display: block; margin-bottom: 5px;">Sua Colocação</span>
                    <div style="font-size: 1.8rem; font-weight: 800; color: #fbbf24; line-height: 1;">${minhaPosicao} <span style="font-size: 0.9rem; color: #a0aec0; font-weight: normal;">lugar</span></div>
                </div>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <button class="btn-save dark" style="width: 100%; border: 1px solid rgba(255,255,255,0.1);" onclick="window.location.href='palpites.html?id=${liga.id}'">Entrar na Sala</button>
                
                <button style="width: 100%; background: transparent; color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; padding: 10px; cursor: pointer; font-family: inherit; font-weight: 600; font-size: 0.85rem; transition: all 0.3s ease;" 
                onmouseover="this.style.background='rgba(239, 68, 68, 0.1)'; this.style.borderColor='#ef4444';" 
                onmouseout="this.style.background='transparent'; this.style.borderColor='rgba(239, 68, 68, 0.3)';" 
                onclick="sairDaLiga('${liga.id}', '${liga.nome}')">Sair do Bolão</button>
            </div>
        `;
        grid.appendChild(card);
    }
}

// Roda tudo
inicializarPagina();

// Função para copiar o código com feedback visual
window.copiarCodigo = function(codigo) {
    navigator.clipboard.writeText(codigo).then(() => {
        alert(`Código ${codigo} copiado para a área de transferência! Envie para seus amigos.`);
    }).catch(err => {
        console.error('Erro ao copiar: ', err);
    });
}

// ==========================================
// 7. AÇÃO: Sair de uma Liga (DELETE)
// ==========================================
window.sairDaLiga = async function(ligaId, nomeLiga) {
    // UX: Confirmação dupla para evitar cliques acidentais
    const confirmacao = confirm(`Tem certeza que deseja sair do bolão "${nomeLiga}"?\n\nVocê perderá o acesso a esta sala e precisará do código de convite se quiser voltar.`);
    
    if (!confirmacao) return; // Se o usuário cancelar, nada acontece

// Deleta e pede a contagem exata de linhas afetadas
    const { error, count } = await supabaseClient
        .from('participantes')
        .delete({ count: 'exact' }) // Pede para o Supabase contar
        .match({ liga_id: ligaId, usuario_id: usuarioLogadoId });

    if (error || count === 0) {
        console.error("Erro ou bloqueio do Supabase:", error);
        alert("Erro ao tentar sair da liga. Verifique as permissões do banco de dados.");
    } else {
        alert(`Você saiu do bolão "${nomeLiga}".`);
        carregarMinhasLigas(); 
    }
}


