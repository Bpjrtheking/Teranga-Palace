// ============================================
// Gestion des utilisateurs — entièrement pilotée depuis l'app,
// via la fonction Supabase Edge "gerer-utilisateurs" qui seule a
// les droits nécessaires pour créer/supprimer de vrais comptes,
// et qui vérifie elle-même que l'appelant est Super Administrateur.
// ============================================

function initModuleUtilisateurs() {
    const section = document.getElementById("section-utilisateurs");
    if (!section) return;

    const tbody = section.querySelector("tbody");
    const form = section.querySelector("form");
    const boutonAjouter = section.querySelector(".btn-ajouter");
    const boutonAnnuler = section.querySelector(".btn-annuler");
    const modal = section.querySelector(".modal");
    const titreModal = section.querySelector(".modal-titre");
    const champIdCache = form.querySelector('input[name="id"]');
    const champMotDePasse = form.querySelector('[name="motDePasse"]');
    const champRole = form.querySelector('[name="role"]');
    const champLogin = form.querySelector('[name="login"]');

    // Appelle la fonction Supabase Edge avec le jeton de la personne connectée
    async function appelerFonction(corps) {
        const { data: { session } } = await client.auth.getSession();

        const reponse = await fetch(`${SUPABASE_URL}/functions/v1/gerer-utilisateurs`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session.access_token}`,
                "apikey": SUPABASE_KEY,
            },
            body: JSON.stringify(corps),
        });

        return reponse.json();
    }

    async function chargerDonnees() {
        tbody.innerHTML = `<tr><td colspan="6">Chargement...</td></tr>`;

        const { data, error } = await client
            .from("profils")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            tbody.innerHTML = `<tr><td colspan="6">Erreur de chargement.</td></tr>`;
            console.error(error);
            return;
        }

        if (!data.length) {
            tbody.innerHTML = `<tr><td colspan="6" class="etat-vide">Aucun utilisateur pour le moment.</td></tr>`;
            return;
        }

        tbody.innerHTML = "";
        data.forEach(ligne => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${ligne.nom}</td>
                <td>${ligne.prenom}</td>
                <td>${ligne.login}</td>
                <td>${ligne.role}</td>
                <td>${ligne.statutCompte}</td>
                <td class="actions">
                    <button class="btn-modifier" data-id="${ligne.id}">Modifier</button>
                    <button class="btn-supprimer" data-id="${ligne.id}">Supprimer</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll(".btn-modifier").forEach(btn => {
            btn.addEventListener("click", () => ouvrirModal(btn.dataset.id, data));
        });
        tbody.querySelectorAll(".btn-supprimer").forEach(btn => {
            btn.addEventListener("click", () => supprimerLigne(btn.dataset.id));
        });
    }

    function ouvrirModal(id, donnees) {
        form.reset();
        champIdCache.value = "";

        const estCreation = !id;
        champMotDePasse.closest(".champ").style.display = estCreation ? "block" : "none";
        champMotDePasse.required = estCreation;
        champRole.closest(".champ").style.display = estCreation ? "block" : "none";
        champLogin.disabled = !estCreation;

        if (id) {
            const ligne = donnees.find(d => String(d.id) === String(id));
            titreModal.textContent = "Modifier — Utilisateur";
            champIdCache.value = ligne.id;
            form.nom.value = ligne.nom;
            form.prenom.value = ligne.prenom;
            form.login.value = ligne.login;
            form.statutCompte.value = ligne.statutCompte;
        } else {
            titreModal.textContent = "Ajouter — Utilisateur";
        }

        modal.classList.add("actif");
    }

    function fermerModal() {
        modal.classList.remove("actif");
    }

    // Suppression réelle : appelle la fonction Edge, qui supprime le compte
    // d'authentification (le profil est supprimé automatiquement avec lui)
    async function supprimerLigne(id) {
        if (!confirm("Confirmer la suppression définitive de ce compte ? Cette action est irréversible.")) return;

        const resultat = await appelerFonction({ action: "supprimer", id });

        if (resultat.error) {
            alert("Suppression impossible : " + resultat.error);
            return;
        }
        chargerDonnees();
    }

    form.addEventListener("submit", async (evenement) => {
        evenement.preventDefault();
        const id = champIdCache.value;

        if (id) {
            // Modification d'un profil existant (nom, prénom, statut — pas le rôle ni le login)
            const { error } = await client.from("profils").update({
                nom: form.nom.value,
                prenom: form.prenom.value,
                statutCompte: form.statutCompte.value,
            }).eq("id", id);

            if (error) {
                alert("Enregistrement impossible.");
                console.error(error);
                return;
            }
        } else {
            // Création réelle : passe par la fonction Edge, avec le rôle choisi
            const email = `${form.login.value.trim()}@${DOMAINE_INTERNE}`;

            const resultat = await appelerFonction({
                action: "creer",
                email,
                motDePasse: form.motDePasse.value,
                nom: form.nom.value,
                prenom: form.prenom.value,
                login: form.login.value.trim(),
                role: form.role.value,
                statutCompte: form.statutCompte.value,
            });

            if (resultat.error) {
                alert("Création impossible : " + resultat.error);
                return;
            }
        }

        fermerModal();
        chargerDonnees();
    });

    boutonAjouter.addEventListener("click", () => ouvrirModal(null, []));
    boutonAnnuler.addEventListener("click", fermerModal);

    chargerDonnees();
}