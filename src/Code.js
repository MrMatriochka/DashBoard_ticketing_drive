/**
 * Code.js — Points d'entrée de la web app.
 */

/** Sert la page de l'application (Index.html, évalué comme modèle pour exécuter les include()). */
function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Hub tickets')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Insère le contenu d'un autre fichier HTML du projet : <?!= include('Styles') ?>. */
function include(nom) {
  return HtmlService.createHtmlOutputFromFile(nom).getContent();
}
