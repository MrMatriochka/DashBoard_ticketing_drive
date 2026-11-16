/**
 * Code.js — Points d'entrée de la web app.
 */

/** Temporaire (étape 2) : affiche le JSON de getTickets() ; remplacé par la page HtmlService à l'étape 3. */
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify(getTickets(), null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}
