// ============================================
// Fonction Supabase Edge : gerer-utilisateurs
// Seule cette fonction a le droit de créer/supprimer de vrais comptes.
// Elle vérifie elle-même que l'appelant est bien Super Administrateur.
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("CLE_SERVICE");

const enTetesCors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: enTetesCors });
    }

    try {
        const enTeteAutorisation = req.headers.get("Authorization");
        if (!enTeteAutorisation) {
            return new Response(JSON.stringify({ error: "Non authentifié" }), { status: 401, headers: enTetesCors });
        }

        // Client "appelant" : sert juste à identifier qui fait la demande
        const clientAppelant = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
            global: { headers: { Authorization: enTeteAutorisation } },
        });
        const { data: { user } } = await clientAppelant.auth.getUser();

        if (!user) {
            return new Response(JSON.stringify({ error: "Non authentifié" }), { status: 401, headers: enTetesCors });
        }

        // Client "admin" : a tous les droits, utilisé pour vérifier le rôle puis agir
        const clientAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

        const { data: profilAppelant } = await clientAdmin
            .from("profils")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

        if (!profilAppelant || profilAppelant.role !== "Super Administrateur") {
            return new Response(JSON.stringify({ error: "Réservé au Super Administrateur" }), { status: 403, headers: enTetesCors });
        }

        const corps = await req.json();

        if (corps.action === "creer") {
            const { data: nouveauCompte, error: erreurCreation } = await clientAdmin.auth.admin.createUser({
                email: corps.email,
                password: corps.motDePasse,
                email_confirm: true,
            });

            if (erreurCreation) {
                return new Response(JSON.stringify({ error: erreurCreation.message }), { status: 400, headers: enTetesCors });
            }

            const { error: erreurProfil } = await clientAdmin.rpc("creer_profil", {
                p_id: nouveauCompte.user.id,
                p_nom: corps.nom,
                p_prenom: corps.prenom,
                p_login: corps.login,
                p_role: corps.role,
                p_statut: corps.statutCompte,
            });

            if (erreurProfil) {
                return new Response(JSON.stringify({ error: erreurProfil.message }), { status: 400, headers: enTetesCors });
            }

            return new Response(JSON.stringify({ succes: true }), { headers: enTetesCors });
        }

        if (corps.action === "supprimer") {
            const { error: erreurSuppression } = await clientAdmin.auth.admin.deleteUser(corps.id);
            if (erreurSuppression) {
                return new Response(JSON.stringify({ error: erreurSuppression.message }), { status: 400, headers: enTetesCors });
            }
            return new Response(JSON.stringify({ succes: true }), { headers: enTetesCors });
        }

        return new Response(JSON.stringify({ error: "Action inconnue" }), { status: 400, headers: enTetesCors });

    } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: enTetesCors });
    }
});
