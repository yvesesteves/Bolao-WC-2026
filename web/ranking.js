const supabaseUrl = 'https://yelsvxblsipvzceinvvv.supabase.co';
const supabaseKey = 'sb_publishable_VPKkKOLo8LkjaHS9ToJBCA_-eYrT5Ga';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// 1. Inicializa pegando o ID da liga e arrumando o botão de voltar
async function inicializarRanking() {
    const urlParams = new URLSearchParams(window.location.search);
    const ligaIdAtual = urlParams.get('id');

    if (!ligaIdAtual) {
        alert("Liga não encontrada!");
        window.location.href = 'ligas.html';
        return;
    }

    // Arruma o botão "Palpites" para levar o ID junto e não dar erro!
    document.getElementById('link-voltar-palpites').href = `palpites.html?id=${ligaIdAtual}`;

    // Passa a variável como um "bastão" para a próxima função
    carregarRanking(ligaIdAtual);
}

// A função agora "recebe" a variável ligaIdAtual dentro dos parênteses
async function carregarRanking(ligaIdAtual) {
    const listaDiv = document.getElementById('lista-ranking');
    listaDiv.innerHTML = '<p style="color: white; text-align: center;">Calculando pontos...</p>';

    // 1. PRIMEIRO PASSO: Descobrir QUEM são os participantes DESTA liga específica
    const { data: participantes, error: erroPart } = await supabaseClient
        .from('participantes')
        .select('usuario_id')
        .eq('liga_id', ligaIdAtual);

    if (erroPart || !participantes || participantes.length === 0) {
        listaDiv.innerHTML = '<p style="color: white; text-align: center;">Nenhum participante encontrado nesta liga.</p>';
        return;
    }

    // Extrai apenas os IDs dos participantes em uma lista
    const idsNaLiga = participantes.map(p => p.usuario_id);

    // 2. Busca apenas os palpites e extras da galera QUE ESTÁ NA LIGA
    const { data: palpites } = await supabaseClient.from('palpites').select('usuario_id, pontos_obtidos').in('usuario_id', idsNaLiga);
    const { data: extras } = await supabaseClient.from('palpites_extras').select('usuario_id, pontos_obtidos').in('usuario_id', idsNaLiga);

    // 3. Busca os nomes reais na tabela 'perfis' apenas dessa galera
    const { data: perfis } = await supabaseClient.from('perfis').select('id, nome').in('id', idsNaLiga);

    // Cria o mapa de nomes para acesso rápido
    const mapaNomes = {};
    if (perfis) {
        perfis.forEach(perfil => mapaNomes[perfil.id] = perfil.nome);
    }

    const pontuacoes = {};
    
    // Inicializa todo mundo da liga com 0 pontos. 
    // Assim, mesmo quem ainda não fez palpite, aparece listado no ranking
    idsNaLiga.forEach(id => {
        pontuacoes[id] = 0;
    });

    // 5. Soma os pontos dos jogos e dos palpites extras
    if (palpites) {
        palpites.forEach(p => pontuacoes[p.usuario_id] += (p.pontos_obtidos || 0));
    }
    if (extras) {
        extras.forEach(e => pontuacoes[e.usuario_id] += (e.pontos_obtidos || 0));
    }

    // 6. Converte para lista e ordena do maior para o menor
    const listaRanking = Object.entries(pontuacoes).sort((a, b) => b[1] - a[1]);

    listaDiv.innerHTML = '';

    // 7. Desenha na tela
    listaRanking.forEach((item, index) => {
        const usuarioId = item[0];
        const pontos = item[1];
        
        // Agora o nomeReal vai achar o nome verdadeiro ou usar "Jogador" se o cara não tiver cadastrado ainda
        const nomeReal = mapaNomes[usuarioId] || "Jogador"; 

        const div = document.createElement('div');
        div.className = 'ranking-item';
        div.innerHTML = `
            <span class="ranking-pos">${index + 1}º</span>
            <span class="ranking-nome">${nomeReal}</span>
            <span class="ranking-pts">${pontos} pts</span>
        `;
        listaDiv.appendChild(div);
    });
}

inicializarRanking();