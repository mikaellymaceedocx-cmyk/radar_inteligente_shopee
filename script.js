// ========== VARIÁVEIS GLOBAIS ==========
const telaLogin = document.getElementById('tela-login');
const telasConteudo = {
    ofertas: document.getElementById('area-ofertas'),
    filtros: document.getElementById('area-filtros'),
    filtrados: document.getElementById('area-filtrados'),
    videos: document.getElementById('area-videos'),
    conta: document.getElementById('area-conta')
};
const botoesAbas = {
    ofertas: document.getElementById('aba-ofertas'),
    filtros: document.getElementById('aba-filtros'),
    filtrados: document.getElementById('aba-filtrados'),
    videos: document.getElementById('aba-videos'),
    conta: document.getElementById('aba-conta')
};

let configAPI = { appId: '', secret: '', url: '' };
let todosProdutos = [];
let produtosFiltrados = [];
let filtros = { afiliados: 10, vendas: 10, comissao: 5 };

// ========== INICIALIZAÇÃO ==========
window.onload = function() {
    carregarDadosSalvos();
    configurarEventos();
    configurarSliders();
};

function carregarDadosSalvos() {
    const nomeSalvo = localStorage.getItem('rs_nome');
    const appIdSalvo = localStorage.getItem('rs_appId');
    const secretSalvo = localStorage.getItem('rs_secret');
    const urlSalva = localStorage.getItem('rs_apiUrl');

    if (nomeSalvo) document.getElementById('nome-usuario').value = nomeSalvo;
    if (appIdSalvo) document.getElementById('app-id').value = appIdSalvo;
    if (secretSalvo) document.getElementById('secret-key').value = secretSalvo;
    if (urlSalva) document.getElementById('api-url').value = urlSalva;

    if (appIdSalvo && secretSalvo && urlSalva) {
        configAPI.appId = appIdSalvo;
        configAPI.secret = secretSalvo;
        configAPI.url = urlSalva;
        mostrarTelaPrincipal();
    }
}

function configurarEventos() {
    // Botão Entrar
    document.getElementById('botao-entrar').addEventListener('click', entrar);
    
    // Navegação entre abas
    Object.keys(botoesAbas).forEach(chave => {
        botoesAbas[chave].addEventListener('click', () => mudarAba(chave));
    });

    // Botões de ação
    document.getElementById('btn-carregar').addEventListener('click', buscarOfertas);
    document.getElementById('btn-aplicar').addEventListener('click', aplicarFiltros);
    document.getElementById('btn-buscar-op').addEventListener('click', mostrarOportunidades);
    document.getElementById('btn-sair').addEventListener('click', sair);
}

function configurarSliders() {
    const sliderAfiliados = document.getElementById('filtro-afiliados');
    const sliderVendas = document.getElementById('filtro-vendas');
    const sliderComissao = document.getElementById('filtro-comissao');

    sliderAfiliados.addEventListener('input', e => {
        filtros.afiliados = parseInt(e.target.value);
        document.getElementById('valor-afiliados').textContent = `Até ${filtros.afiliados} afiliados`;
    });

    sliderVendas.addEventListener('input', e => {
        filtros.vendas = parseInt(e.target.value);
        document.getElementById('valor-vendas').textContent = `Pelo menos ${filtros.vendas} vendidos`;
    });

    sliderComissao.addEventListener('input', e => {
        filtros.comissao = parseInt(e.target.value);
        document.getElementById('valor-comissao').textContent = `Pelo menos ${filtros.comissao}% de comissão`;
    });
}

// ========== AUTENTICAÇÃO ==========
function entrar() {
    const nome = document.getElementById('nome-usuario').value;
    const appId = document.getElementById('app-id').value;
    const secret = document.getElementById('secret-key').value;
    let apiUrl = document.getElementById('api-url').value;

    if (!apiUrl || apiUrl === '') {
        apiUrl = 'https://affiliate-api.shopee.com.br/graphql';
        document.getElementById('api-url').value = apiUrl;
    }

    if (!appId || !secret) {
        alert('⚠️ Preencha App ID e Secret!');
        return;
    }

    localStorage.setItem('rs_nome', nome);
    localStorage.setItem('rs_appId', appId);
    localStorage.setItem('rs_secret', secret);
    localStorage.setItem('rs_apiUrl', apiUrl);

    configAPI.appId = appId;
    configAPI.secret = secret;
    configAPI.url = apiUrl;

    mostrarTelaPrincipal();
}

function sair() {
    localStorage.clear();
    location.reload();
}

function mostrarTelaPrincipal() {
    telaLogin.style.display = 'none';
    Object.values(telasConteudo).forEach(tela => tela.style.display = 'none');
    telasConteudo.ofertas.style.display = 'block';
    atualizarDadosConta();
}

function atualizarDadosConta() {
    document.getElementById('mostra-nome').textContent = localStorage.getItem('rs_nome') || 'Não informado';
    const appId = localStorage.getItem('rs_appId') || '';
    document.getElementById('mostra-appid').textContent = appId.substring(0, 6) + '...';
}

function mudarAba(nomeAba) {
    Object.keys(botoesAbas).forEach(chave => {
        botoesAbas[chave].classList.remove('aba-ativa');
        telasConteudo[chave].style.display = 'none';
    });
    botoesAbas[nomeAba].classList.add('aba-ativa');
    telasConteudo[nomeAba].style.display = 'block';
}

// ========== BUSCAR OFERTAS ==========
async function buscarOfertas() {
    const botao = document.getElementById('btn-carregar');
    botao.innerHTML = '⏳ Carregando...';
    botao.disabled = true;

    const area = telasConteudo.ofertas;
    
    const consulta = {
        query: `
        query {
          productOfferV2(limit: 50, offset: 0) {
            items {
              productName
              imageUrl
              price
              commissionRate
              commissionValue
              productUrl
              soldCount
              affiliateCount
            }
            total
          }
        }`
    };

    try {
        const resposta = await fetch(configAPI.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-App-ID': configAPI.appId,
                'X-App-Secret': configAPI.secret
            },
            body: JSON.stringify(consulta)
        });

        const dados = await resposta.json();
        
        if (dados.errors) throw new Error(dados.errors[0].message);

        todosProdutos = dados.data?.productOfferV2?.items || [];
        
        if (todosProdutos.length === 0) {
            area.innerHTML = `
                <h3>📦 Ofertas</h3>
                <p>Nenhuma oferta encontrada.</p>
                <button class="botao-secundario" id="btn-carregar">🔄 Tentar Novamente</button>
            `;
            return;
        }

        mostrarListaSimples(todosProdutos, area);

    } catch (erro) {
        area.innerHTML = `
            <h3>⚠️ Erro de Conexão</h3>
            <p>${erro.message}</p>
            <p style="font-size:13px; color:#666;">Verifique suas credenciais da API da Shopee.</p>
            <button class="botao-secundario" id="btn-carregar">🔄 Tentar Novamente</button>
        `;
    }

    botao.innerHTML = '🔄 Carregar Ofertas';
    botao.disabled = false;
    document.getElementById('btn-carregar').addEventListener('click', buscarOfertas);
}

function mostrarListaSimples(produtos, elemento) {
    let html = `<h3>📦 ${produtos.length} Ofertas Carregadas</h3>`;
    
    produtos.forEach(p => {
        const afiliados = p.affiliateCount || 999;
        const vendidos = p.soldCount || 0;
        const comissaoPct = p.commissionRate ? (p.commissionRate * 100).toFixed(1) : 'N/D';
        
        html += `
        <div class="produto-card">
            <h4 style="margin:0 0 6px 0; font-size:14px;">${p.productName.substring(0, 45)}...</h4>
            <p style="color:#ff6600; font-weight:bold; margin:4px 0;">💰 R$ ${p.price.toFixed(2)}</p>
            <p style="font-size:12px; color:#666;">Vendidos: ${vendidos} | Afiliados: ${afiliados} | Comissão: ${comissaoPct}%</p>
        </div>`;
    });

    html += `<p style="margin-top:15px; font-size:13px; color:#22a858;">✅ Vá em 🔍 Filtros e defina seus critérios!</p>`;
    elemento.innerHTML = html;
}

// ========== FILTROS E OPORTUNIDADES ==========
function aplicarFiltros() {
    if (todosProdutos.length === 0) {
        alert('⚠️ Primeiro carregue as ofertas na aba 📦 Ofertas!');
        mudarAba('ofertas');
        return;
    }
    
    produtosFiltrados = todosProdutos.filter(p => {
        const afiliados = p.affiliateCount || 999;
        const vendidos = p.soldCount || 0;
        const comissaoPct = p.commissionRate ? (p.commissionRate * 100) : 0;
        
        return afiliados <= filtros.afiliados && 
               vendidos >= filtros.vendas && 
               comissaoPct >= filtros.comissao;
    });

    alert(`✅ Filtros aplicados! ${produtosFiltrados.length} oportunidades encontradas.`);
    mudarAba('filtrados');
    mostrarOportunidades();
}

function mostrarOportunidades() {
    const area = document.getElementById('lista-filtrados');
    const resumo = document.getElementById('resumo-filtro');

    if (produtosFiltrados.length === 0) {
        resumo.innerHTML = `<strong>❌ Nenhum produto encontrou os critérios.</strong><br>Experimente aumentar o número de afiliados permitidos ou reduzir o mínimo de vendas.`;
        area.innerHTML = '';
        return;
    }

    resumo.innerHTML = `<strong>✅ ${produtosFiltrados.length} oportunidades encontradas!</strong><br>Mostrando produtos com até ${filtros.afiliados} afiliados, min. ${filtros.vendas} vendas e min. ${filtros.comissao}% de comissão`;

    let html = '';
    produtosFiltrados.forEach((p, idx) => {
        const afiliados = p.affiliateCount || 0;
        const vendidos = p.soldCount || 0;
        const comissaoPct = p.commissionRate ? (p.commissionRate * 100).toFixed(1) : 'N/D';
        const score = Math.round((vendidos / Math.max(afiliados, 1)) * 10) / 10;

        html += `
        <div class="produto-card">
            <span class="tag-oportunidade">🔥 Índice: ${score}</span>
            <h4 style="margin:6px 0;">${p.productName}</h4>
            <p style="color:#ff6600; font-weight:bold; font-size:16px; margin:4px 0;">💰 R$ ${p.price.toFixed(2)}</p>
            <p style="font-size:13px;">💸 Comissão: ${comissaoPct}%</p>
            <p style="font-size:12px; color:#666;">📊 Vendidos: ${vendidos} | 👤 Afiliados: ${afiliados}</p>
            <p style="font-size:12px; color:#22a858; font-weight:bold;">📈 ${score} vendas por afiliado</p>
            <a href="${p.productUrl}" target="_blank" style="font-size:13px; color:#ff6600;">🔗 Ver na Shopee</a>
            <br>
            <button class="btn-gerar-video" onclick="gerarConteudo(${idx})">🎬 Gerar Legenda para Vídeo</button>
        </div>`;
    });

    area.innerHTML = html;
}

// ========== GERADOR DE CONTEÚDO ==========
window.gerarConteudo = function(indice) {
    const p = produtosFiltrados[indice];
    const comissaoPct = p.commissionRate ? (p.commissionRate * 100).toFixed(1) : '';
    
    const legend
// ========== GERADOR DE CONTEÚDO ==========
window.gerarConteudo = function(indice) {
    const p = produtosFiltrados[indice];
    const comissaoPct = p.commissionRate ? (p.commissionRate * 100).toFixed(1) : '';
    
    const legendas = [
        `🔥 Esse produto está bom demais! Já vendeu ${p.soldCount || 'centenas'} de unidades e pouca gente sabe ainda! Clica no link pra garantir o seu! ✨`,
        
        `💡 Produto vencedor encontrado! ✅ Preço ótimo, comissão de ${comissaoPct}%, e quase ninguém está divulgando ainda! Corre antes que fique caro! 🚀`,
        
        `⚡ ALERTA DE OPORTUNIDADE! ⚡ Esse produto está vendendo MUITO mas tem poucos afiliados concorrendo! Aproveita agora mesmo pelo link 👉 ${p.productUrl || ''} ✨`,
        
        `🎯 Quando você encontra um produto que VENDE BEM e tem POUCA concorrência… é isso! 🔥 Já são ${p.soldCount || 'muitas'} vendas e crescendo! Corre pra pegar o seu! ✨`,
        
        `💰 Melhor escolha de hoje! ✅ Preço: R$ ${p.price.toFixed(2)} | Comissão: ${comissaoPct}% | Vendas: ${p.soldCount || 'Alto'} — Link na descrição! 👉✨`
    ];

    const aleatoria = legendas[Math.floor(Math.random() * legendas.length)];
    
    telasConteudo.videos.style.display = 'block';
    Object.keys(botoesAbas).forEach(chave => botoesAbas[chave].classList.remove('aba-ativa'));
    botoesAbas.videos.classList.add('aba-ativa');
    
    document.getElementById('lista-para-video').innerHTML = `
        <div class="produto-card">
            <h4>🎬 Legenda Pronta para Copiar:</h4>
            <textarea style="width:100%; height:140px; padding:10px; border-radius:8px; border:1px solid #ddd; margin:10px 0; font-size:14px;" id="texto-legenda">${aleatoria}</textarea>
            <button onclick="copiarTexto()" style="background:#ff6600; color:white; padding:10px; border:none; border-radius:6px; font-weight:bold; width:100%;">📋 COPIAR LEGENDA</button>
            <p style="font-size:12px; color:#666; margin-top:8px;">💡 Dica: Cole direto no Reels, TikTok, Instagram ou WhatsApp!</p>
            <button onclick="mudarAba('filtrados')" style="background:#e8e8e8; color:#333; margin-top:10px;">⬅️ Voltar às Oportunidades</button>
        </div>
    `;
};

window.copiarTexto = function() {
    const texto = document.getElementById('texto-legenda');
    texto.select();
    navigator.clipboard.writeText(texto.value).then(() => {
        alert('✅ Copiado com sucesso! Agora é só colar onde quiser! 🎉');
    }).catch(() => {
        alert('⚠️ Selecione e copie manualmente se preferir!');
    });
};

console.log('✅ SISTEMA COMPLETO CARREGADO! 🚀');
console.log('📦 Busca de ofertas | 🔍 Filtros inteligentes | 🎬 Gerador de vídeos');
