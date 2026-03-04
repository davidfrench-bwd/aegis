// Supabase Client Configuration
const SUPABASE_URL = 'https://fbmsmqukiogxeclmgvim.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZibXNtcXVraW9neGVjbG1ndmltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NjQyODAsImV4cCI6MjA4ODE0MDI4MH0.TUmewpYEt_oYsamQpGijPYVSyk_i3gg5uS8LBUwB-0s';

// Initialize Supabase client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth helper functions
async function signIn(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });
    
    if (error) throw error;
    return data;
}

async function signOut() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
}

async function getCurrentUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    return user;
}

async function getUserProfile(userId) {
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    
    if (error) throw error;
    return data;
}

// Check if user is authenticated and has required role
async function requireAuth(requiredRole = null) {
    const user = await getCurrentUser();
    
    if (!user) {
        window.location.href = '/login.html';
        return null;
    }
    
    if (requiredRole) {
        const profile = await getUserProfile(user.id);
        
        if (profile.role !== requiredRole && profile.role !== 'admin') {
            alert('You do not have permission to access this page.');
            window.location.href = '/';
            return null;
        }
        
        return { user, profile };
    }
    
    const profile = await getUserProfile(user.id);
    return { user, profile };
}

// Check if user can access a specific clinic dashboard
async function canAccessClinic(clinicId) {
    const user = await getCurrentUser();
    if (!user) return false;
    
    const profile = await getUserProfile(user.id);
    
    // Admins can access everything
    if (profile.role === 'admin') return true;
    
    // Check if user has access to this specific clinic
    return profile.clinic_access && profile.clinic_access.includes(clinicId);
}
