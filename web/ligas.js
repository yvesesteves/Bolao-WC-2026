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

    // Mágica do Supabase: Faz um SELECT na tabela participantes fazendo um JOIN automático na tabela ligas
    const { data: participacoes, error } = await supabaseClient
        .from('participantes')
        .select(`
            pontuacao_total,
            ligas ( id, nome, codigo_convite )
        `)
        .eq('usuario_id', usuarioLogadoId);

    if (error) {
        grid.innerHTML = '<p style="color: #ef4444; text-align: center;">Erro ao carregar seus dados.</p>';
        return;
    }

    if (!participacoes || participacoes.length === 0) {
        // Retorna o visual vazio padrão se não achar nada
        grid.innerHTML = `
            <div class="empty-state">
                <h3>Você ainda não participa de nenhum bolão.</h3>
                <p>Crie uma liga ou use o código de um amigo para começar!</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = ''; // Limpa o "Carregando" da tela

// Desenha um card novo para cada liga encontrada
    participacoes.forEach(p => {
        const liga = p.ligas;
        const card = document.createElement('div');
        card.className = 'action-card'; 
        
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                <h3 style="margin: 0; font-size: 1.3rem;">${liga.nome}</h3>
                <span class="status-badge on" style="font-size: 0.75rem; letter-spacing: 1px; cursor: pointer;" onclick="copiarCodigo('${liga.codigo_convite}')" title="Clique para copiar">
                    CÓD: ${liga.codigo_convite} 📋
                </span>
            </div>
            
            <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center; border: 1px solid rgba(255,255,255,0.05);">
                <span style="color: #a0aec0; font-size: 0.85rem; display: block; margin-bottom: 5px;">Sua Pontuação</span>
                <div style="font-size: 2rem; font-weight: 800; color: #00f0ff; line-height: 1;">${p.pontuacao_total || 0} <span style="font-size: 1rem; color: #a0aec0; font-weight: normal;">pts</span></div>
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
    });
}

// Roda tudo!
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


