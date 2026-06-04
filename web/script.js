// 1. Inicialize com as suas chaves
const supabaseUrl = 'https://yelsvxblsipvzceinvvv.supabase.co'; 
const supabaseKey = 'sb_publishable_VPKkKOLo8LkjaHS9ToJBCA_-eYrT5Ga';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// 2. Função principal para gerenciar o estado do usuário
async function verificarLogin() {
    // Pergunta ao Supabase se tem alguém logado agora
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    // Captura a caixa de login inteira
    const authBox = document.querySelector('.auth-box');

    if (session) {
        // O USUÁRIO ESTÁ LOGADO! 
        // Vamos extrair o nome e a foto dele do Google
        const nomeUsuario = session.user.user_metadata.full_name || 'Jogador';
        const fotoUsuario = session.user.user_metadata.avatar_url || '';

        // Troca todo o HTML de dentro da caixa por uma mensagem de boas-vindas
        authBox.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
                <img src="${fotoUsuario}" alt="Foto de Perfil" style="width: 60px; height: 60px; border-radius: 50%; border: 2px solid #00f0ff; box-shadow: 0 0 10px rgba(0, 240, 255, 0.3);">
                <h2>Bem-vindo, ${nomeUsuario.split(' ')[0]}! ⚽</h2>
                <p class="auth-subtitle">Sua conta está conectada e pronta para os palpites.</p>
                <button class="btn-primary" id="btn-logout" style="background: #ef4444; color: white; width: 100%; box-shadow: none;">Sair da Conta</button>
            </div>
        `;

        // Ativa o botão de Sair (Logout)
        document.getElementById('btn-logout').addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            window.location.reload(); // Recarrega a página para voltar ao estado original
        });

    } else {
        // O USUÁRIO NÃO ESTÁ LOGADO
        // Ativa o botão do Google normalmente
        const btnLoginGoogle = document.getElementById('btn-login-google');
        
        if (btnLoginGoogle) {
            btnLoginGoogle.addEventListener('click', async () => {
                const { error } = await supabaseClient.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        // Isso garante que ele volte EXATAMENTE para o arquivo index.html atual
                        // Funciona tanto no seu PC quanto quando for para a Vercel!
                        redirectTo: window.location.origin + window.location.pathname
                    }
                });

                if (error) {
                    alert("Erro ao tentar fazer login com o Google.");
                }
            });
        }
    }
}

// 3. Executa a função assim que a página termina de carregar
verificarLogin();