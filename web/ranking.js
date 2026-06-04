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

    carregarRanking();
}

async function carregarRanking() {
    const listaDiv = document.getElementById('lista-ranking');
    listaDiv.innerHTML = '<p style="color: white; text-align: center;">Calculando pontos...</p>';

    // 2. Busca os pontos
    const { data: palpites } = await supabaseClient.from('palpites').select('usuario_id, pontos_obtidos');
    const { data: extras } = await supabaseClient.from('palpites_extras').select('usuario_id, pontos_obtidos');

    // 3. Busca os NOMES REAIS na tabela perfis
    const { data: perfis } = await supabaseClient.from('perfis').select('id, nome');

    // Cria um mapa para achar o nome facilmente a partir do ID
    const mapaNomes = {};
    if (perfis) {
        perfis.forEach(perfil => mapaNomes[perfil.id] = perfil.nome);
    }

    const pontuacoes = {};

    // Soma pontos dos jogos
    if (palpites) {
        palpites.forEach(p => {
            pontuacoes[p.usuario_id] = (pontuacoes[p.usuario_id] || 0) + (p.pontos_obtidos || 0);
        });
    }

    // Soma pontos dos extras
    if (extras) {
        extras.forEach(e => {
            pontuacoes[e.usuario_id] = (pontuacoes[e.usuario_id] || 0) + (e.pontos_obtidos || 0);
        });
    }

    // Converte para lista e ordena do maior para o menor
    const listaRanking = Object.entries(pontuacoes).sort((a, b) => b[1] - a[1]);

    listaDiv.innerHTML = '';

    if (listaRanking.length === 0) {
        listaDiv.innerHTML = '<p style="color: white; text-align: center;">Nenhum palpite computado ainda.</p>';
        return;
    }

    listaRanking.forEach((item, index) => {
        const usuarioId = item[0];
        const pontos = item[1];
        
        // Substitui aquele código feio pelo nome real (se não achar, coloca "Jogador")
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