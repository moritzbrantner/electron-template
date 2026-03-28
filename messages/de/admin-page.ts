export const adminPage = {
  title: 'Admin-Übersicht',
  description:
    'Diese Seite bietet Administratoren eine schnelle Zusammenfassung der verfügbaren Admin-Aktionen.',
  status: {
    allowed: 'Erlaubt',
    denied: 'Nicht erlaubt',
  },
  actions: {
    viewReports: {
      title: 'Berichte ansehen',
      description: 'Betriebs- und Nutzungsberichte aufrufen und prüfen.',
    },
    manageUsers: {
      title: 'Benutzer verwalten',
      description: 'Benutzerkonten erstellen, aktualisieren und deaktivieren.',
    },
    manageSystemSettings: {
      title: 'Systemeinstellungen verwalten',
      description: 'Plattformweite Einstellungen und Admin-Präferenzen aktualisieren.',
    },
  },
};
