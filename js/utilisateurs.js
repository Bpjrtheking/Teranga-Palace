// ============================================
// Gestion des utilisateurs (liée à de vrais comptes Supabase Auth)
// Cas particulier, séparé du moteur CRUD générique, car :
// - "Ajouter" crée un vrai compte de connexion (email + mot de passe)
// - "Supprimer" ne peut pas supprimer un compte d'authentification depuis
//   le navigateur (ça demande une clé secrète serveur) : on le désactive.
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
    const champLogin = form.querySelector('[name="login"]');

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
                    <button class="btn-supprimer" data-id="${ligne.id}">Désactiver</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll(".btn-modifier").forEach(btn => {
            btn.addEventListener("click", () => ouvrirModal(btn.dataset.id, data));
        });
        tbody.querySelectorAll(".btn-supprimer").forEach(btn => {
            btn.addEventListener("click", () => desactiverLigne(btn.dataset.id));
        });
    }

    function ouvrirModal(id, donnees) {
        form.reset();
        champIdCache.value = "";

        champMotDePasse.closest(".champ").style.display = id ? "none" : "block";
        champMotDePasse.required = !id;
        champLogin.disabled = !!id;

        if (id) {
            const ligne = donnees.find(d => String(d.id) === String(id));
            titreModal.textContent = "Modifier — Utilisateur";
            champIdCache.value = ligne.id;
            form.nom.value = ligne.nom;
            form.prenom.value = ligne.prenom;
            form.login.value = ligne.login;
            form.role.value = ligne.role;
            form.statutCompte.value = ligne.statutCompte;
        } else {
            titreModal.textContent = "Ajouter — Utilisateur";
        }

        modal.classList.add("actif");
    }

    function fermerModal() {
        modal.classList.remove("actif");
    }

    async function desactiverLigne(id) {
        if (!confirm("Confirmer la désactivation de ce compte ?")) return;

        const { error } = await client.from("profils").update({ statutCompte: "Inactif" }).eq("id", id);
        if (error) {
            alert("Opération impossible.");
            console.error(error);
            return;
        }
        chargerDonnees();
    }

    form.addEventListener("submit", async (evenement) => {
        evenement.preventDefault();
        const id = champIdCache.value;

        if (id) {
            const { error } = await client.from("profils").update({
                nom: form.nom.value,
                prenom: form.prenom.value,
                role: form.role.value,
                statutCompte: form.statutCompte.value,
            }).eq("id", id);

            if (error) {
                alert("Enregistrement impossible.");
                console.error(error);
                return;
            }
        } else {
            const clientTemporaire = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            const email = `${form.login.value.trim()}@${DOMAINE_INTERNE}`;

            const { data, error: erreurCreation } = await clientTemporaire.auth.signUp({
                email,
                password: form.motDePasse.value,
            });

            if (erreurCreation || !data.user) {
                alert("Création du compte impossible : " + (erreurCreation?.message || "erreur inconnue"));
                return;
            }

            const { error: erreurProfil } = await client.from("profils").insert([{
                id: data.user.id,
                nom: form.nom.value,
                prenom: form.prenom.value,
                login: form.login.value.trim(),
                role: form.role.value,
                statutCompte: form.statutCompte.value,
            }]);

            if (erreurProfil) {
                alert("Compte créé mais profil non enregistré : " + erreurProfil.message);
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