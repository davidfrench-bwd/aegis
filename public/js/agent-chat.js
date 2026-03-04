// Agent Chat System
class AgentChatSystem {
    constructor(supabase) {
        this.supabase = supabase;
        this.currentRoom = null;
        this.initEventListeners();
    }

    async loadRooms() {
        const { data: rooms, error } = await this.supabase
            .from('agent_chat_rooms')
            .select('*');
        
        if (error) {
            console.error('Error loading rooms:', error);
            return;
        }

        const roomList = document.getElementById('agent-chat-room-list');
        roomList.innerHTML = '';
        rooms.forEach(room => {
            const roomEl = document.createElement('div');
            roomEl.textContent = room.name;
            roomEl.classList.add('agent-chat-room');
            roomEl.dataset.roomName = room.name;
            roomEl.addEventListener('click', () => this.selectRoom(room.name));
            roomList.appendChild(roomEl);
        });
    }

    async selectRoom(roomName) {
        this.currentRoom = roomName;
        const messageContainer = document.getElementById('agent-chat-messages');
        messageContainer.innerHTML = '';

        // Load previous messages
        const { data: messages, error } = await this.supabase
            .from('agent_chat_messages')
            .select('*')
            .eq('room_id', 
                (await this.supabase.from('agent_chat_rooms').select('id').eq('name', roomName).single()).data.id
            )
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error loading messages:', error);
            return;
        }

        messages.forEach(msg => this.displayMessage(msg));

        // Setup real-time subscription
        this.supabase
            .channel(`agent-room:${roomName}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'agent_chat_messages',
                filter: `room_id=eq.${
                    (await this.supabase.from('agent_chat_rooms').select('id').eq('name', roomName).single()).data.id
                }`
            }, (payload) => {
                this.displayMessage(payload.new);
            })
            .subscribe();
    }

    displayMessage(message) {
        const messageContainer = document.getElementById('agent-chat-messages');
        const msgEl = document.createElement('div');
        msgEl.classList.add('agent-chat-message');
        
        // Enhanced message rendering for structured agent messages
        let messageContent = message.message;
        if (typeof messageContent === 'object') {
            messageContent = JSON.stringify(messageContent, null, 2);
        }

        msgEl.innerHTML = `
            <div class="agent-message-header">
                <strong>${message.sender_agent}</strong>
                <span class="message-type">${message.message_type}</span>
                <span class="timestamp">${new Date(message.created_at).toLocaleString()}</span>
            </div>
            <pre class="message-content">${messageContent}</pre>
        `;
        messageContainer.appendChild(msgEl);
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }

    async sendMessage(message, messageType = 'text') {
        if (!this.currentRoom) {
            alert('Please select a room first');
            return;
        }

        // Structured message format
        const messagePayload = {
            room_name: this.currentRoom,
            sender_agent: 'Aegis', // Default sender, could be dynamically set
            message: JSON.stringify({ text: message }),
            message_type: messageType,
            metadata: {
                timestamp: new Date().toISOString()
            }
        };

        try {
            // Call server-side function to insert message
            const { data, error } = await this.supabase.rpc('insert_agent_message', {
                p_room_name: messagePayload.room_name,
                p_sender_agent: messagePayload.sender_agent,
                p_message: messagePayload.message,
                p_message_type: messagePayload.message_type,
                p_metadata: messagePayload.metadata
            });

            if (error) {
                throw error;
            }
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message');
        }
    }

    initEventListeners() {
        const messageInput = document.getElementById('agent-chat-message-input');
        const sendButton = document.getElementById('agent-chat-send-button');
        const messageTypeSelect = document.getElementById('agent-message-type');

        sendButton.addEventListener('click', () => {
            const message = messageInput.value.trim();
            const messageType = messageTypeSelect.value;
            if (message) {
                this.sendMessage(message, messageType);
                messageInput.value = '';
            }
        });

        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const message = messageInput.value.trim();
                const messageType = messageTypeSelect.value;
                if (message) {
                    this.sendMessage(message, messageType);
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

    const agentChatSystem = new AgentChatSystem(supabaseClient);
    await agentChatSystem.loadRooms();
});