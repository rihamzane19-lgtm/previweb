import math
import pandas as pd
from flask import Flask, jsonify, render_template, request

# Création de l'application Flask
app = Flask(__name__)


# Conversion des données JSON en série temporelle Pandas
def serie_depuis_json(payload):
    """Convertit les observations JSON en Series Pandas triée par date."""

    donnees = payload.get("donnees") if payload else None

    if not donnees or len(donnees) < 3:
        raise ValueError("Il faut au moins 3 observations.")

    df = pd.DataFrame(donnees)

    df["date"] = pd.to_datetime(df["date"], format="%Y-%m-%d")

    df["valeur"] = pd.to_numeric(df["valeur"])

    return df.sort_values("date").set_index("date")["valeur"]


# Conversion des valeurs en liste compatible avec JSON
def liste(valeurs):
    """Remplace NaN par None et arrondit les valeurs à 3 décimales."""

    return [None if math.isnan(v) else round(float(v), 3) for v in valeurs]


# Route principale : afficher la page HTML
@app.route("/")
def index():
    return render_template("index.html")


# ==================================================
# PARTIE B1 — API FLASK ET MOYENNE MOBILE MM3
# ==================================================


@app.post("/api/analyse")
def analyse():

    # 1. Recevoir les données JSON envoyées par JavaScript
    payload = request.get_json(silent=True)

    try:
        # 2. Convertir les données en série temporelle Pandas
        y = serie_depuis_json(payload)

    except (ValueError, KeyError) as e:
        # En cas d'erreur, retourner une réponse HTTP 400
        return jsonify({"erreur": str(e)}), 400

    # 3. Calculer la moyenne mobile sur 3 périodes
    moyenne_mobile = y.rolling(window=3).mean()

    # 4. Préparer la réponse JSON
    return jsonify(
        {
            "dates": [d.strftime("%Y-%m-%d") for d in y.index],
            "valeurs": liste(y.tolist()),
            "moyenne_mobile": liste(moyenne_mobile.tolist()),
        }
    )


# Lancement du serveur
if __name__ == "__main__":
    app.run(debug=True)
