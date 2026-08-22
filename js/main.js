// ============================================
// Navigation du dashboard + tableau de bord dynamique
// ============================================

document.addEventListener("DOMContentLoaded", async () => {
    const profil = await verifierSession();
    if (!profil) return; // redirection déjà lancée vers connexion.html

    afficherUtilisateurConnecte();
    initTousLesModules();
    activerNavigation();
    chargerStatistiques();
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