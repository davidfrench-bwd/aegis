import { createClient } from '@supabase/supabase-js';
import process from 'process';

const supabaseUrl = 'https://ldkajdjdryzulrwdiygs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxka2FqZGpkcnl6dWxyd2RpeWdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MzI4ODAsImV4cCI6MjA4ODIwODg4MH0.yuD9TDRflxQ2r8lJwRcwAsImskj-A1KaxNu9nf9TiHA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setupAgentChatSchema() {
    try {
        // Create agent_registry table
        const { error: agentRegistryTableError } = await supabase.rpc('execute_sql', {
            sql: `
                CREATE TABLE IF NOT EXISTS agent_registry (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    name TEXT NOT NULL UNIQUE,
                    description TEXT,
                    status TEXT CHECK (status IN ('active', 'inactive', 'maintenance')),
                    last_run TIMESTAMP WITH TIME ZONE,
                    next_run TIMESTAMP WITH TIME ZONE,
                    metadata JSONB,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `
        });

        // Create agent_chat_rooms table
        const { error: chatRoomsTableError } = await supabase.rpc('execute_sql', {
            sql: `
                CREATE TABLE IF NOT EXISTS agent_chat_rooms (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    name TEXT NOT NULL UNIQUE,
                    description TEXT,
                    primary_agents TEXT[] NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            `
        });

        // Create agent_chat_messages table
        const { error: chatMessagesTableError } = await supabase.rpc('execute_sql', {
            sql: `
                CREATE TABLE IF NOT EXISTS agent_chat_messages (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    room_id UUID REFERENCES agent_chat_rooms(id),
                    sender_agent TEXT NOT NULL,
                    message JSONB NOT NULL,
                    message_type TEXT CHECK (
                        message_type IN (
                            'text', 
                            'system_alert', 
                            'task_update', 
                            'error_report', 
                            'diagnostic', 
                            'coordination'
                        )
                    ),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    metadata JSONB
                );
            `
        });

        // Insert predefined rooms
        const { error: roomInsertError } = await supabase.rpc('execute_sql', {
            sql: `
                INSERT INTO agent_chat_rooms (name, description, primary_agents)
                VALUES 
                    ('NPE Operations', 'Neuropathy Profit Engine Agent Coordination', 
                     ARRAY['Aegis', 'LeadBot', 'AppointmentManager']),
                    ('MechaSurvive Dev', 'Creative Project Agent Coordination', 
                     ARRAY['Aegis', 'CreativeDirector', 'ProjectManager']),
                    ('System Diagnostics', 'System-Wide Monitoring and Alerts', 
                     ARRAY['Aegis', 'SystemMonitor', 'ErrorHandler']),
                    ('Global Coordination', 'Cross-Project Agent Communication', 
                     ARRAY['Aegis', 'LeadBot', 'SystemMonitor', 'CreativeDirector'])
                ON CONFLICT (name) DO NOTHING;
            `
        });

        // Insert initial agents
        const { error: agentInsertError } = await supabase.rpc('execute_sql', {
            sql: `
                INSERT INTO agent_registry (name, description, status, metadata)
                VALUES 
                    ('Aegis', 'Strategic Life Operator', 'active', 
                     '{"primary_projects": ["NPE", "MechaSurvive"], "core_responsibilities": ["Strategic Planning", "System Coordination"]}'::JSONB),
                    ('LeadBot', 'Lead Management AI', 'active', 
                     '{"primary_projects": ["NPE"], "core_responsibilities": ["Lead Qualification", "Conversion Optimization"]}'::JSONB)
                ON CONFLICT (name) DO NOTHING;
            `
        });

        // Log any errors
        if (agentRegistryTableError) console.error('Agent Registry Table Error:', agentRegistryTableError);
        if (chatRoomsTableError) console.error('Chat Rooms Table Error:', chatRoomsTableError);
        if (chatMessagesTableError) console.error('Chat Messages Table Error:', chatMessagesTableError);
        if (roomInsertError) console.error('Room Insert Error:', roomInsertError);
        if (agentInsertError) console.error('Agent Insert Error:', agentInsertError);

        console.log('Agent Chat Schema Setup Complete!');
    } catch (error) {
        console.error('Setup Error:', error);
    }
}

setupAgentChatSchema();