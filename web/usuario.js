// 1. Inicializa o Supabase
const supabaseUrl = 'https://yelsvxblsipvzceinvvv.supabase.co';
const supabaseKey = 'sb_publishable_VPKkKOLo8LkjaHS9ToJBCA_-eYrT5Ga';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Variável global para guardar quem é o usuário logado
let usuarioLogadoId = null;

// 2. Carrega a página
async function inicializarPagina() {
    // Verifica se a pessoa está logada
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        // Se tentar entrar na Área do Usuário sem logar, volta pro Início
        window.location.href = 'index.html';
        return;
    }

    usuarioLogadoId = session.user.id;

    // Busca os dados do usuário no banco
    const { data: perfil } = await supabaseClient
        .from('perfis')
        .select('nome')
        .eq('id', usuarioLogadoId)
        .single();

    // Se já tiver dados salvos no banco, preenche a tela automaticamente
    if (perfil && perfil.nome) {
        document.getElementById('user-name').value = perfil.nome;
    }
}

// --- FUNÇÃO DO BOTÃO DE SALVAR NOME ---
document.getElementById('btn-save-name').addEventListener('click', async () => {
    const nomeDigitado = document.getElementById('user-name').value;
    
    if (!nomeDigitado) return alert("Por favor, digite um nome.");

    const { error } = await supabaseClient
        .from('perfis')
        .upsert({ id: usuarioLogadoId, nome: nomeDigitado });

    if (error) {
        console.error("Erro ao salvar:", error);
        alert("Erro ao salvar o nome.");
    } else {
        alert("Nome salvo com sucesso! ⚽");
    }
});

// Inicia o processo assim que o arquivo é lido
inicializarPagina();