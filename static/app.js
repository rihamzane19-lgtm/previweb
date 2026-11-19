
// ==================================================
// A2 — LECTURE ET VALIDATION DU CSV
// ==================================================

function lireCSV(texte) {

    const lignes = texte.split(/\r?\n/);

    // Vérification de l'en-tête
    const entete = lignes[0]
        .replace(/^\uFEFF/, "")
        .trim()
        .toLowerCase();

    if (entete !== "date,valeur") {
        throw new Error("En-tête attendu : date,valeur");
    }

    const observations = [];
    const erreurs = [];

    // Parcourir les lignes du CSV
    for (let i = 1; i < lignes.length; i++) {

        const ligne = lignes[i].trim();

        // Ignorer les lignes vides
        if (ligne === "") continue;

        const colonnes = ligne.split(",");

        const date = (colonnes[0] || "").trim();
        const valeurTexte = (colonnes[1] || "").trim();

        // Vérifier la date
        const dateValide =
            /^\d{4}-\d{2}-\d{2}$/.test(date) &&
            !Number.isNaN(Date.parse(date));

        // Vérifier la valeur
        const valeurValide =
            valeurTexte !== "" &&
            !Number.isNaN(Number(valeurTexte));

        if (!dateValide) {
            erreurs.push(
                `Ligne ${i + 1} : date invalide (${date})`
            );
        }

        if (!valeurValide) {
            erreurs.push(
                `Ligne ${i + 1} : valeur invalide (${valeurTexte})`
            );
        }

        // Garder uniquement les observations valides
        if (dateValide && valeurValide) {

            observations.push({
                date: date,
                valeur: Number(valeurTexte)
            });
        }
    }

    // Trier les observations par date croissante
    observations.sort((a, b) =>
        a.date.localeCompare(b.date)
    );

    return { observations, erreurs };
}


// ==================================================
// A3 — AFFICHER LE TABLEAU DES OBSERVATIONS
// ==================================================

function afficherTableau(observations) {

    const tbody = document.querySelector(
        "#tableau-observations tbody"
    );

    // Vider le tableau
    tbody.replaceChildren();

    // Ajouter les observations
    observations.forEach(observation => {

        const tr = document.createElement("tr");

        const tdDate = document.createElement("td");
        tdDate.textContent = observation.date;

        const tdValeur = document.createElement("td");
        tdValeur.textContent = observation.valeur;

        tr.appendChild(tdDate);
        tr.appendChild(tdValeur);

        tbody.appendChild(tr);
    });
}


// ==================================================
// A3 — AFFICHER LES MESSAGES
// ==================================================

function afficherMessage(texte, type) {

    const message = document.getElementById("message");

    message.textContent = texte;

    message.className =
        type === "succes"
            ? "message succes"
            : "message erreur";
}


// ==================================================
// B2 — COMMUNICATION AVEC L'API FLASK
// ==================================================

async function analyser(observations) {

    const reponse = await fetch("/api/analyse", {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            donnees: observations
        })
    });

    const resultat = await reponse.json();

    if (!reponse.ok) {
        throw new Error(resultat.erreur);
    }

    return resultat;
}


// ==================================================
// B3 — TRACER LA SERIE ET LA MOYENNE MOBILE
// ==================================================

let graphique = null;

function tracerSerie(resultat) {

    // Détruire l'ancien graphique
    if (graphique) {
        graphique.destroy();
    }

    graphique = new Chart(
        document.getElementById("graphique-serie"),
        {
            type: "line",

            data: {

                labels: resultat.dates,

                datasets: [

                    // Première courbe : ventes mensuelles
                    {
                        label: "Ventes mensuelles",
                        data: resultat.valeurs,
                        borderColor: "#2A6F97",
                        tension: 0.2
                    },

                    // Deuxième courbe : moyenne mobile MM3
                    {
                        label: "Moyenne mobile (3)",
                        data: resultat.moyenne_mobile,
                        borderColor: "#E59A42",
                        tension: 0.2,
                        pointRadius: 0
                    }
                ]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        }
    );
}


// ==================================================
// B2 — FORMULAIRE D'IMPORTATION ET ANALYSE
// ==================================================

document.getElementById("form-import")
    .addEventListener("submit", async (evenement) => {

        evenement.preventDefault();

        const fichier = document.getElementById(
            "fichier-csv"
        ).files[0];

        if (!fichier) {

            afficherMessage(
                "Veuillez choisir un fichier CSV.",
                "erreur"
            );

            return;
        }

        try {

            // 1. Lire le fichier CSV
            const texte = await fichier.text();

            // 2. Valider et trier les observations
            const { observations, erreurs } = lireCSV(texte);

            // 3. Envoyer les observations au serveur Flask
            const resultat = await analyser(observations);

            // 4. Afficher le tableau
            afficherTableau(observations);

            // 5. Tracer les deux courbes
            tracerSerie(resultat);
            // B4 — Afficher le résumé de la série

            const nombreObservations = resultat.dates.length;

            const dernierIndex = resultat.moyenne_mobile.length - 1;

            const derniereMM3 = resultat.moyenne_mobile[dernierIndex];

            const derniereDate = new Date(resultat.dates[dernierIndex] + "T00:00:00");

            const moisAnnee = derniereDate.toLocaleDateString("fr-FR", {
                month: "long",
                year: "numeric"
            });

            document.getElementById("resume-serie").textContent =
                `${nombreObservations} observations reçues par le serveur — ` +
                `MM3 de ${moisAnnee} : ${derniereMM3.toFixed(3)}`;
            // 6. Afficher les résultats reçus du serveur
            console.log("Résultat reçu de Flask :", resultat);

            // 7. Afficher le bilan de l'importation
            const bilan = erreurs.length === 0
                ? `${observations.length} observations importées`
                : `${observations.length} observations importées, ${erreurs.length} lignes rejetées`;

            afficherMessage(
                [
                    bilan,
                    ...erreurs.slice(0, 5)
                ].join("\n"),

                erreurs.length > 0
                    ? "erreur"
                    : "succes"
            );

        } catch (e) {

            afficherMessage(e.message, "erreur");

        }
    });
