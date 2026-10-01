// ================================
// DIVA CHATBOT - Y2K Frontend JS
// ================================

const messagesContainer = document.getElementById('messages-container');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

// Chat history for Gemini multi-turn context
let chatHistory = [];

// Format current time as HH:MM
function getTime() {
    const now = new Date();
    return now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

// Scroll to bottom smoothly
function scrollToBottom() {
    requestAnimationFrame(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

// Create a message bubble
function createMessageRow(role, text) {
    const row = document.createElement('div');
    row.className = `message-row ${role === 'diva' ? 'diva-row' : 'user-row'}`;

    if (role === 'diva') {
        // Avatar icon
        const avatarMini = document.createElement('div');
        avatarMini.className = 'message-avatar-mini';
        avatarMini.textContent = '👑';
        row.appendChild(avatarMini);
    }

    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${role === 'diva' ? 'diva-bubble' : 'user-bubble'}`;

    // Parse line breaks into paragraphs
    const paragraphs = text.split('\n').filter(line => line.trim());
    if (paragraphs.length > 0) {
        paragraphs.forEach(para => {
            const p = document.createElement('p');
            p.textContent = para;
            bubble.appendChild(p);
        });
    } else {
        const p = document.createElement('p');
        p.textContent = text;
        bubble.appendChild(p);
    }

    const timeSpan = document.createElement('span');
    timeSpan.className = 'msg-time';
    timeSpan.textContent = getTime();
    bubble.appendChild(timeSpan);

    row.appendChild(bubble);
    return row;
}

// Show typing indicator
function showTyping() {
    const row = document.createElement('div');
    row.className = 'message-row diva-row';
    row.id = 'typing-indicator-row';

    const avatarMini = document.createElement('div');
    avatarMini.className = 'message-avatar-mini';
    avatarMini.textContent = '👑';
    row.appendChild(avatarMini);

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble diva-bubble typing-indicator';

    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'typing-dot';
        bubble.appendChild(dot);
    }

    row.appendChild(bubble);
    messagesContainer.appendChild(row);
    scrollToBottom();
}

// Remove typing indicator
function hideTyping() {
    const existing = document.getElementById('typing-indicator-row');
    if (existing) existing.remove();
}

// Main send function
async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    chatInput.value = '';
    sendBtn.disabled = true;
    chatInput.disabled = true;

    // Show user message
    const userRow = createMessageRow('user', text);
    messagesContainer.appendChild(userRow);
    scrollToBottom();

    // Show typing
    showTyping();

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text,
                history: chatHistory
            })
        });

        // Always hide typing first
        hideTyping();

        if (!response.ok) {
            const err = await response.json();
            if (response.status === 429) {
                const errRow = createMessageRow('diva',
                    '⏳ Bebeğim, API limiti doldu! Free tier dakikada 5 mesaja izin veriyor. Bir dakika bekleyip tekrar yazar mısın? 💖'
                );
                messagesContainer.appendChild(errRow);
            } else {
                const errRow = createMessageRow('diva',
                    `😱 Bir sorun çıktı şekerim: ${err.detail || 'Bilinmeyen hata'}. Tekrar dener misin? 💋`
                );
                messagesContainer.appendChild(errRow);
            }
            scrollToBottom();
            return;
        }

        const data = await response.json();
        const reply = data.reply;

        // Update history
        chatHistory.push({ role: 'user', content: text });
        chatHistory.push({ role: 'model', content: reply });

        // Show Diva reply
        const divaRow = createMessageRow('diva', reply);
        messagesContainer.appendChild(divaRow);
        scrollToBottom();

    } catch (error) {
        hideTyping();
        const errRow = createMessageRow('diva',
            `😱 Bağlantı sorunu bebeğim: ${error.message}. Sayfayı yenileyip tekrar dener misin? 💖`
        );
        messagesContainer.appendChild(errRow);
        scrollToBottom();
    } finally {
        sendBtn.disabled = false;
        chatInput.disabled = false;
        chatInput.focus();
    }
}

// Send on Enter key
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Quick topic message from sidebar chip
function sendQuickMessage(text) {
    chatInput.value = text;
    sendMessage();
}

// Clear chat
function clearChat() {
    chatHistory = [];
    // Remove all dynamic messages (keep the initial greeting)
    const allRows = messagesContainer.querySelectorAll('.message-row');
    allRows.forEach((row, idx) => {
        if (idx > 0) row.remove(); // keep first greeting row
    });
}

// Auto-focus input on load
window.addEventListener('load', () => {
    chatInput.focus();
});
