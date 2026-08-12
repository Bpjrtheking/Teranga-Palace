// ============================================
// Connexion au client Supabase
// Ce fichier doit être chargé AVANT tous les autres scripts
// ============================================

const SUPABASE_URL = "https://nhhjvmitlbpsyhbzsxie.supabase.co";
const SUPABASE_KEY = "sb_publishable_6mIVMNQPeqa4ZfDYAK181Q_E-GTyaZg";

const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
