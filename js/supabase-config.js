// Supabase configuration for dashboard
const SUPABASE_URL = 'https://fbmsmqukiogxeclmgvim.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZibXNtcXVraW9neGVjbG1ndmltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NjQyODAsImV4cCI6MjA4ODE0MDI4MH0.TUmewpYEt_oYsamQpGijPYVSyk_i3gg5uS8LBUwB-0s';

// Initialize Supabase client (using CDN version)
// Wait for window.supabase to be available
let supabase;
if (typeof window.supabase !== 'undefined') {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
    console.error('Supabase library not loaded. Make sure the CDN script is included before this file.');
}
