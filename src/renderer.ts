import './index.css';

import { createSharedButtonLabel } from '@moritzbrantner/ui';
import { AppRoute, createNavbar } from './navbar';

type ThemeMode = 'light' | 'dark';

const storageKey = 'desktop-theme';

type UploadQueueItem = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeInBytes: number;
  kind: string;
  source: string;
  managementLabel: string;
  managementDetail: string;
};

function getInitialTheme(): ThemeMode {
  const savedTheme = window.localStorage.getItem(storageKey);

  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(storageKey, theme);
}

const initialTheme = getInitialTheme();
applyTheme(initialTheme);

function getCurrentRoute(): AppRoute {
  if (window.location.hash === '#/settings') {
    return 'settings';
  }

  if (window.location.hash === '#/uploads') {
    return 'uploads';
  }

  if (window.location.hash === '#/communication') {
    return 'communication';
  }

  if (window.location.hash === '#/three') {
    return 'three';
  }

  if (window.location.hash === '#/react-hook-form') {
    return 'react-hook-form';
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

function createHomeScreen() {
  const screen = createScreenFrame(
    'Desktop app',
    'Hello Electron!',
    'Use the navigation above to compare Settings, Three.js, React Hook Form, and the dedicated upload workflow page while keeping shared platform packages consumable from this template.',
  );

  const sharedPackageCard = document.createElement('article');
  sharedPackageCard.className = 'overview-card';

  const sharedPackageTitle = document.createElement('h2');
  sharedPackageTitle.textContent = 'Shared platform package';

  const sharedPackageBody = document.createElement('p');
  sharedPackageBody.textContent =
    'This renderer imports a package from @moritzbrantner/platform-packages so future shared UI or utility modules can be added without changing the Electron wiring.';

  const sharedPackageLabel = document.createElement('code');
  sharedPackageLabel.className = 'shared-package-label';
  sharedPackageLabel.textContent = createSharedButtonLabel({ label: 'desktop-launch' });

  sharedPackageCard.append(sharedPackageTitle, sharedPackageBody, sharedPackageLabel);
  screen.append(sharedPackageCard);

  return screen;
}

function createSettingsScreen() {
  const screen = createScreenFrame(
    'Application settings',
    'Settings',
    'Choose your preferred theme for the desktop app.',
  );

  const controls = document.createElement('div');
  controls.className = 'theme-controls';

  const description = document.createElement('p');
  description.textContent = 'Appearance';

  const lightButton = document.createElement('button');
  lightButton.textContent = 'Light mode';
  lightButton.type = 'button';
  lightButton.addEventListener('click', () => applyTheme('light'));

  const darkButton = document.createElement('button');
  darkButton.textContent = 'Dark mode';
  darkButton.type = 'button';
  darkButton.addEventListener('click', () => applyTheme('dark'));

  controls.append(description, lightButton, darkButton);
  screen.append(controls);

  return screen;
}

function createThreeScreen() {
  const screen = createScreenFrame(
    'Three dimensional',
    'Three.js',
    'A dedicated route for 3D demos, experiments, and future scene work in the desktop app.',
  );

  const showcase = document.createElement('div');
  showcase.className = 'three-showcase';

  const orbit = document.createElement('div');
  orbit.className = 'three-orbit';

  const cube = document.createElement('div');
  cube.className = 'three-cube';

  const faceClassNames = [
    'three-face three-face--front',
    'three-face three-face--back',
    'three-face three-face--right',
    'three-face three-face--left',
    'three-face three-face--top',
    'three-face three-face--bottom',
  ];

  faceClassNames.forEach((className) => {
    const face = document.createElement('span');
    face.className = className;
    cube.append(face);
  });

  showcase.append(orbit, cube);
  screen.append(showcase);

  return screen;
}

function createReactHookFormScreen() {
  const screen = createScreenFrame(
    'Form state overview',
    'React Hook Form',
    'A reference page for the core React Hook Form pieces and how they affect required, dirty, validity, and reset.',
  );

  const sections = [
    {
      title: 'useForm',
      body: 'Creates the form API, default values, and formState that register, Controller, and reset all read from.',
    },
    {
      title: 'register',
      body: 'Connects uncontrolled inputs and attaches rules such as required validation directly to the field.',
    },
    {
      title: 'Controller',
      body: 'Wraps controlled UI components so they still participate in the same dirty and validity model.',
    },
    {
      title: 'reset',
      body: 'Restores defaults, clears errors, and can re-baseline dirty tracking when new values are provided.',
    },
  ];

  const grid = document.createElement('div');
  grid.className = 'overview-grid';

  sections.forEach((section) => {
    const card = document.createElement('article');
    card.className = 'overview-card';

    const title = document.createElement('h2');
    title.textContent = section.title;

    const body = document.createElement('p');
    body.textContent = section.body;

    card.append(title, body);
    grid.append(card);
  });

  const stateCard = document.createElement('article');
  stateCard.className = 'overview-card';

  const stateTitle = document.createElement('h2');
  stateTitle.textContent = 'State interactions';

  const stateList = document.createElement('ul');
  stateList.className = 'overview-list';

  const interactions = [
    'Required rules are attached at registration time and begin surfacing errors when validation runs.',
    'Dirty state turns true when a field differs from its default value.',
    'Validity reflects the current error map and validation mode.',
    'reset() restores defaults, clears errors, and can create a new clean baseline with reset(newValues).',
  ];

  interactions.forEach((interaction) => {
    const item = document.createElement('li');
    item.textContent = interaction;
    stateList.append(item);
  });

  stateCard.append(stateTitle, stateList);
  screen.append(grid, stateCard);

  return screen;
}

function createUploadScreen() {
  const screen = createScreenFrame(
    'Cross-app upload reference',
    'Uploads',
    'This Electron route compares web, desktop, and mobile intake while keeping the actual desktop queue visible in the renderer.',
  );

  const hero = document.createElement('article');
  hero.className = 'upload-card upload-card--hero';

  const heroIntro = document.createElement('div');
  const heroEyebrow = document.createElement('p');
  heroEyebrow.className = 'upload-card__eyebrow';

  const heroTitle = document.createElement('h2');
  heroTitle.textContent = 'How the desktop app should manage uploads';

  heroIntro.append(heroEyebrow, heroTitle);

  const heroCopy = document.createElement('div');
  heroCopy.className = 'upload-copy-stack';


  hero.append(heroIntro, heroCopy);

  const surfaceGrid = document.createElement('section');
  surfaceGrid.className = 'upload-surface-grid';

  const dropzone = document.createElement('label');
  dropzone.className = 'upload-dropzone';

  const hiddenInput = document.createElement('input');
  hiddenInput.type = 'file';
  hiddenInput.multiple = true;
  hiddenInput.accept = 'image/*,audio/*,video/*,.pdf,.doc,.docx,.txt,.md,.csv,.json,.zip';
  hiddenInput.className = 'upload-hidden-input';

  const dropzoneEyebrow = document.createElement('span');
  dropzoneEyebrow.className = 'upload-card__eyebrow';
  dropzoneEyebrow.textContent = 'Desktop intake';

  const dropzoneTitle = document.createElement('strong');
  dropzoneTitle.textContent = 'Drop files here or open the renderer picker';

  const dropzoneBody = document.createElement('p');
  dropzoneBody.textContent =
    'This demo keeps selection in the renderer so you can compare it directly with the web flow. A production app could swap the picker for dialog.showOpenDialog.';

  const openButton = document.createElement('button');
  openButton.type = 'button';
  openButton.className = 'upload-button upload-button--primary';
  openButton.textContent = 'Choose files';
  openButton.addEventListener('click', (event) => {
    event.preventDefault();
    hiddenInput.click();
  });

  dropzone.append(hiddenInput, dropzoneEyebrow, dropzoneTitle, dropzoneBody, openButton);

  const queueCard = document.createElement('article');
  queueCard.className = 'upload-card upload-queue';

  const queueHeader = document.createElement('div');
  queueHeader.className = 'upload-queue__header';

  const queueIntro = document.createElement('div');
  const queueEyebrow = document.createElement('p');
  queueEyebrow.className = 'upload-card__eyebrow';
  queueEyebrow.textContent = 'Normalized queue';

  const queueTitle = document.createElement('h2');
  queueTitle.textContent = 'Current upload items';

  queueIntro.append(queueEyebrow, queueTitle);

  const clearButton = document.createElement('button');
  clearButton.type = 'button';
  clearButton.className = 'upload-button';
  clearButton.textContent = 'Clear queue';

  queueHeader.append(queueIntro, clearButton);

  const queueList = document.createElement('div');
  queueList.className = 'upload-queue__list';

  let queue: UploadQueueItem[] = [];

  const renderQueue = () => {
    queueList.innerHTML = '';
    clearButton.disabled = queue.length === 0;

    if (queue.length === 0) {
      const emptyState = document.createElement('p');
      emptyState.className = 'upload-empty-state';
      emptyState.textContent =
        'No files yet. Add a few files to see how the desktop app classifies and manages them.';
      queueList.append(emptyState);
      return;
    }

    queue.forEach((item) => {
      const queueItem = document.createElement('article');
      queueItem.className = 'upload-queue-item';

      const meta = document.createElement('div');
      meta.className = 'upload-queue-item__meta';

      const heading = document.createElement('div');
      const fileName = document.createElement('h3');
      fileName.textContent = item.fileName;

      const summary = document.createElement('p');

      heading.append(fileName, summary);

      const badge = document.createElement('span');
      badge.className = 'upload-badge';
      badge.textContent = item.managementLabel;

      meta.append(heading, badge);

      const detail = document.createElement('p');
      detail.className = 'upload-queue-item__detail';
      detail.textContent = item.managementDetail;

      const mimeType = document.createElement('p');
      mimeType.className = 'upload-queue-item__type';
      mimeType.textContent = `MIME: ${item.mimeType}`;

      queueItem.append(meta, detail, mimeType);
      queueList.append(queueItem);
    });
  };

  const appendFiles = (fileList: FileList | null, source: string) => {
    if (!fileList?.length) {
      return;
    }

    renderQueue();
  };

  hiddenInput.addEventListener('change', () => appendFiles(hiddenInput.files, 'renderer picker'));

  dropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
  });

  dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    appendFiles(event.dataTransfer?.files ?? null, 'OS drag and drop');
  });

  clearButton.addEventListener('click', () => {
    queue = [];
    renderQueue();
  });

  queueCard.append(queueHeader, queueList);
  renderQueue();
  surfaceGrid.append(dropzone, queueCard);

  const platformGrid = document.createElement('section');
  platformGrid.className = 'upload-platform-grid';

  

  const bottomGrid = document.createElement('section');
  bottomGrid.className = 'upload-bottom-grid';

  const groupsCard = document.createElement('article');
  groupsCard.className = 'upload-card';

  const groupsEyebrow = document.createElement('p');
  groupsEyebrow.className = 'upload-card__eyebrow';
  groupsEyebrow.textContent = 'Accepted groups';

  const groupsStack = document.createElement('div');
  groupsStack.className = 'upload-info-stack';

  

  groupsCard.append(groupsEyebrow, groupsStack);

  const lifecycleCard = document.createElement('article');
  lifecycleCard.className = 'upload-card';

  const lifecycleEyebrow = document.createElement('p');
  lifecycleEyebrow.className = 'upload-card__eyebrow';
  lifecycleEyebrow.textContent = 'Lifecycle';

  const lifecycleStack = document.createElement('div');
  lifecycleStack.className = 'upload-info-stack';

  lifecycleCard.append(lifecycleEyebrow, lifecycleStack);
  bottomGrid.append(groupsCard, lifecycleCard);

  screen.append(hero, surfaceGrid, platformGrid, bottomGrid);

  return screen;
}

function createCommunicationScreen() {
  const screen = createScreenFrame(
    'Communication category',
    'Realtime communication',
    'A reference page for the main building blocks behind low-latency collaboration and shared-state syncing.',
  );

  const sections = [
    {
      id: 'websockets',
      title: 'Websockets',
      body: 'Websockets keep a persistent connection open so the app can exchange low-latency events such as chat messages, presence, and collaborative cursors.',
      bullets: [
        'Best when the product needs immediate delivery of small state changes.',
        'The client usually needs auth refresh, heartbeat, and reconnection handling around the socket.',
        'Event payloads should stay incremental so the renderer can merge them into existing state.',
      ],
    },
    {
      id: 'crdts',
      title: 'CRDTs',
      body: 'CRDTs allow multiple replicas to edit the same document concurrently and still converge without central lock-step coordination.',
      bullets: [
        'Useful when the app must tolerate offline edits and later synchronization.',
        'The local store usually persists operations or document updates before they are synchronized.',
        'Conflict handling moves into the data structure instead of being managed ad hoc in view code.',
      ],
    },
  ];

  const grid = document.createElement('div');
  grid.className = 'overview-grid';

  sections.forEach((section) => {
    const card = document.createElement('article');
    card.className = 'overview-card';
    card.id = section.id;

    const title = document.createElement('h2');
    title.textContent = section.title;

    const body = document.createElement('p');
    body.textContent = section.body;

    const list = document.createElement('ul');
    list.className = 'overview-list';

    section.bullets.forEach((bullet) => {
      const item = document.createElement('li');
      item.textContent = bullet;
      list.append(item);
    });

    card.append(title, body, list);
    grid.append(card);
  });

  screen.append(grid);

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
  if (route === 'settings') {
    app.append(createSettingsScreen());
    return;
  }

  if (route === 'three') {
    app.append(createThreeScreen());
    return;
  }

  if (route === 'react-hook-form') {
    app.append(createReactHookFormScreen());
    return;
  }

  if (route === 'uploads') {
    app.append(createUploadScreen());
    return;
  }

  if (route === 'communication') {
    app.append(createCommunicationScreen());
    return;
  }

  app.append(createHomeScreen());
}

window.addEventListener('hashchange', renderApp);
renderApp();
