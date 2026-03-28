export const communicationPage = {
  eyebrow: 'Kommunikationskategorie',
  title: 'Echtzeitkommunikation',
  description:
    'Eine kurze Referenz fuer Kollaborationsbausteine, sobald mehrere Clients denselben Zustand teilen muessen.',
  intro:
    'Nutze diese Seite als Vorlagenbaustein, wenn du Transportwege mit geteiltem Zustand vergleichen willst. WebSockets bewegen Ereignisse schnell, CRDTs halten Replikate trotz paralleler Bearbeitungen konsistent.',
  sections: {
    websockets: {
      eyebrow: 'Kommunikationsthema',
      title: 'WebSockets',
      summary:
        'WebSockets halten eine langlebige Verbindung offen, damit Clients und Server Ereignisse mit geringer Latenz ohne wiederholten Request-Aufbau austauschen koennen.',
      bullets: [
        'Hilfreich fuer Presence, Chat, kollaborative Cursor und Streaming-Updates.',
        'Die meisten Apps brauchen Verbindungsmanagement, Auth-Aktualisierung, Heartbeats und Reconnect-Zustaende.',
        'Kleine Event-Payloads lassen sich in der UI einfacher inkrementell zusammenfuehren.',
      ],
    },
    crdts: {
      eyebrow: 'Kommunikationsthema',
      title: 'CRDTs',
      summary:
        'CRDTs erlauben gleichzeitige Bearbeitungen auf mehreren Clients und fuehren trotzdem zum selben Endzustand ohne zentrale Sperrschritte.',
      bullets: [
        'Hilfreich, wenn Zusammenarbeit auch bei Offline-Phasen oder instabiler Verbindung weiterlaufen muss.',
        'Die meisten Apps speichern Operationen lokal und synchronisieren sie spaeter zurueck.',
        'Konfliktaufloesung liegt in der Datenstruktur statt in spontaner Merge-Logik der UI.',
      ],
    },
  },
};
