// ============================================
// Impression des Factures & Reçus de Paiement
// ============================================

/**
 * Fonction universelle pour imprimer une Facture ou un Reçu de paiement
 * @param {string} type - "facture" ou "recu"
 * @param {string|number} id - L'identifiant de la facture ou du paiement
 */
async function imprimerElement(type, id) {
    let titreDoc = "";
    let nomClient = "—";
    let detailChambre = "—";
    let detailActivite = "—";
    let montantAffiche = "—";
    let dateAffichee = "—";
    let statutPaiement = "";

    if (type === "facture") {
        titreDoc = `Facture n° ${id}`;
        
        // Récupération de la facture
        const { data: facture } = await client.from("factures").select("*").eq("id", id).maybeSingle();
        if (!facture) return alert("Facture introuvable.");

        // Récupération en parallèle du client, de la réservation/chambre et de l'activité
        const [{ data: client_ }, { data: resa }, { data: activite }] = await Promise.all([
            facture.client_id ? client.from("clients").select("*").eq("id", facture.client_id).maybeSingle() : Promise.resolve({ data: null }),
            facture.client_id ? client.from("reservations").select("*, chambres(*)").eq("client_id", facture.client_id).maybeSingle() : Promise.resolve({ data: null }),
            facture.activite_id ? client.from("activites").select("*").eq("id", facture.activite_id).maybeSingle() : Promise.resolve({ data: null })
        ]);

        nomClient = client_ ? `${client_.prenom || ''} ${client_.nom || ''}`.trim() : "—";
        detailChambre = (resa && resa.chambres) ? `Chambre ${resa.chambres.numero || resa.chambres.nom}` : "Pas de chambre réservée";
        detailActivite = activite ? activite.nom : "Aucune activité";
        montantAffiche = facture.montant_total
            ? `${Number(facture.montant_total).toLocaleString("fr-FR")} FCFA`
            : "—";
        dateAffichee = facture.date_facture
            ? new Date(facture.date_facture).toLocaleDateString("fr-FR")
            : new Date().toLocaleDateString("fr-FR");

    } else if (type === "recu") {
        titreDoc = `Reçu de Paiement n° P-${id}`;

        // Récupération du paiement
        const { data: paiement } = await client.from("paiements").select("*").eq("id", id).maybeSingle();
        if (!paiement) return alert("Paiement introuvable.");

        // Récupération du client lié
        const { data: client_ } = await client.from("clients").select("*").eq("id", paiement.client_id).maybeSingle();

        nomClient = client_ ? `${client_.prenom || ''} ${client_.nom || ''}`.trim() : "—";
        detailChambre = `Réf. Facture #${paiement.facture_id || 'N/A'}`;
        
        const estPaye = (paiement.statut === "paye" || paiement.statut === "Payé");
        statutPaiement = estPaye ? "RÈGLEMENT EFFECTUÉ (PAYÉ)" : "EN ATTENTE DE RÈGLEMENT (NON PAYÉ)";
        
        montantAffiche = paiement.montant
            ? `${Number(paiement.montant).toLocaleString("fr-FR")} FCFA`
            : "—";
        dateAffichee = paiement.date_paiement
            ? new Date(paiement.date_paiement).toLocaleDateString("fr-FR")
            : new Date().toLocaleDateString("fr-FR");
    }

    // Ouverture de la fenêtre d'impression
    const fenetre = window.open("", "_blank", "width=680,height=850");
    if (!fenetre) {
        alert("Le navigateur a bloqué la fenêtre d'impression. Veuillez autoriser les pop-ups pour ce site.");
        return;
    }

    // Construction du document HTML d'impression
    fenetre.document.write(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
        <meta charset="UTF-8" />
        <title>${titreDoc} — TERANGA PALACE</title>
        <style>
            body { font-family: Georgia, serif; color: #23241F; padding: 40px; line-height: 1.5; }
            .entete { text-align: center; margin-bottom: 25px; }
            .entete .nom { font-size: 28px; font-style: italic; color: #0E2B27; font-weight: bold; }
            .entete .sous-titre { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #6B6A62; margin-top: 4px; }
            .trait { width: 60px; height: 2px; background: #C7A45C; margin: 16px auto; }
            .titre-document { text-align: center; font-size: 16px; text-transform: uppercase; letter-spacing: 3px; margin: 20px 0 25px; color: #C7A45C; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            td { padding: 12px 10px; border-bottom: 1px solid #E4E0D6; font-size: 14px; }
            .etiquette { color: #6B6A62; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; width: 38%; }
            .valeur { font-weight: 600; color: #0E2B27; }
            .montant .valeur { font-size: 20px; color: #C7A45C; }
            .statut-bloc { margin-top: 20px; padding: 10px; text-align: center; background-color: #F8F6F0; border: 1px dashed #C7A45C; font-size: 12px; font-weight: bold; letter-spacing: 1px; }
            .pied { margin-top: 50px; text-align: center; font-size: 12px; color: #6B6A62; border-top: 1px solid #E4E0D6; padding-top: 15px; }
        </style>
        </head>
        <body>
            <div class="entete">
                <div class="nom">Teranga Palace</div>
                <div class="sous-titre">Gestion Hôtelière & Services</div>
                <div class="trait"></div>
            </div>
            
            <div class="titre-document">${titreDoc}</div>
            
            <table>
                <tr><td class="etiquette">Client</td><td class="valeur">${nomClient}</td></tr>
                <tr><td class="etiquette">${type === 'facture' ? 'Chambre' : 'Référence'}</td><td class="valeur">${detailChambre}</td></tr>
                ${type === 'facture' ? `<tr><td class="etiquette">Activité</td><td class="valeur">${detailActivite}</td></tr>` : ''}
                <tr><td class="etiquette">Date</td><td class="valeur">${dateAffichee}</td></tr>
                <tr class="montant"><td class="etiquette">Montant total</td><td class="valeur">${montantAffiche}</td></tr>
            </table>

            ${statutPaiement ? `<div class="statut-bloc">${statutPaiement}</div>` : ''}

            <div class="pied">Document généré le ${new Date().toLocaleDateString("fr-FR")} — Merci de votre confiance.</div>
        </body>
        </html>
    `);

    fenetre.document.close();

    setTimeout(() => {
        fenetre.focus();
        fenetre.print();
    }, 300);
}

// Rétrocompatibilité au cas où l'ancienne fonction soit appelée directement
function imprimerFacture(id) {
    imprimerElement("facture", id);
}