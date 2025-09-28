document.addEventListener('DOMContentLoaded', () => {
    // ##################################################################
    // ##   COLE A URL DO SEU SERVIDOR REPLIT AQUI DENTRO DAS ASPAS    ##
    // ##################################################################
    const BACKEND_URL = 'https://e4583359-468d-4394-a9af-040ce71a3c01-00-3lokik9mr70nh.picard.replit.dev';

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

        startBtn.disabled = true;
        statusText.textContent = 'Verificando... Isso pode levar vários minutos. Por favor, aguarde.';
        resultsOutput.textContent = '';
        resultsOutput.classList.remove('has-results');

        try {
            const response = await fetch(BACKEND_URL, {
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
            statusText.textContent = 'Erro! Não foi possível conectar ao servidor.';
            resultsOutput.textContent = 'Verifique se a URL no topo do script.js está correta e se o seu servidor no Replit está em execução ("Running").';
        } finally {
            startBtn.disabled = false;
        }
    });
});
