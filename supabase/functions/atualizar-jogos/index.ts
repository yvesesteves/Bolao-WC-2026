import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// 1. Nosso Dicionário de Tradução Oficial
const dicionarioTimes: Record<string, string> = {
    "Algeria": "Argélia", "Argentina": "Argentina", "Australia": "Austrália",
    "Austria": "Áustria", "Belgium": "Bélgica", "Bosnia-Herzegovina": "Bósnia e Herzegovina",
    "Brazil": "Brasil", "Canada": "Canadá", "Cape Verde Islands": "Cabo Verde",
    "Colombia": "Colômbia", "Congo DR": "RD Congo", "Croatia": "Croácia",
    "Curaçao": "Curaçao", "Czechia": "República Tcheca", "Ecuador": "Equador",
    "Egypt": "Egito", "England": "Inglaterra", "France": "França",
    "Germany": "Alemanha", "Ghana": "Gana", "Haiti": "Haiti",
    "Iran": "Irã", "Iraq": "Iraque", "Ivory Coast": "Costa do Marfim",
    "Japan": "Japão", "Jordan": "Jordânia", "Mexico": "México",
    "Morocco": "Marrocos", "Netherlands": "Holanda", "New Zealand": "Nova Zelândia",
    "Norway": "Noruega", "Panama": "Panamá", "Paraguay": "Paraguai",
    "Portugal": "Portugal", "Qatar": "Catar", "Saudi Arabia": "Arábia Saudita",
    "Scotland": "Escócia", "Senegal": "Senegal", "South Africa": "África do Sul",
    "South Korea": "Coreia do Sul", "Spain": "Espanha", "Sweden": "Suécia",
    "Switzerland": "Suíça", "Tunisia": "Tunísia", "Turkey": "Turquia",
    "United States": "Estados Unidos", "Uruguay": "Uruguai", "Uzbekistan": "Uzbequistão"
};

serve(async (req: Request) => {
    try {
        // 2. Conecta no seu banco de dados
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 3. Vai na API do football-data e busca TODOS os jogos da Copa
        const apiToken = Deno.env.get('FOOTBALL_API_TOKEN') ?? '';
        const respostaApi = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
            headers: { 'X-Auth-Token': apiToken }
        });

        if (!respostaApi.ok) {
            throw new Error(`Erro na API externa: ${respostaApi.statusText}`);
        }

        const dados = await respostaApi.json();
        let jogosAtualizados = 0;

        // 4. Analisa jogo por jogo
        for (const jogoApi of dados.matches) {
            const apiMatchId = jogoApi.id;
            
            // Trava de segurança: Pula o jogo se os times não existirem, 
            // usando "?." para evitar que o código dê crash se a API mandar "null"
            if (!jogoApi.homeTeam?.name || !jogoApi.awayTeam?.name) continue;
            
            // Previne casos em que a API manda a string genérica "TBA"
            if (jogoApi.homeTeam.name === 'TBA' || jogoApi.awayTeam.name === 'TBA') continue;

            // Traduz os nomes usando o nosso dicionário
            const timeA = dicionarioTimes[jogoApi.homeTeam.name] || jogoApi.homeTeam.name;
            const timeB = dicionarioTimes[jogoApi.awayTeam.name] || jogoApi.awayTeam.name;

            // Define o status, os placares e a nova variável de vencedor
            let status = 'aberto';
            let golsA = null;
            let golsB = null;
            let vencedorOficial = null;

            if (jogoApi.status === 'FINISHED') {
                const score = jogoApi.score;
                
                // Busca inteligente: tenta o fullTime, depois o regularTime (caso a API mude o formato)
                const tempGolsA = score?.fullTime?.home ?? score?.regularTime?.home ?? null;
                const tempGolsB = score?.fullTime?.away ?? score?.regularTime?.away ?? null;

                // A TRAVA DE SEGURANÇA: Só decreta o jogo como encerrado se os gols vieram de verdade!
                if (tempGolsA !== null && tempGolsB !== null) {
                    status = 'encerrado';
                    golsA = tempGolsA;
                    golsB = tempGolsB;

                    // NOVA LÓGICA: Se o jogo acabou e não é fase de grupos, descobre quem passou!
                    if (jogoApi.stage !== 'GROUP_STAGE') {
                        if (score.winner === 'HOME_TEAM') {
                            vencedorOficial = timeA;
                        } else if (score.winner === 'AWAY_TEAM') {
                            vencedorOficial = timeB;
                        }
                    }
                } else {
                    // Se a API disse que acabou, mas não mandou os gols, continua 'aberto' para tentar depois
                    status = 'aberto'; 
                }
            }

            // 5. Salva no Supabase (Agora enviando a coluna vencedor_oficial também)
            const { error } = await supabase
                .from('jogos')
                .update({ 
                    time_a: timeA, 
                    time_b: timeB, 
                    status: status, 
                    gols_oficial_a: golsA, 
                    gols_oficial_b: golsB,
                    vencedor_oficial: vencedorOficial 
                })
                .eq('api_match_id', apiMatchId);

            if (!error) jogosAtualizados++;
        }

        return new Response(
            JSON.stringify({ mensagem: `Sucesso! ${jogosAtualizados} jogos processados.` }),
            { headers: { "Content-Type": "application/json" } }
        );

    } catch (erro: any) { 
        return new Response(
            JSON.stringify({ erro: erro.message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});