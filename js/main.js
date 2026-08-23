// ============================================
// Navigation du dashboard + tableau de bord dynamique
// ============================================

document.addEventListener("DOMContentLoaded", async () => {
    const profil = await verifierSession();
    if (!profil) return; // redirection déjà lancée vers connexion.html

    afficherUtilisateurConnecte();
    initTousLesModules();
    activerNavigation();
    chargerStatistiques();// ============================================
// Navigation du dashboard + tableau de bord dynamique
// ============================================

document.addEventListener("DOMContentLoaded", async () => {
    const profil = await verifierSession();
    if (!profil) return; // redirection déjà lancée vers connexion.html

    afficherUtilisateurConnecte();
    initTousLesModules();
    activerNavigation();
    chargerStatistiques();
    chargerGraphiques();
});

// Passe d'une section à l'autre sans recharger la page
function activerNavigation() {
    const liens = document.querySelectorAll(".menu [data-section]");
    const sections = document.querySelectorAll(".content-box > section");

    liens.forEach(lien => {
        lien.addEventListener("click", () => {
            const cible = lien.dataset.section;

            liens.forEach(l => l.classList.remove("actif"));
            lien.classList.add("actif");

            sections.forEach(section => {
                const estCible = section.id === `section-${cible}`;
                section.classList.toggle("actif", estCible);
            });

            if (cible === "accueil") {
                chargerStatistiques();
                chargerGraphiques();
            }
        });
    });
}

// Calcule les indicateurs du tableau de bord à partir de Supabase
async function chargerStatistiques() {
    const [clients, chambres, reservations, sejoursActifs, paiements] = await Promise.all([
        client.from("clients").select("*", { count: "exact", head: true }),
        client.from("chambres").select("*", { count: "exact", head: true }),
        client.from("reservations").select("*", { count: "exact", head: true }),
        client.from("sejours").select("*", { count: "exact", head: true }).eq("statut", "Séjour en cours"),
        client.from("paiements").select("montant"),
    ]);

    document.getElementById("stat-clients").textContent = clients.count ?? 0;
    document.getElementById("stat-chambres").textContent = chambres.count ?? 0;
    document.getElementById("stat-reservations").textContent = reservations.count ?? 0;
    document.getElementById("stat-sejours").textContent = sejoursActifs.count ?? 0;

    const revenus = (paiements.data ?? []).reduce((total, p) => total + (Number(p.montant) || 0), 0);
    document.getElementById("stat-revenus").textContent = `${revenus.toLocaleString("fr-FR")} FCFA`;

    const chambresOccupees = await client
        .from("chambres")
        .select("*", { count: "exact", head: true })
        .eq("statut", "Occupée");

    const taux = chambres.count ? Math.round((chambresOccupees.count / chambres.count) * 100) : 0;
    document.getElementById("stat-occupation").textContent = `${taux} %`;
}

// ============================================
// Graphiques du tableau de bord (Chart.js)
// ============================================

let graphiqueChambresStatut, graphiqueChambresCategorie, graphiqueReservationsStatut, graphiqueRevenus;

async function chargerGraphiques() {
    const [chambres, reservations, paiements] = await Promise.all([
        client.from("chambres").select("statut, categorie"),
        client.from("reservations").select("statut"),
        client.from("paiements").select("montant, date_paiement"),
    ]);

    // ---------- Chambres par statut ----------
    const statutsChambres = ["Disponible", "Occupée", "Maintenance"];
    const donneesStatutChambres = statutsChambres.map(
        s => (chambres.data ?? []).filter(c => c.statut === s).length
    );

    if (graphiqueChambresStatut) graphiqueChambresStatut.destroy();
    graphiqueChambresStatut = new Chart(document.getElementById("graphique-chambres-statut"), {
        type: "doughnut",
        data: {
            labels: statutsChambres,
            datasets: [{ data: donneesStatutChambres, backgroundColor: ["#4C7A63", "#C7A45C", "#B3453D"] }],
        },
        options: { plugins: { legend: { position: "bottom" } } },
    });

    // ---------- Chambres par catégorie ----------
    const categoriesChambres = ["Standard", "Suite", "Luxe"];
    const donneesCategorieChambres = categoriesChambres.map(
        c => (chambres.data ?? []).filter(ch => ch.categorie === c).length
    );

    if (graphiqueChambresCategorie) graphiqueChambresCategorie.destroy();
    graphiqueChambresCategorie = new Chart(document.getElementById("graphique-chambres-categorie"), {
        type: "bar",
        data: {
            labels: categoriesChambres,
            datasets: [{ data: donneesCategorieChambres, backgroundColor: "#0E2B27" }],
        },
        options: {
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
        },
    });

    // ---------- Réservations par statut ----------
    const statutsReservations = ["Confirmée", "Annulée"];
    const donneesStatutReservations = statutsReservations.map(
        s => (reservations.data ?? []).filter(r => r.statut === s).length
    );

    if (graphiqueReservationsStatut) graphiqueReservationsStatut.destroy();
    graphiqueReservationsStatut = new Chart(document.getElementById("graphique-reservations-statut"), {
        type: "doughnut",
        data: {
            labels: statutsReservations,
            datasets: [{ data: donneesStatutReservations, backgroundColor: ["#4C7A63", "#B3453D"] }],
        },
        options: { plugins: { legend: { position: "bottom" } } },
    });

    // ---------- Évolution des revenus (paiements cumulés par jour) ----------
    const totauxParJour = {};
    (paiements.data ?? []).forEach(p => {
        if (!p.date_paiement) return;
        totauxParJour[p.date_paiement] = (totauxParJour[p.date_paiement] || 0) + (Number(p.montant) || 0);
    });
    const datesTriees = Object.keys(totauxParJour).sort();

    if (graphiqueRevenus) graphiqueRevenus.destroy();
    graphiqueRevenus = new Chart(document.getElementById("graphique-revenus"), {
        type: "line",
        data: {
            labels: datesTriees,
            datasets: [{
                label: "Revenus (FCFA)",
                data: datesTriees.map(d => totauxParJour[d]),
                borderColor: "#C7A45C",
                backgroundColor: "rgba(199,164,92,0.15)",
                fill: true,
                tension: 0.3,
            }],
        },
        options: { plugins: { legend: { display: false } } },
    });
}
});

// Passe d'une section à l'autre sans recharger la page
function activerNavigation() {
    const liens = document.querySelectorAll(".menu [data-section]");
    const sections = document.querySelectorAll(".content-box > section");

    liens.forEach(lien => {
        lien.addEventListener("click", () => {
            const cible = lien.dataset.section;

            liens.forEach(l => l.classList.remove("actif"));
            lien.classList.add("actif");

            sections.forEach(section => {
                const estCible = section.id === `section-${cible}`;
                section.classList.toggle("actif", estCible);
            });

            if (cible === "accueil") chargerStatistiques();
        });
    });
}

// Calcule les indicateurs du tableau de bord à partir de Supabase
async function chargerStatistiques() {
    const [clients, chambres, reservations, sejoursActifs, paiements] = await Promise.all([
        client.from("clients").select("*", { count: "exact", head: true }),
        client.from("chambres").select("*", { count: "exact", head: true }),
        client.from("reservations").select("*", { count: "exact", head: true }),
        client.from("sejours").select("*", { count: "exact", head: true }).eq("statut", "Séjour en cours"),
        client.from("paiements").select("montant"),
    ]);

    document.getElementById("stat-clients").textContent = clients.count ?? 0;
    document.getElementById("stat-chambres").textContent = chambres.count ?? 0;
    document.getElementById("stat-reservations").textContent = reservations.count ?? 0;
    document.getElementById("stat-sejours").textContent = sejoursActifs.count ?? 0;

    const revenus = (paiements.data ?? []).reduce((total, p) => total + (Number(p.montant) || 0), 0);
    document.getElementById("stat-revenus").textContent = `${revenus.toLocaleString("fr-FR")} FCFA`;

    const chambresOccupees = await client
        .from("chambres")
        .select("*", { count: "exact", head: true })
        .eq("statut", "Occupée");

    const taux = chambres.count ? Math.round((chambresOccupees.count / chambres.count) * 100) : 0;
    document.getElementById("stat-occupation").textContent = `${taux} %`;
}