// ============================================
// Déclaration des modules métier
// Chaque module = une table Supabase + ses colonnes.
// C'est la seule partie à modifier si un champ change.
// ============================================

function initTousLesModules() {
    initCrudModule({
        table: "clients",
        sectionId: "section-clients",
        titre: "Client",
        columns: [
            { key: "nom", label: "Nom", type: "text" },
            { key: "prenom", label: "Prénom", type: "text" },
            { key: "telephone", label: "Téléphone", type: "text" },
            { key: "email", label: "Email", type: "email" },
            { key: "adresse", label: "Adresse", type: "text" },
        ],
    });

    initCrudModule({
        table: "chambres",
        sectionId: "section-chambres",
        titre: "Chambre",
        columns: [
            { key: "numero", label: "Numéro", type: "text" },
            { key: "categorie", label: "Catégorie", type: "select", options: ["Standard", "Suite", "Luxe"] },
            { key: "tarif", label: "Tarif (FCFA)", type: "number" },
            { key: "statut", label: "Statut", type: "select", options: ["Disponible", "Occupée", "Maintenance"] },
        ],
    });

    initCrudModule({
        table: "reservations",
        sectionId: "section-reservations",
        titre: "Réservation",
        columns: [
            { key: "client_id", label: "Client", type: "foreign", table: "clients", display: ["nom", "prenom"] },
            { key: "chambre_id", label: "Chambre", type: "foreign", table: "chambres", display: "numero" },
            { key: "date_arrivee", label: "Arrivée", type: "date" },
            { key: "date_depart", label: "Départ", type: "date" },
            { key: "statut", label: "Statut", type: "select", options: ["Confirmée", "Annulée"] },
        ],
    });

    initCrudModule({
        table: "sejours",
        sectionId: "section-sejours",
        titre: "Séjour",
        columns: [
            { key: "client_id", label: "Client", type: "foreign", table: "clients", display: ["nom", "prenom"] },
            { key: "chambre_id", label: "Chambre", type: "foreign", table: "chambres", display: "numero" },
            { key: "statut", label: "Statut", type: "select", options: ["Séjour prévu", "Séjour en cours", "Séjour terminé"] },
        ],
    });

    initCrudModule({
        table: "paiements",
        sectionId: "section-paiements",
        titre: "Paiement",
        columns: [
            { key: "client_id", label: "Client", type: "foreign", table: "clients", display: ["nom", "prenom"] },
            { key: "chambre_id", label: "Chambre", type: "foreign", table: "chambres", display: "numero" },
            { key: "montant", label: "Montant payé", type: "number" },
            { key: "montant_restant", label: "Montant restant", type: "number" },
            { key: "date_paiement", label: "Date", type: "date" },
        ],
    });

    initCrudModule({
        table: "factures",
        sectionId: "section-factures",
        titre: "Facture",
        columns: [
            { key: "client_id", label: "Client", type: "foreign", table: "clients", display: ["nom", "prenom"] },
            { key: "chambre_id", label: "Chambre", type: "foreign", table: "chambres", display: "numero" },
            { key: "montant_total", label: "Montant total", type: "number" },
            { key: "date_facture", label: "Date", type: "date" },
        ],
    });

    initCrudModule({
        table: "activites",
        sectionId: "section-activites",
        titre: "Activité",
        columns: [
            { key: "nom", label: "Nom", type: "text" },
            { key: "description", label: "Description", type: "text" },
            { key: "prix", label: "Prix (FCFA)", type: "number" },
        ],
    });

    initModuleUtilisateurs();
}