// ============================================
// Moteur CRUD générique & Métier Hotel
// ============================================

/**
 * Initialise un module de gestion pour une table Supabase.
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

    // Libellé affiché pour une ligne liée (clés étrangères)
    function libelleLigne(ligne, col) {
        if (Array.isArray(col.display)) {
            return col.display.map(champ => ligne[champ]).filter(Boolean).join(" ") || `#${ligne.id}`;
        }
        return ligne[col.display] ?? `#${ligne.id}`;
    }

    // Charge les options des listes déroulantes
    async function chargerListesDeroulantes() {
        for (const col of config.columns) {
            if (col.type !== "foreign") continue;
            const select = form.querySelector(`[name="${col.key}"]`);
            if (!select) continue;

            // LOGIQUE SPÉCIFIQUE : Filtrage des clients dans le module Facture
            if (config.table === "factures" && col.key === "client_id") {
                await chargerClientsEligiblesFacture(select);
                continue;
            }

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

    // Résout l'affichage des colonnes (statut, prix, etc.)
    async function resoudreAffichage(col, valeur, cacheForeign, ligne) {
        if (col.type === "foreign" && valeur) {
            const cle = `${col.table}-${valeur}`;
            if (!cacheForeign[cle]) {
                const { data } = await client.from(col.table).select("*").eq("id", valeur).maybeSingle();
                cacheForeign[cle] = data ? libelleLigne(data, col) : `#${valeur}`;
            }
            return cacheForeign[cle];
        }

        // Affichage personnalisé du statut de paiement avec Bouton Vert/Rouge
        if (config.table === "paiements" && col.key === "statut") {
            const estPaye = valeur === "paye" || valeur === "Payé";
            const btnClass = estPaye ? "btn-statut-paye" : "btn-statut-non-paye";
            const texte = estPaye ? "✔ Payé" : "✖ Pas payé";
            return `<button type="button" class="btn-statut ${btnClass}" data-id="${ligne.id}" data-statut="${valeur}">${texte}</button>`;
        }

        return valeur ?? "";
    }

    // Charge et affiche les données dans le tableau
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
                const valeurAffichee = await resoudreAffichage(col, ligne[col.key], cacheForeign, ligne);
                cellules += `<td>${valeurAffichee ?? ""}</td>`;
            }

            // Boutons d'actions (Modifier, Supprimer + Imprimer si facture/paiement)
            let boutonImprimer = "";
            if (config.table === "factures") {
                boutonImprimer = `<button class="btn-imprimer" data-type="facture" data-id="${ligne.id}">🖨 Imprimer</button>`;
            } else if (config.table === "paiements") {
                boutonImprimer = `<button class="btn-imprimer" data-type="recu" data-id="${ligne.id}">🖨 Reçu</button>`;
            }

            tr.innerHTML = `
                ${cellules}
                <td class="actions">
                    ${boutonImprimer}
                    <button class="btn-modifier" data-id="${ligne.id}">Modifier</button>
                    <button class="btn-supprimer" data-id="${ligne.id}">Supprimer</button>
                </td>
            `;
            tbody.appendChild(tr);
        }

        // Événements sur les boutons de ligne
        tbody.querySelectorAll(".btn-modifier").forEach(btn => {
            btn.addEventListener("click", () => ouvrirModal(btn.dataset.id, data));
        });
        tbody.querySelectorAll(".btn-supprimer").forEach(btn => {
            btn.addEventListener("click", () => supprimerLigne(btn.dataset.id));
        });
        tbody.querySelectorAll(".btn-imprimer").forEach(btn => {
            btn.addEventListener("click", () => {
                if (typeof imprimerElement === "function") {
                    imprimerElement(btn.dataset.type, btn.dataset.id);
                } else {
                    alert("Fonction d'impression indisponible.");
                }
            });
        });

        // Toggle rapide du statut de paiement
        tbody.querySelectorAll(".btn-statut").forEach(btn => {
            btn.addEventListener("click", async () => {
                const statutActuel = btn.dataset.statut;
                const nouveauStatut = (statutActuel === "paye" || statutActuel === "Payé") ? "pas_paye" : "paye";
                await client.from("paiements").update({ statut: nouveauStatut }).eq("id", btn.dataset.id);
                chargerDonnees();
            });
        });
    }

    // Ouvre la boîte de dialogue (modal)
    async function ouvrirModal(id, donnees) {
        await chargerListesDeroulantes();
        form.reset();
        champIdCache.value = "";

        if (id) {
            const ligne = donnees.find(d => String(d.id) === String(id));
            titreModal.textContent = `Modifier — ${config.titre || config.table}`;
            champIdCache.value = ligne.id;
            config.columns.forEach(col => {
                const champ = form.querySelector(`[name="${col.key}"]`);
                if (champ) champ.value = ligne[col.key] ?? "";
            });
        } else {
            titreModal.textContent = `Ajouter — ${config.titre || config.table}`;
        }

        // Activer la logique de calcul dynamique pour la section des factures
        if (config.table === "factures") {
            initialiserCalculFacture(form);
        }

        modal.classList.add("actif");
    }

    function fermerModal() {
        modal.classList.remove("actif");
    }

    // Supprimer une ligne
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

    // Enregistrement du formulaire
    form.addEventListener("submit", async (evenement) => {
        evenement.preventDefault();

        const valeurs = {};
        config.columns.forEach(col => {
            const champ = form.querySelector(`[name="${col.key}"]`);
            if (champ) {
                valeurs[col.key] = champ.value || null;
            }
        });

        const id = champIdCache.value;
        let erreur;
        let donneeInseree;

        if (id) {
            ({ error: erreur } = await client.from(config.table).update(valeurs).eq("id", id));
        } else {
            const res = await client.from(config.table).insert([valeurs]).select().single();
            erreur = res.error;
            donneeInseree = res.data;
        }

        if (erreur) {
            alert("Enregistrement impossible.");
            console.error(erreur);
            return;
        }

        // LOGIQUE SPÉCIFIQUE : Quand une facture est créée, générer automatiquement son Paiement
        if (config.table === "factures" && !id && donneeInseree) {
            await client.from("paiements").insert([{
                facture_id: donneeInseree.id,
                client_id: donneeInseree.client_id,
                montant: donneeInseree.montant_total || donneeInseree.montant || 0,
                statut: "pas_paye",
                date_paiement: donneeInseree.date_facture || new Date().toISOString().split('T')[0]
            }]);
        }

        fermerModal();
        chargerDonnees();

        // Si on est dans les factures, on met aussi à jour la vue des paiements si présente
        const sectionPaiements = document.getElementById("section-paiements");
        if (sectionPaiements && typeof sectionPaiements.rechargerModule === "function") {
            sectionPaiements.rechargerModule();
        }
    });

    boutonAjouter.addEventListener("click", () => ouvrirModal(null, []));
    boutonAnnuler.addEventListener("click", fermerModal);

    section.rechargerModule = chargerDonnees;
    chargerDonnees();
}

// ============================================
// LOGIQUE LOGISTIQUE FACTURES (Clients, Chambres & Activités)
// ============================================

/**
 * Filtre les clients dans le selecteur : Seulement ceux avec Réservation ou Activité
 */
async function chargerClientsEligiblesFacture(selectElement) {
    selectElement.innerHTML = `<option value="">Chargement des clients...</option>`;

    // Clients avec une réservation
    const { data: resas } = await client.from("reservations").select("client_id, clients(*), chambres(*)");
    // Clients avec une activité
    const { data: acts } = await client.from("activites").select("client_id, clients(*)");

    const mapClients = new Map();

    if (resas) {
        resas.forEach(r => {
            if (r.clients) {
                mapClients.set(r.client_id, {
                    client: r.clients,
                    chambre: r.chambres
                });
            }
        });
    }

    if (acts) {
        acts.forEach(a => {
            if (a.clients && !mapClients.has(a.client_id)) {
                mapClients.set(a.client_id, {
                    client: a.clients,
                    chambre: null
                });
            }
        });
    }

    selectElement.innerHTML = `<option value="">-- Sélectionner un client --</option>`;
    mapClients.forEach((valeur, clientId) => {
        const option = document.createElement("option");
        option.value = clientId;
        const nomComplet = `${valeur.client.nom ?? ''} ${valeur.client.prenom ?? ''}`.trim() || `Client #${clientId}`;
        option.textContent = nomComplet;

        // Stockage des informations chambre en dataset
        if (valeur.chambre) {
            option.dataset.chambreNum = valeur.chambre.numero || valeur.chambre.nom || "Réservée";
            option.dataset.chambrePrix = valeur.chambre.prix || 0;
        } else {
            option.dataset.chambreNum = "Pas de chambre réservée";
            option.dataset.chambrePrix = 0;
        }

        selectElement.appendChild(option);
    });
}

/**
 * Attache les écouteurs pour la chambre auto et le calcul total
 */
function initialiserCalculFacture(form) {
    const selectClient = form.querySelector('[name="client_id"]');
    const inputChambre = form.querySelector('[name="chambre_info"]') || form.querySelector('#facture_chambre');
    const selectActivite = form.querySelector('[name="activite_id"]') || form.querySelector('#facture_activite');
    const inputMontant = form.querySelector('[name="montant_total"]') || form.querySelector('[name="montant"]');

    if (!selectClient) return;

    async function recalculer() {
        const optSelected = selectClient.options[selectClient.selectedIndex];
        let total = 0;

        // 1. Gestion de la chambre automatique
        if (optSelected && optSelected.dataset.chambreNum) {
            if (inputChambre) {
                inputChambre.value = optSelected.dataset.chambreNum;
            }
            total += parseFloat(optSelected.dataset.chambrePrix) || 0;
        } else if (inputChambre) {
            inputChambre.value = "Pas de chambre réservée";
        }

        // 2. Gestion du tarif de l'activité sélectionnée
        if (selectActivite && selectActivite.value) {
            const { data: act } = await client.from("activites").select("prix").eq("id", selectActivite.value).maybeSingle();
            if (act && act.prix) {
                total += parseFloat(act.prix) || 0;
            }
        }

        // 3. Application du Montant Total calculé
        if (inputMontant) {
            inputMontant.value = total;
        }
    }

    selectClient.removeEventListener("change", recalculer);
    selectClient.addEventListener("change", recalculer);

    if (selectActivite) {
        selectActivite.removeEventListener("change", recalculer);
        selectActivite.addEventListener("change", recalculer);
    }
}