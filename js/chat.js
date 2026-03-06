// Chat.js - Realtime Chat Implementation
class AegisChatSystem {
    constructor(supabase) {
        this.supabase = supabase;
        this.currentRoom = null;
        this.initEventListeners();
    }

    async loadRooms() {
        const { data: rooms, error } = await this.supabase
            .from('chat_rooms')
            .select('*');
        
        if (error) {
            console.error('Error loading rooms:', error);
            return;
        }

        const roomList = document.getElementById('chat-room-list');
        roomList.innerHTML = '';
        rooms.forEach(room => {
            const roomEl = document.createElement('div');
            roomEl.textContent = room.name;
            roomEl.classList.add('chat-room');
            roomEl.dataset.roomId = room.id;
            roomEl.addEventListener('click', () => this.selectRoom(room.id));
            roomList.appendChild(roomEl);
        });
    }

    async selectRoom(roomId) {
        this.currentRoom = roomId;
        const messageContainer = document.getElementById('chat-messages');
        messageContainer.innerHTML = '';

        // Load previous messages
        const { data: messages, error } = await this.supabase
            .from('chat_messages')
            .select('*, sender:profiles(email)')
            .eq('room_id', roomId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error loading messages:', error);
            return;
        }

        messages.forEach(msg => this.displayMessage(msg));

        // Setup real-time subscription
        this.supabase
            .channel(`room:${roomId}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'chat_messages',
                filter: `room_id=eq.${roomId}`
            }, (payload) => {
                this.displayMessage(payload.new);
            })
            .subscribe();
    }

    displayMessage(message) {
        const messageContainer = document.getElementById('chat-messages');
        const msgEl = document.createElement('div');
        msgEl.classList.add('chat-message');
        msgEl.innerHTML = `
            <strong>${message.sender?.email || 'Anonymous'}</strong>
            <span>${new Date(message.created_at).toLocaleString()}</span>
            <p>${message.message}</p>
        `;
        messageContainer.appendChild(msgEl);
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }

    async sendMessage(message) {
        if (!this.currentRoom) {
            alert('Please select a room first');
            return;
        }

        const { error } = await this.supabase
            .from('chat_messages')
            .insert({
                room_id: this.currentRoom,
                message: message
            });

        if (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message');
        }
    }

    initEventListeners() {
        const messageInput = document.getElementById('chat-message-input');
        const sendButton = document.getElementById('chat-send-button');

        sendButton.addEventListener('click', () => {
            const message = messageInput.value.trim();
            if (message) {
                this.sendMessage(message);
                messageInput.value = '';
            }
        });

        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const message = messageInput.value.trim();
                if (message) {
                    this.sendMessage(message);
                    messageInput.value = '';
                }
            }
        });
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    const { createClient } = supabase;
    const supabaseClient = createClient(
        'https://YOUR_PROJECT.supabase.co', 
        'YOUR_PUBLIC_KEY'
    );

    const chatSystem = new AegisChatSystem(supabaseClient);
    await chatSystem.loadRooms();
});