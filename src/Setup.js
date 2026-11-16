/**
 * Setup.js — Initialisation du classeur et jeu de démonstration.
 *
 * Fonctions publiques (à lancer depuis l'éditeur Apps Script ou le menu « Hub tickets ») :
 *   - setupSheets()   : crée / remet en forme les feuilles Tickets et Référentiels (idempotent).
 *   - seedDemoData()  : insère ~25 tickets fictifs (refuse si la feuille contient déjà des tickets).
 *   - resetDemo()     : vide la feuille Tickets puis rejoue le seed (refuse s'il y a des vraies données).
 *
 * Rappel Apps Script : pas de modules ES. Toutes les constantes et fonctions ci-dessous sont
 * globales et seront visibles depuis Repository.js et Code.js. Les fonctions suffixées par « _ »
 * sont « privées » : elles n'apparaissent pas dans la liste « Exécuter » de l'éditeur et ne
 * peuvent pas être appelées par google.script.run depuis le navigateur.
 */

// ============================================================================
// Constantes du modèle de données (partagées par tous les fichiers)
// ============================================================================

const SHEET_TICKETS = 'Tickets';
const SHEET_REFS = 'Référentiels';

/** En-têtes de la feuille Tickets, dans l'ordre des colonnes. */
const TICKET_HEADERS = [
  'ID', 'Créé le', 'Titre', 'Description', 'Catégorie', 'Priorité',
  'Demandeur', 'Assigné à', 'Statut', 'Mis à jour le', 'Motif',
];

/** Numéros de colonnes (base 1, comme getRange). Doit rester aligné sur TICKET_HEADERS. */
const COL = Object.freeze({
  ID: 1, CREE_LE: 2, TITRE: 3, DESCRIPTION: 4, CATEGORIE: 5, PRIORITE: 6,
  DEMANDEUR: 7, ASSIGNE: 8, STATUT: 9, MAJ_LE: 10, MOTIF: 11,
});

/** Colonnes de la feuille Référentiels. */
const REF_HEADERS = ['Personnes', 'Catégories', 'Statuts', 'Priorités'];
const REF_COL = Object.freeze({ PERSONNES: 1, CATEGORIES: 2, STATUTS: 3, PRIORITES: 4 });

/** Listes fermées du modèle : le code en dépend, elles ne sont pas « métier ». */
const STATUTS = ['À valider', 'Validé', 'En cours', 'Bloqué', 'Terminé', 'Rejeté'];
const STATUTS_AVEC_MOTIF = ['Bloqué', 'Rejeté'];
const PRIORITES = ['Haute', 'Moyenne', 'Basse'];

/** Marqueur des données de test : sert aussi à afficher le bandeau « Données de démonstration ». */
const DEMO_PREFIX = '[DÉMO]';
const DATE_FORMAT = 'dd/MM/yyyy HH:mm';

/** Référentiels « métier » de démonstration (personnes et catégories fictives). */
const DEMO_PERSONNES = ['Inès Marchal', 'Théo Rivière', 'Léa Bonnet', 'Malik Durand'];
const DEMO_CATEGORIES = ['Données', 'Automatisation', 'Support', 'Formation'];

// ============================================================================
// Menu dans le Google Sheet
// ============================================================================

/** Déclencheur simple : ajoute un menu « Hub tickets » à l'ouverture du classeur. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Hub tickets')
    .addItem('Initialiser les feuilles', 'setupSheets')
    .addSeparator()
    .addItem('Réinitialiser la démo…', 'menuResetDemo')
    .addToUi();
}

/** Version « menu » de resetDemo : demande confirmation et affiche les erreurs proprement. */
function menuResetDemo() {
  const ui = SpreadsheetApp.getUi();
  const reponse = ui.alert(
    'Réinitialiser la démo',
    'Tous les tickets de démonstration vont être supprimés puis recréés. Continuer ?',
    ui.ButtonSet.YES_NO
  );
  if (reponse !== ui.Button.YES) return;
  try {
    resetDemo();
    ui.alert('Jeu de démonstration recréé.');
  } catch (e) {
    ui.alert('Réinitialisation impossible', e.message, ui.ButtonSet.OK);
  }
}

// ============================================================================
// setupSheets : structure, référentiels, validations
// ============================================================================

/**
 * Crée ou remet en forme les deux feuilles. Idempotent : on peut la relancer sans risque,
 * elle ne touche jamais aux tickets existants ni aux personnes / catégories déjà saisies.
 */
function setupSheets() {
  const ss = SpreadsheetApp.getActive();
  const refs = getOrCreateSheet_(ss, SHEET_REFS);
  const tickets = getOrCreateSheet_(ss, SHEET_TICKETS);

  setupReferentiels_(refs);
  setupTickets_(tickets, refs);
  removeDefaultSheet_(ss);

  // Tickets en premier onglet, c'est la feuille de travail principale.
  ss.setActiveSheet(tickets);
  ss.moveActiveSheet(1);
  SpreadsheetApp.flush();
  Logger.log('setupSheets terminé : feuilles « %s » et « %s » prêtes.', SHEET_TICKETS, SHEET_REFS);
}

function setupReferentiels_(sh) {
  sh.getRange(1, 1, 1, REF_HEADERS.length).setValues([REF_HEADERS]);
  styleHeader_(sh, REF_HEADERS.length);

  // Listes du modèle : toujours réécrites, car le code (cycle de vie, tailles du graphe) en dépend.
  writeColumn_(sh, REF_COL.STATUTS, STATUTS);
  writeColumn_(sh, REF_COL.PRIORITES, PRIORITES);

  // Listes métier : remplies seulement si vides, pour ne jamais écraser de vraies données.
  if (isColumnEmpty_(sh, REF_COL.PERSONNES)) writeColumn_(sh, REF_COL.PERSONNES, DEMO_PERSONNES);
  if (isColumnEmpty_(sh, REF_COL.CATEGORIES)) writeColumn_(sh, REF_COL.CATEGORIES, DEMO_CATEGORIES);

  sh.setColumnWidths(1, REF_HEADERS.length, 180);
}

function setupTickets_(sh, refs) {
  sh.getRange(1, 1, 1, TICKET_HEADERS.length).setValues([TICKET_HEADERS]);
  styleHeader_(sh, TICKET_HEADERS.length);

  const nbLignes = sh.getMaxRows() - 1;
  const colonne = (col) => sh.getRange(2, col, nbLignes, 1);

  // Liste déroulante qui pointe sur une colonne de Référentiels (plage ouverte jusqu'en bas) :
  // ajouter une personne dans Référentiels l'ajoute automatiquement à la liste.
  // C'est l'équivalent tableur d'une clé étrangère (intégrité référentielle à la saisie).
  const listeDepuis = (refCol) => SpreadsheetApp.newDataValidation()
    .requireValueInRange(refs.getRange(2, refCol, refs.getMaxRows() - 1, 1), true)
    .setAllowInvalid(false)
    .setHelpText('Choisir une valeur définie dans la feuille Référentiels.')
    .build();

  colonne(COL.CATEGORIE).setDataValidation(listeDepuis(REF_COL.CATEGORIES));
  colonne(COL.PRIORITE).setDataValidation(listeDepuis(REF_COL.PRIORITES));
  colonne(COL.DEMANDEUR).setDataValidation(listeDepuis(REF_COL.PERSONNES));
  colonne(COL.ASSIGNE).setDataValidation(listeDepuis(REF_COL.PERSONNES));
  colonne(COL.STATUT).setDataValidation(listeDepuis(REF_COL.STATUTS));

  const dateValide = SpreadsheetApp.newDataValidation()
    .requireDate()
    .setAllowInvalid(false)
    .setHelpText('Date attendue (jj/mm/aaaa hh:mm).')
    .build();
  [COL.CREE_LE, COL.MAJ_LE].forEach((col) => {
    colonne(col).setDataValidation(dateValide).setNumberFormat(DATE_FORMAT);
  });

  colonne(COL.DESCRIPTION).setWrap(true);
  colonne(COL.MOTIF).setWrap(true);

  // Mise en forme conditionnelle : signaler (sans bloquer) les lignes saisies à la main incomplètes.
  // Les formules de l'API s'écrivent toujours en syntaxe anglaise (virgules), quel que soit le paramètre régional.
  // Colonnes : A = ID, C = Titre, I = Statut, K = Motif.
  const rouge = '#F8D7D5';
  const motifManquant = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND(OR($I2="Bloqué",$I2="Rejeté"),$K2="")')
    .setBackground(rouge)
    .setRanges([colonne(COL.MOTIF)])
    .build();
  const idManquant = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($C2<>"",$A2="")')
    .setBackground(rouge)
    .setRanges([colonne(COL.ID)])
    .build();
  sh.setConditionalFormatRules([motifManquant, idManquant]); // remplace les règles : idempotent

  //            ID  Créé  Titre Desc Cat  Prio Dem  Assi Stat MàJ  Motif
  const largeurs = [80, 130, 280, 380, 130, 90, 130, 130, 100, 130, 260];
  largeurs.forEach((px, i) => sh.setColumnWidth(i + 1, px));
}

// ============================================================================
// seedDemoData / resetDemo
// ============================================================================

/** Insère le jeu de démonstration. Refuse si la feuille contient déjà des tickets. */
function seedDemoData() {
  const sh = getSheetOrThrow_(SHEET_TICKETS);
  if (sh.getLastRow() > 1) {
    throw new Error('La feuille Tickets contient déjà des données. Utilisez resetDemo() pour repartir du jeu de démonstration.');
  }
  const lignes = buildDemoRows_(new Date());
  // Une seule écriture groupée : chaque appel au Sheet est un aller-retour réseau coûteux.
  sh.getRange(2, 1, lignes.length, TICKET_HEADERS.length).setValues(lignes);
  Logger.log('%s tickets de démonstration insérés.', lignes.length);
}

/**
 * Vide la feuille Tickets puis rejoue le seed.
 * Garde-fou : refuse si une ligne non vide ne commence pas par [DÉMO] (vraies données présentes).
 */
function resetDemo() {
  const sh = getSheetOrThrow_(SHEET_TICKETS);
  const derniereLigne = sh.getLastRow();
  if (derniereLigne > 1) {
    const plage = sh.getRange(2, 1, derniereLigne - 1, TICKET_HEADERS.length);
    const nonDemo = plage.getValues().filter((ligne) =>
      ligne.join('') !== '' && !String(ligne[COL.DESCRIPTION - 1]).startsWith(DEMO_PREFIX)
    ).length;
    if (nonDemo > 0) {
      throw new Error(`resetDemo annulé : ${nonDemo} ticket(s) ne sont pas des données de démonstration.`);
    }
    plage.clearContent(); // clearContent conserve les validations et les formats
  }
  seedDemoData();
}

/**
 * Construit les lignes du jeu de test. Les dates sont relatives à « maintenant » :
 * la démo reste crédible (KPI « terminés sur 30 jours », « plus anciens »…) quel que soit le jour.
 * Les IDs sont attribués par ordre de création, comme le ferait l'application.
 */
function buildDemoRows_(maintenant) {
  const ilYa = (jours, heure) => {
    const d = new Date(maintenant.getTime());
    d.setDate(d.getDate() - jours);
    d.setHours(heure, 0, 0, 0);
    return d;
  };
  return getDemoTickets_()
    .sort((a, b) => b.cree - a.cree) // du plus ancien au plus récent
    .map((t, i) => [
      formatTicketId_(i + 1),
      ilYa(t.cree, 9 + (i % 4)),  // créé le matin (9 h – 12 h)…
      t.titre,
      `${DEMO_PREFIX} ${t.desc}`,
      t.cat,
      t.prio,
      t.dem,
      t.ass,
      t.statut,
      ilYa(t.maj, 14 + (i % 4)),  // …mis à jour l'après-midi : jamais avant la création
      t.motif || '',
    ]);
}

/** Formate un numéro en ID ticket : 7 → « TK-007 ». Réutilisé par Repository.js. */
function formatTicketId_(n) {
  return 'TK-' + String(n).padStart(3, '0');
}

/**
 * 25 tickets fictifs : 5 À valider, 4 Validé, 6 En cours, 3 Bloqué, 5 Terminé, 2 Rejeté.
 * cree / maj = nombre de jours avant aujourd'hui.
 */
function getDemoTickets_() {
  const [INES, THEO, LEA, MALIK] = DEMO_PERSONNES;
  const [DON, AUTO, SUP, FORM] = DEMO_CATEGORIES;
  return [
    // --- Terminé
    { titre: 'Export mensuel des indicateurs qualité', desc: 'Préparer un export mensuel des indicateurs pour le comité qualité.', cat: DON, prio: 'Moyenne', dem: LEA, ass: INES, statut: 'Terminé', cree: 58, maj: 40 },
    { titre: 'Script de relance automatique des validations', desc: 'Relancer par e-mail les valideurs après 3 jours sans réponse.', cat: AUTO, prio: 'Haute', dem: INES, ass: THEO, statut: 'Terminé', cree: 45, maj: 21 },
    { titre: 'Accès refusé au dossier partagé Projets', desc: 'Un nouvel arrivant ne peut pas ouvrir le dossier partagé.', cat: SUP, prio: 'Haute', dem: MALIK, ass: LEA, statut: 'Terminé', cree: 20, maj: 18 },
    { titre: 'Support de formation Google Sheets — niveau 1', desc: 'Rédiger un support d\'initiation (filtres, tris, validations).', cat: FORM, prio: 'Basse', dem: THEO, ass: MALIK, statut: 'Terminé', cree: 34, maj: 12 },
    { titre: 'Nettoyage des doublons du fichier fournisseurs', desc: 'Identifier et fusionner les fournisseurs saisis en double.', cat: DON, prio: 'Moyenne', dem: INES, ass: LEA, statut: 'Terminé', cree: 15, maj: 5 },
    // --- Rejeté
    { titre: 'Migration complète vers un nouvel outil de BI', desc: 'Remplacer l\'ensemble des tableaux existants par un outil de BI.', cat: DON, prio: 'Basse', dem: THEO, ass: INES, statut: 'Rejeté', cree: 50, maj: 44, motif: 'Hors périmètre : nécessite un budget et une validation de la direction.' },
    { titre: 'Formulaire de demande de congés en double', desc: 'Créer un second formulaire de congés pour l\'équipe support.', cat: AUTO, prio: 'Moyenne', dem: LEA, ass: THEO, statut: 'Rejeté', cree: 12, maj: 10, motif: 'Doublon d\'une demande déjà traitée.' },
    // --- Bloqué
    { titre: 'Connexion du tableau de bord à la base RH', desc: 'Alimenter le tableau de bord avec les effectifs par service.', cat: DON, prio: 'Haute', dem: INES, ass: THEO, statut: 'Bloqué', cree: 30, maj: 9, motif: 'En attente des droits d\'accès en lecture côté RH.' },
    { titre: 'Automatiser l\'envoi du rapport hebdomadaire', desc: 'Envoyer chaque lundi un PDF du rapport aux responsables.', cat: AUTO, prio: 'Moyenne', dem: MALIK, ass: INES, statut: 'Bloqué', cree: 22, maj: 6, motif: 'Quota d\'envoi d\'e-mails atteint, arbitrage en cours.' },
    { titre: 'Atelier « Bonnes pratiques Drive » pour l\'équipe', desc: 'Animer un atelier d\'une heure sur le rangement et le partage.', cat: FORM, prio: 'Basse', dem: LEA, ass: MALIK, statut: 'Bloqué', cree: 18, maj: 14, motif: 'Salle et date non confirmées.' },
    // --- En cours
    { titre: 'Tableau de suivi des demandes d\'achat', desc: 'Centraliser les demandes d\'achat et leur état d\'avancement.', cat: DON, prio: 'Haute', dem: THEO, ass: LEA, statut: 'En cours', cree: 26, maj: 2 },
    { titre: 'Modèle de compte rendu de réunion', desc: 'Générer automatiquement un document de compte rendu pré-rempli.', cat: AUTO, prio: 'Basse', dem: INES, ass: MALIK, statut: 'En cours', cree: 16, maj: 3 },
    { titre: 'Problème de synchronisation Drive sur un poste', desc: 'Les fichiers modifiés hors ligne ne remontent plus.', cat: SUP, prio: 'Haute', dem: MALIK, ass: THEO, statut: 'En cours', cree: 6, maj: 1 },
    { titre: 'Guide : partager un fichier en lecture seule', desc: 'Fiche pas à pas avec captures d\'écran.', cat: FORM, prio: 'Moyenne', dem: THEO, ass: LEA, statut: 'En cours', cree: 11, maj: 4 },
    { titre: 'Consolidation des fichiers de planning', desc: 'Regrouper les plannings des trois équipes dans un seul fichier.', cat: DON, prio: 'Moyenne', dem: LEA, ass: INES, statut: 'En cours', cree: 9, maj: 2 },
    { titre: 'Alerte automatique sur les échéances dépassées', desc: 'Notifier le responsable quand une échéance est dépassée.', cat: AUTO, prio: 'Haute', dem: INES, ass: THEO, statut: 'En cours', cree: 13, maj: 1 },
    // --- Validé
    { titre: 'Mise à jour de la liste de diffusion', desc: 'Retirer les départs et ajouter les nouveaux arrivants.', cat: SUP, prio: 'Basse', dem: MALIK, ass: LEA, statut: 'Validé', cree: 8, maj: 7 },
    { titre: 'Fusion de deux onglets de suivi budgétaire', desc: 'Les onglets « Prévu » et « Réalisé » doivent être rapprochés.', cat: DON, prio: 'Moyenne', dem: THEO, ass: INES, statut: 'Validé', cree: 7, maj: 5 },
    { titre: 'Prise en main du nouveau tableau de bord', desc: 'Session de 30 minutes pour présenter le tableau de bord.', cat: FORM, prio: 'Moyenne', dem: INES, ass: MALIK, statut: 'Validé', cree: 5, maj: 4 },
    { titre: 'Imprimante réseau introuvable', desc: 'L\'imprimante du 2e étage n\'apparaît plus dans la liste.', cat: SUP, prio: 'Moyenne', dem: LEA, ass: THEO, statut: 'Validé', cree: 4, maj: 3 },
    // --- À valider
    { titre: 'Ajouter un champ « Service » aux demandes', desc: 'Permettre de filtrer les demandes par service.', cat: AUTO, prio: 'Basse', dem: MALIK, ass: INES, statut: 'À valider', cree: 3, maj: 3 },
    { titre: 'Graphique d\'évolution des délais de traitement', desc: 'Suivre le délai moyen entre création et clôture.', cat: DON, prio: 'Moyenne', dem: THEO, ass: LEA, statut: 'À valider', cree: 2, maj: 2 },
    { titre: 'Réinitialiser l\'accès à l\'agenda partagé', desc: 'Les droits de modification de l\'agenda d\'équipe ont disparu.', cat: SUP, prio: 'Haute', dem: LEA, ass: MALIK, statut: 'À valider', cree: 1, maj: 1 },
    { titre: 'Tutoriel vidéo sur les filtres Sheets', desc: 'Vidéo courte (5 min) sur les vues filtrées.', cat: FORM, prio: 'Basse', dem: INES, ass: THEO, statut: 'À valider', cree: 1, maj: 1 },
    { titre: 'Automatiser l\'archivage des tickets terminés', desc: 'Déplacer les tickets terminés depuis plus de 90 jours.', cat: AUTO, prio: 'Moyenne', dem: MALIK, ass: LEA, statut: 'À valider', cree: 0, maj: 0 },
  ];
}

// ============================================================================
// Utilitaires
// ============================================================================

function getOrCreateSheet_(ss, nom) {
  return ss.getSheetByName(nom) || ss.insertSheet(nom);
}

function getSheetOrThrow_(nom) {
  const sh = SpreadsheetApp.getActive().getSheetByName(nom);
  if (!sh) throw new Error(`Feuille « ${nom} » introuvable : lancez d'abord setupSheets().`);
  return sh;
}

/** En-tête bleu marine, texte blanc, ligne figée. */
function styleHeader_(sh, nbColonnes) {
  sh.getRange(1, 1, 1, nbColonnes)
    .setBackground('#0B1F4B')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setVerticalAlignment('middle');
  sh.setFrozenRows(1);
  sh.setRowHeight(1, 32);
}

/** Remplace le contenu d'une colonne (sous l'en-tête) par une liste de valeurs. */
function writeColumn_(sh, col, valeurs) {
  sh.getRange(2, col, sh.getMaxRows() - 1, 1).clearContent();
  sh.getRange(2, col, valeurs.length, 1).setValues(valeurs.map((v) => [v]));
}

function isColumnEmpty_(sh, col) {
  return sh.getRange(2, col, sh.getMaxRows() - 1, 1).getValues().every(([v]) => v === '');
}

/** Supprime l'onglet créé par défaut (« Feuille 1 » / « Sheet1 ») s'il est vide. */
function removeDefaultSheet_(ss) {
  ['Feuille 1', 'Feuille1', 'Sheet1'].forEach((nom) => {
    const sh = ss.getSheetByName(nom);
    if (sh && sh.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sh);
  });
}
