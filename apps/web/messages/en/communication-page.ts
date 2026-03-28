export const communicationPage = {
  eyebrow: 'Communication category',
  title: 'Realtime communication',
  description: 'A quick reference for the collaboration primitives that matter once multiple clients must share state.',
  intro:
    'Use this page as a template stub when you need to compare transport choices against shared-state choices. WebSockets move events quickly; CRDTs keep replicas convergent when edits happen concurrently.',
  sections: {
    websockets: {
      eyebrow: 'Communication topic',
      title: 'WebSockets',
      summary:
        'WebSockets keep one long-lived connection open so clients and servers can exchange low-latency events without repeated request setup.',
      bullets: [
        'Useful for presence, chat, collaborative cursors, and streaming updates.',
        'Most apps need connection management, auth refresh, heartbeats, and reconnection state.',
        'Small event payloads are easier to merge incrementally in the UI.',
      ],
    },
    crdts: {
      eyebrow: 'Communication topic',
      title: 'CRDTs',
      summary:
        'CRDTs let multiple clients edit shared state concurrently and still converge on the same result without central lock-step coordination.',
      bullets: [
        'Useful when collaboration must continue through offline periods or unstable connectivity.',
        'Most apps persist operations locally and sync them back once a connection is available.',
        'Conflict resolution moves into the data structure instead of living as ad hoc UI merge logic.',
      ],
    },
  },
};
