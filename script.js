document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('start-btn');
    const accountsInput = document.getElementById('accounts-input');
    const statusText = document.getElementById('status-text');
    const resultsOutput = document.getElementById('results-output');

    startBtn.addEventListener('click', async () => {
        const accounts = accountsInput.value.trim();
        if (!accounts) {
            alert('Por favor, insira pelo menos uma conta.');
            return;
        }

        // Atualiza a UI para o estado de "carregando"
        startBtn.disabled = true;
        statusText.textContent = 'Verificando... Isso pode levar vários minutos. Por favor, aguarde.';
        resultsOutput.textContent = '';
        resultsOutput.classList.remove('has-results');

        try {
            // Envia a lista de contas para o nosso servidor Python
            const response = await fetch('http://127.0.0.1:5000/verificar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ accounts: accounts }),
            });

            if (!response.ok) {
                throw new Error(`Erro no servidor: ${response.statusText}`);
            }

            const result = await response.json();

            // Exibe os resultados
            if (result.found_accounts && result.found_accounts.length > 0) {
                let output = 'CONTAS COM EVIDÊNCIA FORTE ENCONTRADAS:\n\n';
                result.found_accounts.forEach(acc => {
                    output += `----------------------------------------\n`;
                    output += `LOGIN: ${acc.login}\n`;
                    output += `EVIDÊNCIA (Pontuação: ${acc.evidence.score}):\n`;
                    output += `  De: ${acc.evidence.from}\n`;
                    output += `  Assunto: ${acc.evidence.subject}\n\n`;
                });
                resultsOutput.textContent = output;
                resultsOutput.classList.add('has-results');
            } else {
                resultsOutput.textContent = 'Nenhuma conta com recibos de Minecraft foi encontrada.';
            }
            statusText.textContent = 'Verificação concluída!';

        } catch (error) {
            console.error('Erro:', error);
            statusText.textContent = 'Erro! Não foi possível conectar ao servidor local.';
            resultsOutput.textContent = 'Verifique se o arquivo "servidor.py" está em execução e tente novamente.';
        } finally {
            // Restaura o estado da UI
            startBtn.disabled = false;
        }
    });
});
