// ============================================================
// Configuração do Supabase
// Substitua os valores abaixo com os do seu projeto:
// https://app.supabase.com → Seu projeto → Settings → API
// ============================================================

const SUPABASE_URL = "https://tavjfvoikscsnzxesano.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhdmpmdm9pa3Njc256eGVzYW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4OTA2MTYsImV4cCI6MjA5NDQ2NjYxNn0.tap3cos39IDk5O2MmIA-L_Jj8niBBQI1_pXq_-OTrl4";

window.db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
