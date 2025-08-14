const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

// 🔹 Your Supabase credentials
const SUPABASE_URL = 'https://ripjkxojfsxhfglyilue.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpcGpreG9qZnN4aGZnbHlpbHVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxODIzNTcsImV4cCI6MjA3MDc1ODM1N30.7yYf8QogR72JkZ0pEjpMbpaVv5bjzz5GylLDYN-m0v0'; // use service role for insert (more secure: set via ENV variable)
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

io.on('connection', (socket) => {
    console.log('A user connected');

    // Join a Room and send previous messages
    socket.on('joinRoom', async (roomId) => {
        socket.join(roomId);
        console.log(`User joined room: ${roomId}`);

        const { data: messages, error } = await supabase
            .from('messages')
            .select('*')
            .eq('room_id', roomId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('❌ Error fetching messages:', error);
            socket.emit('previousMessages', []);
        } else {
            socket.emit('previousMessages', messages || []);
        }
    });

    // Receive & save a new message
    socket.on('message', async ({ roomId, message }) => {
        const { data, error } = await supabase
            .from('messages')
            .insert([{ room_id: roomId, text: message }])
            .select()
            .single();

        if (error) {
            console.error('❌ Error saving message:', error);
            return;
        }

        io.to(roomId).emit('message', data);
    });

    // Handle leaving room
    socket.on('leaveRoom', (roomId) => {
        socket.leave(roomId);
        console.log(`User left room: ${roomId}`);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

http.listen(3000, () => console.log('🚀 Server running on http://localhost:3000'));
