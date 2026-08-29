// ============================================
// Authentification réelle via Supabase Auth
// ============================================

const DOMAINE_INTERNE = "teranga-palace.com"; // sert à transformer un "login" en email pour Supabase Auth

// Vérifie qu'une vraie session Supabase existe. Redirige sinon.
// Renvoie le profil connecté (ou null si redirection déclenchée).
async function verifierSession() {
    const { data: { session } } = await client.auth.getSession();

    if (!session) {
        window.location.href = "../connexion.html";
        return null;
    }

    const { data: profil, error } = await client
        .from("profils")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

    if (error || !profil || profil.statutCompte !== "Actif") {
        await client.auth.signOut();
        window.location.href = "../connexion.html";
        return null;
    }

    sessionStorage.setItem("utilisateur", JSON.stringify(profil));
    return profil;
}

// Déconnexion réelle (ferme la session Supabase)
async function deconnexion() {
    await client.auth.signOut();
    sessionStorage.removeItem("utilisateur");
    window.location.href = "../connexion.html";
}

// Gère la soumission du formulaire de connexion (appelé depuis connexion.html)
async function gererConnexion(evenement) {
    evenement.preventDefault();

    const login = document.getElementById("login").value.trim();
    const motDePasse = document.getElementById("motDePasse").value.trim();
    const messageErreur = document.getElementById("messageErreur");
    messageErreur.textContent = "";

    if (!login || !motDePasse) {
        messageErreur.textContent = "Veuillez remplir tous les champs.";
        return;
    }

    const email = `${login}@${DOMAINE_INTERNE}`;

    const { data, error } = await client.auth.signInWithPassword({ email, password: motDePasse });

    if (error) {
        messageErreur.textContent = "Identifiants incorrects.";
        return;
    }

    const { data: profil, error: erreurProfil } = await client
        .from("profils")
        .select("*")
        .eq("id", data.user.id)
        .maybeSingle();

    if (erreurProfil || !profil || profil.statutCompte !== "Actif") {
        messageErreur.textContent = "Compte introuvable ou inactif.";
        await client.auth.signOut();
        return;
    }

    sessionStorage.setItem("utilisateur", JSON.stringify(profil));
    window.location.href = "pages/dashboard.html";
}

// Affiche le nom, le rôle et les initiales de l'utilisateur connecté dans l'en-tête du dashboard
function afficherUtilisateurConnecte() {
    const utilisateur = JSON.parse(sessionStorage.getItem("utilisateur"));
    if (!utilisateur) return;

    document.getElementById("nomUtilisateurConnecte").textContent =
        `${utilisateur.prenom} ${utilisateur.nom}`;
    document.getElementById("roleUtilisateurConnecte").textContent = utilisateur.role;

    const avatar = document.getElementById("avatarInitiales");
    if (avatar) {
        const initiales = `${utilisateur.prenom?.[0] ?? ""}${utilisateur.nom?.[0] ?? ""}`.toUpperCase();
        avatar.textContent = initiales || "?";
    }

    if (utilisateur.role !== "Super Administrateur") {
        const lienUtilisateurs = document.querySelector('[data-section="utilisateurs"]');
        if (lienUtilisateurs) lienUtilisateurs.style.display = "none";
    }
}