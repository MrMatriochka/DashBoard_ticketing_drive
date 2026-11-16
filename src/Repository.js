/**
 * Repository.js — Lecture du Sheet (couche d'accès aux données).
 * Réutilise les constantes globales de Setup.js (COL, STATUTS, REF_COL…).
 */

/**
 * Convertit une ligne de la feuille Tickets en objet sérialisable.
 * Fonction pure (aucun accès au Sheet) : testée en local dans tests/Repository.test.js.
 * @param {any[]} valeurs  les 11 cellules de la ligne, telles que renvoyées par getValues()
 * @param {number} ligne   numéro de ligne dans le Sheet : repère du ticket même sans ID
 * @return {Object|null}   null pour une ligne entièrement vide
 */
function ligneVersTicket_(valeurs, ligne) {
  const texte = (col) => String(valeurs[col - 1]).trim();
  if (valeurs.every((v) => String(v).trim() === '')) return null;

  const t = {
    ligne,
    id: texte(COL.ID) || null,
    creeLe: dateIso_(valeurs[COL.CREE_LE - 1]),
    titre: texte(COL.TITRE),
    description: texte(COL.DESCRIPTION),
    categorie: texte(COL.CATEGORIE),
    priorite: texte(COL.PRIORITE),
    demandeur: texte(COL.DEMANDEUR),
    assigne: texte(COL.ASSIGNE),
    statut: texte(COL.STATUT),
    majLe: dateIso_(valeurs[COL.MAJ_LE - 1]),
    motif: texte(COL.MOTIF),
    anomalies: [],
  };
  if (!t.id) t.anomalies.push('ID manquant');
  if (!t.creeLe) t.anomalies.push('Date de création manquante ou invalide');
  if (!STATUTS.includes(t.statut)) t.anomalies.push('Statut inconnu');
  if (STATUTS_AVEC_MOTIF.includes(t.statut) && !t.motif) t.anomalies.push('Motif manquant');
  return t;
}

/** Date valide → chaîne ISO ; vide, texte ou nombre (collage) → null. */
function dateIso_(v) {
  return v instanceof Date && !isNaN(v) ? v.toISOString() : null;
}
