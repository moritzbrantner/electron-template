import './index.css';

import type { DocumentState } from '@moritzbrantner/electron-documents/renderer';

import { AppRoute, createNavbar } from './navbar';
import {
  defaultDesktopPreferences,
  resolveThemePreference,
  type DesktopPreferences,
} from './platform/shared/preferences';
import {
  defaultUploadsState,
  type UploadItem,
} from './platform/shared/uploads';

const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');

const defaultDocumentState: DocumentState = {
  content: '',
  displayName: 'Untitled',
  filePath: null,
  isDirty: false,
  lastSavedAt: null,
  recentDocuments: [],
  statusMessage: 'Ready',
};

const appState = {
  documents: defaultDocumentState,
  preferences: defaultDesktopPreferences,
  ready: false,
  uploads: defaultUploadsState,
};

type RegistryAvailability = 'open' | 'limited' | 'offline';

type RegistryUser = {
  id: string;
  name: string;
  handle: string;
  role: string;
  location: string;
  timezone: string;
  trustTier: 'Verified' | 'Established' | 'New';
  availability: RegistryAvailability;
  responseTime: string;
  lastActive: string;
  bio: string;
  skills: string[];
  lookingFor: string[];
};

const registryUsers: RegistryUser[] = [
  {
    id: 'mara-chen',
    name: 'Mara Chen',
    handle: '@maraops',
    role: 'Operations strategist',
    location: 'Singapore',
    timezone: 'UTC+08',
    trustTier: 'Verified',
    availability: 'open',
    responseTime: '~30 min',
    lastActive: '2 minutes ago',
    bio: 'Builds onboarding systems for multi-region communities and keeps volunteer programs from collapsing under scale.',
    skills: ['Onboarding', 'Community ops', 'Playbooks', 'Escalation design'],
    lookingFor: ['Partnership pilots', 'Volunteer leads'],
  },
  {
    id: 'leo-martinez',
    name: 'Leo Martinez',
    handle: '@leoqueries',
    role: 'Search relevance engineer',
    location: 'Austin, US',
    timezone: 'UTC-05',
    trustTier: 'Verified',
    availability: 'limited',
    responseTime: '~4 hrs',
    lastActive: '11 minutes ago',
    bio: 'Tunes ranking models, synonym maps, and moderation-aware retrieval for large member directories.',
    skills: ['Search', 'TypeScript', 'Ranking', 'Analytics'],
    lookingFor: ['Data partners', 'DX feedback'],
  },
  {
    id: 'ayana-okafor',
    name: 'Ayana Okafor',
    handle: '@ayanabuilds',
    role: 'Frontend systems designer',
    location: 'Berlin, DE',
    timezone: 'UTC+02',
    trustTier: 'Established',
    availability: 'open',
    responseTime: '~1 hr',
    lastActive: '25 minutes ago',
    bio: 'Designs interfaces for power users, especially dashboards that need to feel fast under dense operational data.',
    skills: ['Design systems', 'Accessibility', 'CSS', 'Prototyping'],
    lookingFor: ['UX audits', 'Design critiques'],
  },
  {
    id: 'samir-patel',
    name: 'Samir Patel',
    handle: '@samirinfra',
    role: 'Reliability engineer',
    location: 'Toronto, CA',
    timezone: 'UTC-04',
    trustTier: 'Verified',
    availability: 'offline',
    responseTime: 'Tomorrow',
    lastActive: '3 hours ago',
    bio: 'Helps teams harden release pipelines and set service ownership boundaries before incidents force the issue.',
    skills: ['Incident response', 'Observability', 'CI/CD', 'Runbooks'],
    lookingFor: ['Platform reviews', 'Release audits'],
  },
  {
    id: 'ines-fischer',
    name: 'Ines Fischer',
    handle: '@inesgrowth',
    role: 'Marketplace growth lead',
    location: 'Vienna, AT',
    timezone: 'UTC+02',
    trustTier: 'Established',
    availability: 'open',
    responseTime: '~45 min',
    lastActive: '48 minutes ago',
    bio: 'Pairs lifecycle messaging with member segmentation to turn quiet directories into active, trustable networks.',
    skills: ['Growth loops', 'Lifecycle', 'Experiments', 'Segmentation'],
    lookingFor: ['Referral tests', 'Activation experiments'],
  },
  {
    id: 'noah-wright',
    name: 'Noah Wright',
    handle: '@noahdata',
    role: 'Trust and safety analyst',
    location: 'London, UK',
    timezone: 'UTC+01',
    trustTier: 'New',
    availability: 'limited',
    responseTime: '~6 hrs',
    lastActive: '1 hour ago',
    bio: 'Focuses on abuse triage, suspicious behavior signals, and profile-review workflows for member registries.',
    skills: ['Moderation', 'Risk scoring', 'SQL', 'Policy ops'],
    lookingFor: ['Policy feedback', 'Review tooling'],
  },
];

const registryState = {
  availability: 'all' as RegistryAvailability | 'all',
  location: 'all',
  query: '',
  selectedUserId: registryUsers[0]?.id ?? '',
  sort: 'relevance' as 'relevance' | 'alphabetical' | 'activity',
};

function applyTheme(preferences: DesktopPreferences) {
  const theme = resolveThemePreference(preferences.appearance.theme, systemThemeQuery.matches);
  document.documentElement.dataset.theme = theme;
}

function getCurrentRoute(): AppRoute {
  if (window.location.hash === '#/settings') {
    return 'settings';
  }

  if (window.location.hash === '#/documents') {
    return 'documents';
  }

  if (window.location.hash === '#/uploads') {
    return 'uploads';
  }

  return 'home';
}

function createScreenFrame(eyebrowText: string, titleText: string, descriptionText: string) {
  const screen = document.createElement('section');
  screen.className = 'screen';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'screen__eyebrow';
  eyebrow.textContent = eyebrowText;

  const title = document.createElement('h1');
  title.className = 'screen__title';
  title.textContent = titleText;

  const description = document.createElement('p');
  description.className = 'screen__description';
  description.textContent = descriptionText;

  screen.append(eyebrow, title, description);

  return screen;
}

function getRegistryLocations() {
  return ['all', ...new Set(registryUsers.map((user) => user.location))];
}

function getAvailabilityLabel(availability: RegistryAvailability) {
  if (availability === 'open') {
    return 'Open to connect';
  }

  if (availability === 'limited') {
    return 'Limited availability';
  }

  return 'Heads down';
}

function getAvailabilityClassName(availability: RegistryAvailability) {
  return `registry-status registry-status--${availability}`;
}

function getRegistryScore(user: RegistryUser, queryTokens: string[]) {
  if (queryTokens.length === 0) {
    return 0;
  }

  const haystacks = [
    user.name,
    user.handle,
    user.role,
    user.location,
    user.bio,
    user.skills.join(' '),
    user.lookingFor.join(' '),
  ].map((value) => value.toLowerCase());

  return queryTokens.reduce((score, token) => {
    if (haystacks[0].includes(token)) {
      return score + 5;
    }

    if (haystacks[1].includes(token) || haystacks[2].includes(token)) {
      return score + 4;
    }

    if (haystacks[5].includes(token) || haystacks[6].includes(token)) {
      return score + 3;
    }

    if (haystacks[3].includes(token) || haystacks[4].includes(token)) {
      return score + 2;
    }

    return score;
  }, 0);
}

function getFilteredRegistryUsers() {
  const queryTokens = registryState.query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  const filteredUsers = registryUsers.filter((user) => {
    if (registryState.availability !== 'all' && user.availability !== registryState.availability) {
      return false;
    }

    if (registryState.location !== 'all' && user.location !== registryState.location) {
      return false;
    }

    if (queryTokens.length === 0) {
      return true;
    }

    return getRegistryScore(user, queryTokens) > 0;
  });

  filteredUsers.sort((left, right) => {
    if (registryState.sort === 'alphabetical') {
      return left.name.localeCompare(right.name);
    }

    if (registryState.sort === 'activity') {
      const leftIsOpen = left.availability === 'open' ? 1 : 0;
      const rightIsOpen = right.availability === 'open' ? 1 : 0;

      if (leftIsOpen !== rightIsOpen) {
        return rightIsOpen - leftIsOpen;
      }

      return left.name.localeCompare(right.name);
    }

    const leftScore = getRegistryScore(left, queryTokens);
    const rightScore = getRegistryScore(right, queryTokens);

    if (leftScore !== rightScore) {
      return rightScore - leftScore;
    }

    if (left.availability !== right.availability) {
      return left.availability === 'open' ? -1 : 1;
    }

    return left.name.localeCompare(right.name);
  });

  return filteredUsers;
}

function createRegistryStat(label: string, value: string) {
  const stat = document.createElement('article');
  stat.className = 'registry-stat';

  const number = document.createElement('strong');
  number.textContent = value;

  const text = document.createElement('span');
  text.textContent = label;

  stat.append(number, text);
  return stat;
}

function createRegistryPill(text: string) {
  const pill = document.createElement('span');
  pill.className = 'registry-pill';
  pill.textContent = text;
  return pill;
}

function createRegistryInputLabel(labelText: string, input: HTMLElement) {
  const label = document.createElement('label');
  label.className = 'registry-filter';

  const text = document.createElement('span');
  text.className = 'registry-filter__label';
  text.textContent = labelText;

  label.append(text, input);
  return label;
}

function createHomeScreen() {
  const screen = createScreenFrame(
    'Directory search',
    'Search the user registry',
    'Browse other members by name, role, skill, or location, then drill into the people who look relevant before you reach out.',
  );

  const filteredUsers = getFilteredRegistryUsers();
  const selectedUser =
    filteredUsers.find((user) => user.id === registryState.selectedUserId) ?? filteredUsers[0] ?? null;

  if (selectedUser) {
    registryState.selectedUserId = selectedUser.id;
  }

  const hero = document.createElement('section');
  hero.className = 'registry-hero';

  const controlPanel = document.createElement('div');
  controlPanel.className = 'registry-panel';

  const formTitle = document.createElement('h2');
  formTitle.textContent = 'Find the right person fast';

  const formBody = document.createElement('p');
  formBody.className = 'registry-panel__body';
  formBody.textContent =
    'Use the search bar for names, roles, or skills, then narrow the list by location and current availability.';

  const controls = document.createElement('div');
  controls.className = 'registry-controls';

  const searchInput = document.createElement('input');
  searchInput.className = 'registry-input registry-input--search';
  searchInput.type = 'search';
  searchInput.placeholder = 'Search “search”, “Berlin”, “design systems”…';
  searchInput.value = registryState.query;
  searchInput.addEventListener('input', () => {
    registryState.query = searchInput.value;
    renderApp();
  });

  const locationSelect = document.createElement('select');
  locationSelect.className = 'registry-input';
  getRegistryLocations().forEach((location) => {
    const option = document.createElement('option');
    option.value = location;
    option.textContent = location === 'all' ? 'All locations' : location;
    option.selected = location === registryState.location;
    locationSelect.append(option);
  });
  locationSelect.addEventListener('change', () => {
    registryState.location = locationSelect.value;
    renderApp();
  });

  const availabilitySelect = document.createElement('select');
  availabilitySelect.className = 'registry-input';
  [
    ['all', 'Any availability'],
    ['open', 'Open to connect'],
    ['limited', 'Limited availability'],
    ['offline', 'Heads down'],
  ].forEach(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    option.selected = value === registryState.availability;
    availabilitySelect.append(option);
  });
  availabilitySelect.addEventListener('change', () => {
    registryState.availability = availabilitySelect.value as RegistryAvailability | 'all';
    renderApp();
  });

  const sortSelect = document.createElement('select');
  sortSelect.className = 'registry-input';
  [
    ['relevance', 'Best match'],
    ['activity', 'Most available'],
    ['alphabetical', 'Alphabetical'],
  ].forEach(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    option.selected = value === registryState.sort;
    sortSelect.append(option);
  });
  sortSelect.addEventListener('change', () => {
    registryState.sort = sortSelect.value as typeof registryState.sort;
    renderApp();
  });

  controls.append(
    createRegistryInputLabel('Search', searchInput),
    createRegistryInputLabel('Location', locationSelect),
    createRegistryInputLabel('Availability', availabilitySelect),
    createRegistryInputLabel('Sort', sortSelect),
  );

  controlPanel.append(formTitle, formBody, controls);

  const statPanel = document.createElement('div');
  statPanel.className = 'registry-panel registry-panel--stats';

  const openCount = filteredUsers.filter((user) => user.availability === 'open').length;
  const verifiedCount = filteredUsers.filter((user) => user.trustTier === 'Verified').length;
  const skillCount = new Set(filteredUsers.flatMap((user) => user.skills)).size;

  statPanel.append(
    createRegistryStat('matching members', String(filteredUsers.length)),
    createRegistryStat('open right now', String(openCount)),
    createRegistryStat('verified profiles', String(verifiedCount)),
    createRegistryStat('skills covered', String(skillCount)),
  );

  hero.append(controlPanel, statPanel);

  const resultsLayout = document.createElement('section');
  resultsLayout.className = 'registry-results-layout';

  const resultsColumn = document.createElement('div');
  resultsColumn.className = 'registry-results';

  const resultsHeader = document.createElement('div');
  resultsHeader.className = 'registry-results__header';

  const resultsTitle = document.createElement('h2');
  resultsTitle.textContent = filteredUsers.length === 1 ? '1 result' : `${filteredUsers.length} results`;

  const resultsCopy = document.createElement('p');
  resultsCopy.textContent =
    selectedUser === null
      ? 'Adjust the filters to widen the search.'
      : `Top match: ${selectedUser.name} in ${selectedUser.location}.`;

  resultsHeader.append(resultsTitle, resultsCopy);

  const resultsList = document.createElement('div');
  resultsList.className = 'registry-results__list';

  if (filteredUsers.length === 0) {
    const emptyState = document.createElement('article');
    emptyState.className = 'registry-empty-state';

    const emptyTitle = document.createElement('h3');
    emptyTitle.textContent = 'No members matched this search';

    const emptyBody = document.createElement('p');
    emptyBody.textContent =
      'Try a broader skill keyword, remove a location filter, or switch availability back to any.';

    emptyState.append(emptyTitle, emptyBody);
    resultsList.append(emptyState);
  } else {
    filteredUsers.forEach((user) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = user.id === registryState.selectedUserId ? 'registry-card is-selected' : 'registry-card';
      card.addEventListener('click', () => {
        registryState.selectedUserId = user.id;
        renderApp();
      });

      const cardTop = document.createElement('div');
      cardTop.className = 'registry-card__top';

      const identity = document.createElement('div');
      identity.className = 'registry-card__identity';

      const name = document.createElement('strong');
      name.textContent = user.name;

      const role = document.createElement('span');
      role.textContent = `${user.role} · ${user.handle}`;

      identity.append(name, role);
      cardTop.append(identity);

      const status = document.createElement('span');
      status.className = getAvailabilityClassName(user.availability);
      status.textContent = getAvailabilityLabel(user.availability);
      cardTop.append(status);

      const bio = document.createElement('p');
      bio.className = 'registry-card__bio';
      bio.textContent = user.bio;

      const meta = document.createElement('div');
      meta.className = 'registry-card__meta';
      [user.location, user.timezone, user.trustTier, `Responds ${user.responseTime}`].forEach((text) => {
        meta.append(createRegistryPill(text));
      });

      const skills = document.createElement('div');
      skills.className = 'registry-card__skills';
      user.skills.slice(0, 3).forEach((skill) => {
        skills.append(createRegistryPill(skill));
      });

      card.append(cardTop, bio, meta, skills);
      resultsList.append(card);
    });
  }

  resultsColumn.append(resultsHeader, resultsList);

  const detailPanel = document.createElement('aside');
  detailPanel.className = 'registry-detail';

  if (!selectedUser) {
    const emptyDetail = document.createElement('p');
    emptyDetail.className = 'registry-panel__body';
    emptyDetail.textContent = 'Pick a result to inspect the member profile.';
    detailPanel.append(emptyDetail);
  } else {
    const detailHeader = document.createElement('div');
    detailHeader.className = 'registry-detail__header';

    const detailIdentity = document.createElement('div');

    const detailName = document.createElement('h2');
    detailName.textContent = selectedUser.name;

    const detailRole = document.createElement('p');
    detailRole.className = 'registry-panel__body';
    detailRole.textContent = `${selectedUser.role} · ${selectedUser.handle}`;

    detailIdentity.append(detailName, detailRole);

    const detailStatus = document.createElement('span');
    detailStatus.className = getAvailabilityClassName(selectedUser.availability);
    detailStatus.textContent = getAvailabilityLabel(selectedUser.availability);

    detailHeader.append(detailIdentity, detailStatus);

    const detailBio = document.createElement('p');
    detailBio.className = 'registry-detail__bio';
    detailBio.textContent = selectedUser.bio;

    const detailMeta = document.createElement('div');
    detailMeta.className = 'registry-detail__meta';

    [
      ['Location', selectedUser.location],
      ['Timezone', selectedUser.timezone],
      ['Trust tier', selectedUser.trustTier],
      ['Typical response', selectedUser.responseTime],
      ['Last active', selectedUser.lastActive],
    ].forEach(([label, value]) => {
      const row = document.createElement('div');
      row.className = 'registry-detail__row';

      const rowLabel = document.createElement('span');
      rowLabel.textContent = label;

      const rowValue = document.createElement('strong');
      rowValue.textContent = value;

      row.append(rowLabel, rowValue);
      detailMeta.append(row);
    });

    const skillsSection = document.createElement('div');
    skillsSection.className = 'registry-detail__section';

    const skillsTitle = document.createElement('h3');
    skillsTitle.textContent = 'Skills';

    const skillList = document.createElement('div');
    skillList.className = 'registry-pill-row';
    selectedUser.skills.forEach((skill) => {
      skillList.append(createRegistryPill(skill));
    });

    skillsSection.append(skillsTitle, skillList);

    const needsSection = document.createElement('div');
    needsSection.className = 'registry-detail__section';

    const needsTitle = document.createElement('h3');
    needsTitle.textContent = 'Looking for';

    const needsList = document.createElement('div');
    needsList.className = 'registry-pill-row';
    selectedUser.lookingFor.forEach((item) => {
      needsList.append(createRegistryPill(item));
    });

    needsSection.append(needsTitle, needsList);

    const actionBar = document.createElement('div');
    actionBar.className = 'document-toolbar';
    actionBar.append(
      createUploadButton('Message member', () => {
        window.alert(`Open a conversation with ${selectedUser.name}.`);
      }, { primary: true }),
      createUploadButton('Save shortlist', () => {
        window.alert(`Saved ${selectedUser.name} to your shortlist.`);
      }),
    );

    detailPanel.append(detailHeader, detailBio, detailMeta, skillsSection, needsSection, actionBar);
  }

  resultsLayout.append(resultsColumn, detailPanel);
  screen.append(hero, resultsLayout);

  return screen;
}

function createSettingsScreen() {
  const screen = createScreenFrame(
    'Application settings',
    'Settings',
    'Preferences are stored in the Electron main process and streamed back into the renderer through the preload bridge.',
  );

  const grid = document.createElement('div');
  grid.className = 'settings-grid';

  const appearanceCard = document.createElement('article');
  appearanceCard.className = 'overview-card';

  const appearanceTitle = document.createElement('h2');
  appearanceTitle.textContent = 'Appearance';

  const themeGroup = document.createElement('div');
  themeGroup.className = 'settings-toggle-group';

  ['system', 'light', 'dark'].forEach((themeMode) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className =
      appState.preferences.appearance.theme === themeMode ? 'settings-chip is-active' : 'settings-chip';
    button.textContent =
      themeMode === 'system'
        ? 'System theme'
        : themeMode === 'light'
          ? 'Light mode'
          : 'Dark mode';
    button.addEventListener('click', () => {
      void window.desktop.preferences.set('appearance', {
        theme: themeMode as DesktopPreferences['appearance']['theme'],
      });
    });
    themeGroup.append(button);
  });

  appearanceCard.append(appearanceTitle, themeGroup);

  const developerCard = document.createElement('article');
  developerCard.className = 'overview-card';

  const developerTitle = document.createElement('h2');
  developerTitle.textContent = 'Developer';

  const developerToggle = document.createElement('label');
  developerToggle.className = 'settings-checkbox';

  const developerCheckbox = document.createElement('input');
  developerCheckbox.type = 'checkbox';
  developerCheckbox.checked = appState.preferences.developer.openDevToolsOnLaunch;
  developerCheckbox.addEventListener('change', () => {
    void window.desktop.preferences.set('developer', {
      openDevToolsOnLaunch: developerCheckbox.checked,
    });
  });

  const developerText = document.createElement('span');
  developerText.textContent = 'Open DevTools automatically on launch';
  developerToggle.append(developerCheckbox, developerText);
  developerCard.append(developerTitle, developerToggle);

  const documentsCard = document.createElement('article');
  documentsCard.className = 'overview-card';

  const documentsTitle = document.createElement('h2');
  documentsTitle.textContent = 'Documents';

  const reopenToggle = document.createElement('label');
  reopenToggle.className = 'settings-checkbox';

  const reopenCheckbox = document.createElement('input');
  reopenCheckbox.type = 'checkbox';
  reopenCheckbox.checked = appState.preferences.documents.reopenLastDocument;
  reopenCheckbox.addEventListener('change', () => {
    void window.desktop.preferences.set('documents', {
      reopenLastDocument: reopenCheckbox.checked,
    });
  });

  const reopenText = document.createElement('span');
  reopenText.textContent = 'Reopen the last document on launch';
  reopenToggle.append(reopenCheckbox, reopenText);
  documentsCard.append(documentsTitle, reopenToggle);

  grid.append(appearanceCard, developerCard, documentsCard);
  screen.append(grid);

  return screen;
}

function createMetaLine(text: string) {
  const line = document.createElement('span');
  line.textContent = text;
  return line;
}

function createDocumentsScreen() {
  const screen = createScreenFrame(
    'Save and load',
    'Documents',
    'This route is backed by reusable document workflow packages and session-scoped renderer state.',
  );

  const toolbar = document.createElement('div');
  toolbar.className = 'document-toolbar';

  const actions: Array<{ commandId: string; label: string }> = [
    { commandId: 'document.new', label: 'New' },
    { commandId: 'document.open', label: 'Open' },
    { commandId: 'document.save', label: 'Save' },
    { commandId: 'document.saveAs', label: 'Save As' },
  ];

  actions.forEach((action) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'upload-button';
    button.textContent = action.label;
    button.addEventListener('click', () => {
      void window.desktop.commands.run(action.commandId);
    });
    toolbar.append(button);
  });

  const summary = document.createElement('div');
  summary.className = 'document-summary';

  const statusBadge = document.createElement('span');
  statusBadge.className = appState.documents.isDirty ? 'status-badge status-badge--warn' : 'status-badge';
  statusBadge.textContent = appState.documents.isDirty ? 'Unsaved changes' : 'Saved';

  const meta = document.createElement('div');
  meta.className = 'document-meta';

  const nameLine = document.createElement('strong');
  nameLine.textContent = appState.documents.displayName;
  meta.append(
    nameLine,
    createMetaLine(appState.documents.filePath ?? 'No file path yet'),
    createMetaLine(appState.documents.statusMessage),
  );

  summary.append(statusBadge, meta);

  const layout = document.createElement('div');
  layout.className = 'document-layout';

  const editorCard = document.createElement('article');
  editorCard.className = 'overview-card';

  const editorLabel = document.createElement('label');
  editorLabel.className = 'document-editor-label';
  editorLabel.textContent = 'Current document';

  const editor = document.createElement('textarea');
  editor.className = 'document-editor';
  editor.value = appState.documents.content;
  editor.placeholder = 'Write something, then save it to a .desktop.json file.';
  editor.addEventListener('input', () => {
    void window.desktop.documents.updateDraft(editor.value);
  });

  editorCard.append(editorLabel, editor);

  const recentCard = document.createElement('article');
  recentCard.className = 'overview-card';

  const recentTitle = document.createElement('h2');
  recentTitle.textContent = 'Recent files';

  const recentList = document.createElement('div');
  recentList.className = 'recent-list';

  if (appState.documents.recentDocuments.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No recent documents yet.';
    recentList.append(empty);
  } else {
    appState.documents.recentDocuments.forEach((recentDocument) => {
      const recentButton = document.createElement('button');
      recentButton.type = 'button';
      recentButton.className = 'recent-item';

      const name = document.createElement('strong');
      name.textContent = recentDocument.name;

      recentButton.append(
        name,
        createMetaLine(recentDocument.filePath),
        createMetaLine(new Date(recentDocument.lastOpenedAt).toLocaleString()),
      );
      recentButton.addEventListener('click', () => {
        void window.desktop.documents.openRecent(recentDocument.filePath);
      });
      recentList.append(recentButton);
    });
  }

  recentCard.append(recentTitle, recentList);
  layout.append(editorCard, recentCard);
  screen.append(toolbar, summary, layout);

  return screen;
}

function formatBytes(sizeInBytes: number) {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  }

  if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTimestamp(timestamp: string | null) {
  if (!timestamp) {
    return 'Not completed yet';
  }

  return new Date(timestamp).toLocaleString();
}

function createUploadButton(
  label: string,
  onClick: () => void,
  options?: { disabled?: boolean; primary?: boolean },
) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = options?.primary ? 'upload-button upload-button--primary' : 'upload-button';
  button.disabled = Boolean(options?.disabled);
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

function getDroppedPaths(dataTransfer: DataTransfer | null) {
  if (!dataTransfer) {
    return [];
  }

  return Array.from(dataTransfer.files)
    .map((file) => (file as File & { path?: string }).path)
    .filter((filePath): filePath is string => typeof filePath === 'string' && filePath.length > 0);
}

function createUploadStatus(item: UploadItem) {
  const badge = document.createElement('span');
  badge.className = `upload-status upload-status--${item.status}`;
  badge.textContent = item.status;
  return badge;
}

function createUploadProgress(item: UploadItem) {
  const progress = document.createElement('div');
  progress.className = 'upload-progress';

  const bar = document.createElement('span');
  bar.className = 'upload-progress__bar';
  bar.style.width = `${item.progress}%`;

  progress.append(bar);
  return progress;
}

function createUploadActions(item: UploadItem) {
  const actions = document.createElement('div');
  actions.className = 'upload-actions';

  if (item.status === 'queued') {
    actions.append(
      createUploadButton('Start', () => {
        void window.desktop.uploads.startUpload(item.id);
      }, { primary: true }),
      createUploadButton('Cancel', () => {
        void window.desktop.uploads.cancelUpload(item.id);
      }),
    );
  } else if (item.status === 'uploading') {
    actions.append(
      createUploadButton('Cancel', () => {
        void window.desktop.uploads.cancelUpload(item.id);
      }),
    );
  } else if (item.status === 'failed' || item.status === 'canceled') {
    actions.append(
      createUploadButton('Retry', () => {
        void window.desktop.uploads.retryUpload(item.id);
      }, { primary: true }),
    );
  }

  return actions;
}

function createUploadQueueItem(item: UploadItem) {
  const queueItem = document.createElement('article');
  queueItem.className = 'upload-queue-item';

  const meta = document.createElement('div');
  meta.className = 'upload-queue-item__meta';

  const copyStack = document.createElement('div');
  copyStack.className = 'upload-copy-stack';

  const title = document.createElement('h3');
  title.textContent = item.name;

  const detail = document.createElement('p');
  detail.className = 'upload-queue-item__detail';
  detail.textContent = item.filePath;

  copyStack.append(title, detail);
  meta.append(copyStack, createUploadStatus(item));

  const stats = document.createElement('div');
  stats.className = 'upload-summary-grid';

  [
    `Size: ${formatBytes(item.size)}`,
    `Progress: ${item.progress}%`,
    `Attempts: ${item.attempts}`,
    `Completed: ${formatTimestamp(item.completedAt)}`,
  ].forEach((text) => {
    const stat = document.createElement('span');
    stat.className = 'upload-queue-item__detail';
    stat.textContent = text;
    stats.append(stat);
  });

  const error = document.createElement('p');
  error.className = 'upload-queue-item__detail';
  error.textContent = item.error ?? 'Ready for upload.';

  queueItem.append(meta, createUploadProgress(item), stats, error, createUploadActions(item));
  return queueItem;
}

function createUploadScreen() {
  const screen = createScreenFrame(
    'Upload workflow',
    'Uploads',
    'An app-specific upload exemplar with file intake, normalized queue state, retry and cancel controls, persistence, and restart recovery.',
  );

  const hero = document.createElement('article');
  hero.className = 'upload-card upload-card--hero';

  const copyStack = document.createElement('div');
  copyStack.className = 'upload-copy-stack';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'upload-card__eyebrow';
  eyebrow.textContent = 'App-specific example';

  const heroTitle = document.createElement('h2');
  heroTitle.textContent = 'Persistent file intake';

  const heroBody = document.createElement('p');
  heroBody.textContent =
    'Uploads remain app-specific while the shared platform packages cover persistence, commands, preferences, and window lifecycle.';

  const noteList = document.createElement('ul');
  noteList.className = 'upload-note-list';

  [
    'Drop files into the queue or pick them from the main-process dialog.',
    'Queued items persist across restarts and in-flight work recovers as retryable failures.',
    'Any filename containing "fail" simulates a retryable transport error on its first attempt.',
  ].forEach((text) => {
    const item = document.createElement('li');
    item.textContent = text;
    noteList.append(item);
  });

  copyStack.append(eyebrow, heroTitle, heroBody, noteList);

  const infoStack = document.createElement('div');
  infoStack.className = 'upload-info-stack';

  const items = appState.uploads.items;
  const queuedCount = items.filter((item) => item.status === 'queued').length;
  const uploadingCount = items.filter((item) => item.status === 'uploading').length;
  const failedCount = items.filter((item) => item.status === 'failed').length;
  const completedCount = items.filter((item) => item.status === 'completed').length;

  [
    `Queue size: ${items.length}`,
    `Queued: ${queuedCount}`,
    `Uploading: ${uploadingCount}`,
    `Failed: ${failedCount}`,
    `Completed: ${completedCount}`,
    `Status: ${appState.uploads.statusMessage}`,
  ].forEach((text) => {
    const row = document.createElement('div');
    row.className = 'upload-info-row';

    const body = document.createElement('p');
    body.textContent = text;
    row.append(body);
    infoStack.append(row);
  });

  hero.append(copyStack, infoStack);

  const surfaceGrid = document.createElement('div');
  surfaceGrid.className = 'upload-surface-grid';

  const dropzone = document.createElement('div');
  dropzone.className = 'upload-dropzone';
  dropzone.tabIndex = 0;

  const dropTitle = document.createElement('strong');
  dropTitle.textContent = 'Drop files here';

  const dropText = document.createElement('p');
  dropText.textContent =
    'Drag local files into this surface, or use the picker to queue them through the Electron main process.';

  const dropButtons = document.createElement('div');
  dropButtons.className = 'document-toolbar';

  const hasQueuedUploads = queuedCount > 0;
  const hasCompletedUploads = completedCount > 0;

  dropButtons.append(
    createUploadButton('Pick files', () => {
      void window.desktop.uploads.pickFiles();
    }, { primary: true }),
    createUploadButton('Start queued', () => {
      void window.desktop.uploads.startAll();
    }, { disabled: !hasQueuedUploads }),
    createUploadButton('Clear completed', () => {
      void window.desktop.uploads.clearCompleted();
    }, { disabled: !hasCompletedUploads }),
  );

  const setDropzoneActive = (isActive: boolean) => {
    dropzone.classList.toggle('is-active', isActive);
  };

  dropzone.addEventListener('dragenter', (event) => {
    event.preventDefault();
    setDropzoneActive(true);
  });

  dropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    setDropzoneActive(true);
  });

  dropzone.addEventListener('dragleave', (event) => {
    if (event.target === dropzone) {
      setDropzoneActive(false);
    }
  });

  dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    setDropzoneActive(false);

    const droppedPaths = getDroppedPaths(event.dataTransfer);

    if (droppedPaths.length === 0) {
      return;
    }

    void window.desktop.uploads.addDroppedFiles(droppedPaths);
  });

  dropzone.append(dropTitle, dropText, dropButtons);

  const queue = document.createElement('section');
  queue.className = 'upload-queue';

  const queueHeader = document.createElement('div');
  queueHeader.className = 'upload-queue__header';

  const queueTitle = document.createElement('h2');
  queueTitle.textContent = 'Upload queue';

  const queueStatus = document.createElement('p');
  queueStatus.className = 'upload-empty-state';
  queueStatus.textContent = appState.uploads.statusMessage;

  queueHeader.append(queueTitle, queueStatus);

  const queueList = document.createElement('div');
  queueList.className = 'upload-queue__list';

  if (items.length === 0) {
    const emptyState = document.createElement('p');
    emptyState.className = 'upload-empty-state';
    emptyState.textContent = 'No uploads queued yet.';
    queueList.append(emptyState);
  } else {
    items.forEach((item) => {
      queueList.append(createUploadQueueItem(item));
    });
  }

  queue.append(queueHeader, queueList);
  surfaceGrid.append(dropzone, queue);
  screen.append(hero, surfaceGrid);

  return screen;
}

function renderApp() {
  const app = document.getElementById('app');
  if (!app) {
    return;
  }

  const route = getCurrentRoute();
  app.innerHTML = '';
  app.append(createNavbar(route));

  if (!appState.ready) {
    app.append(createScreenFrame('Loading', 'Loading desktop services', 'Connecting to the preload bridge.'));
    return;
  }

  if (route === 'settings') {
    app.append(createSettingsScreen());
    return;
  }

  if (route === 'documents') {
    app.append(createDocumentsScreen());
    return;
  }

  if (route === 'uploads') {
    app.append(createUploadScreen());
    return;
  }

  app.append(createHomeScreen());
}

function handleKeyboardShortcuts(event: KeyboardEvent) {
  if (!event.ctrlKey && !event.metaKey) {
    return;
  }

  if (event.altKey) {
    return;
  }

  const key = event.key.toLowerCase();
  let commandId: string | null = null;

  if (key === ',') {
    commandId = 'app.openPreferences';
  } else if (key === 'n' && !event.shiftKey) {
    commandId = 'document.new';
  } else if (key === 'o' && !event.shiftKey) {
    commandId = 'document.open';
  } else if (key === 's' && event.shiftKey) {
    commandId = 'document.saveAs';
  } else if (key === 's') {
    commandId = 'document.save';
  }

  if (!commandId) {
    return;
  }

  event.preventDefault();
  void window.desktop.commands.run(commandId);
}

async function bootstrap() {
  const [preferences, documents, uploads] = await Promise.all([
    window.desktop.preferences.getAll(),
    window.desktop.documents.getState(),
    window.desktop.uploads.getState(),
  ]);

  appState.preferences = preferences;
  appState.documents = documents;
  appState.uploads = uploads;
  appState.ready = true;
  applyTheme(preferences);

  window.desktop.preferences.subscribe((nextPreferences) => {
    appState.preferences = nextPreferences;
    applyTheme(nextPreferences);
    renderApp();
  });

  window.desktop.documents.subscribe((nextDocuments) => {
    appState.documents = nextDocuments;
    renderApp();
  });

  window.desktop.uploads.subscribe((nextUploads) => {
    appState.uploads = nextUploads;
    renderApp();
  });

  systemThemeQuery.addEventListener('change', () => {
    applyTheme(appState.preferences);
  });

  window.addEventListener('keydown', handleKeyboardShortcuts);
  renderApp();
}

window.addEventListener('hashchange', renderApp);
renderApp();
void bootstrap();
