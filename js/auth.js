// ============================================
// Authentification simple basée sur la table "utilisateurs"
// ============================================

// Vérifie que l'utilisateur est connecté, sinon renvoie vers la connexion.
// À appeler en haut de dashboard.html
function protegerPage() {
    const utilisateur = sessionStorage.getItem("utilisateur");
    if (!utilisateur) {
        window.location.href = "../connexion.html";
    }
}

// Déconnexion
function deconnexion() {
    sessionStorage.removeItem("utilisateur");
    window.location.href = "../connexion.html";
}

// Gère la soumission du formulaire de connexion (appelé depuis index.html)
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

    const { data, error } = await client
        .from("utilisateurs")
        .select("*")
        .eq("login", login)
        .eq("motDePasse", motDePasse)
        .eq("statutCompte", "Actif")
        .maybeSingle();

    if (error) {
        messageErreur.textContent = "Erreur de connexion. Réessayez.";
        console.error(error);
        return;
    }

    if (!data) {
        messageErreur.textContent = "Identifiants incorrects ou compte inactif.";
        return;
    }

    // On enregistre l'utilisateur connecté (sans le mot de passe) en session
    const { motDePasse: _mdp, ...utilisateurSansMdp } = data;
    sessionStorage.setItem("utilisateur", JSON.stringify(utilisateurSansMdp));

    window.location.href = "pages/dashboard.html";
}

// Affiche le nom et le rôle de l'utilisateur connecté dans l'en-tête du dashboard
function afficherUtilisateurConnecte() {
    const utilisateur = JSON.parse(sessionStorage.getItem("utilisateur"));
    if (!utilisateur) return;

    document.getElementById("nomUtilisateurConnecte").textContent =
        `${utilisateur.prenom} ${utilisateur.nom}`;
    document.getElementById("roleUtilisateurConnecte").textContent = utilisateur.role;

    // Le menu "Utilisateurs" est réservé au Super Administrateur
    if (utilisateur.role !== "Super Administrateur") {
        const lienUtilisateurs = document.querySelector('[data-section="utilisateurs"]');
        if (lienUtilisateurs) lienUtilisateurs.style.display = "none";
    }
}
