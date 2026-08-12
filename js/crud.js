// ============================================
// Moteur CRUD générique
// Un seul jeu de fonctions réutilisé pour toutes les tables
// (clients, chambres, reservations, sejours, paiements,
//  factures, activites, utilisateurs)
// ============================================

/**
 * Initialise un module de gestion pour une table Supabase.
 *
 * config = {
 *   table: "clients",              // nom de la table Supabase
 *   sectionId: "section-clients",  // id de la section HTML
 *   columns: [                     // colonnes affichées + éditables
 *     { key: "nom", label: "Nom", type: "text" },
 *     { key: "email", label: "Email", type: "email" },
 *     { key: "statut", label: "Statut", type: "select", options: ["Actif","Inactif"] },
 *     { key: "client_id", label: "Client", type: "foreign", table: "clients", display: "nom" }
 *   ]
 * }
 */
function initCrudModule(config) {
    const section = document.getElementById(config.sectionId);
    if (!section) return;

    const tbody = section.querySelector("tbody");
    const form = section.querySelector("form");
    const boutonAjouter = section.querySelector(".btn-ajouter");
    const boutonAnnuler = section.querySelector(".btn-annuler");
    const modal = section.querySelector(".modal");
    const titreModal = section.querySelector(".modal-titre");
    const champIdCache = form.querySelector('input[name="id"]');

    // Construit le libellé affiché pour une ligne liée (gère un ou plusieurs champs)
    function libelleLigne(ligne, col) {
        if (Array.isArray(col.display)) {
            return col.display.map(champ => ligne[champ]).filter(Boolean).join(" ") || `#${ligne.id}`;
        }
        return ligne[col.display] ?? `#${ligne.id}`;
    }

    // Charge les options des listes déroulantes liées à d'autres tables (clés étrangères)
    async function chargerListesDeroulantes() {
        for (const col of config.columns) {
            if (col.type !== "foreign") continue;
            const select = form.querySelector(`[name="${col.key}"]`);
            if (!select) continue;

            const { data, error } = await client.from(col.table).select("*");
            if (error) { console.error(error); continue; }

            select.innerHTML = `<option value="">-- Choisir --</option>`;
            data.forEach(ligne => {
                const option = document.createElement("option");
                option.value = ligne.id;
                option.textContent = libelleLigne(ligne, col);
                select.appendChild(option);
            });
        }
    }

    // Affiche la valeur d'une cellule (résout les clés étrangères en libellé lisible)
    async function resoudreAffichage(col, valeur, cacheForeign) {
        if (col.type !== "foreign" || !valeur) return valeur ?? "";
        const cle = `${col.table}-${valeur}`;
        if (!cacheForeign[cle]) {
            const { data } = await client.from(col.table).select("*").eq("id", valeur).maybeSingle();
            cacheForeign[cle] = data ? libelleLigne(data, col) : `#${valeur}`;
        }
        return cacheForeign[cle];
    }

    // Charge et affiche les lignes de la table
    async function chargerDonnees() {
        tbody.innerHTML = `<tr><td colspan="${config.columns.length + 1}">Chargement...</td></tr>`;

        const { data, error } = await client
            .from(config.table)
            .select("*")
            .order("id", { ascending: false });

        if (error) {
            tbody.innerHTML = `<tr><td colspan="${config.columns.length + 1}">Erreur de chargement.</td></tr>`;
            console.error(error);
            return;
        }

        if (!data.length) {
            tbody.innerHTML = `<tr><td colspan="${config.columns.length + 1}">Aucune donnée pour le moment.</td></tr>`;
            return;
        }

        const cacheForeign = {};
        tbody.innerHTML = "";
        for (const ligne of data) {
            const tr = document.createElement("tr");
            let cellules = "";
            for (const col of config.columns) {
                const valeurAffichee = await resoudreAffichage(col, ligne[col.key], cacheForeign);
                cellules += `<td>${valeurAffichee ?? ""}</td>`;
            }
            tr.innerHTML = `
                ${cellules}
                <td class="actions">
                    <button class="btn-modifier" data-id="${ligne.id}">Modifier</button>
                    <button class="btn-supprimer" data-id="${ligne.id}">Supprimer</button>
                </td>
            `;
            tbody.appendChild(tr);
        }

        // Actions sur chaque ligne
        tbody.querySelectorAll(".btn-modifier").forEach(btn => {
            btn.addEventListener("click", () => ouvrirModal(btn.dataset.id, data));
        });
        tbody.querySelectorAll(".btn-supprimer").forEach(btn => {
            btn.addEventListener("click", () => supprimerLigne(btn.dataset.id));
        });
    }

    // Ouvre le formulaire (vide pour ajout, pré-rempli pour modification)
    async function ouvrirModal(id, donnees) {
        await chargerListesDeroulantes();
        form.reset();
        champIdCache.value = "";

        if (id) {
            const ligne = donnees.find(d => String(d.id) === String(id));
            titreModal.textContent = `Modifier — ${config.titre}`;
            champIdCache.value = ligne.id;
            config.columns.forEach(col => {
                const champ = form.querySelector(`[name="${col.key}"]`);
                if (champ) champ.value = ligne[col.key] ?? "";
            });
        } else {
            titreModal.textContent = `Ajouter — ${config.titre}`;
        }

        modal.classList.add("actif");
    }

    function fermerModal() {
        modal.classList.remove("actif");
    }

    // Supprime une ligne après confirmation
    async function supprimerLigne(id) {
        if (!confirm("Confirmer la suppression ?")) return;

        const { error } = await client.from(config.table).delete().eq("id", id);
        if (error) {
            alert("Suppression impossible.");
            console.error(error);
            return;
        }
        chargerDonnees();
    }

    // Ajoute ou modifie une ligne à l'enregistrement du formulaire
    form.addEventListener("submit", async (evenement) => {
        evenement.preventDefault();

        const valeurs = {};
        config.columns.forEach(col => {
            const champ = form.querySelector(`[name="${col.key}"]`);
            valeurs[col.key] = champ.value || null;
        });

        const id = champIdCache.value;
        let erreur;

        if (id) {
            ({ error: erreur } = await client.from(config.table).update(valeurs).eq("id", id));
        } else {
            ({ error: erreur } = await client.from(config.table).insert([valeurs]));
        }

        if (erreur) {
            alert("Enregistrement impossible.");
            console.error(erreur);
            return;
        }

        fermerModal();
        chargerDonnees();
    });

    boutonAjouter.addEventListener("click", () => ouvrirModal(null, []));
    boutonAnnuler.addEventListener("click", fermerModal);

    // Recharge les données quand on ouvre la section (voir main.js)
    section.rechargerModule = chargerDonnees;

    chargerDonnees();
}