export type AppRoute = 'home' | 'settings' | 'documents' | 'uploads' | 'maps';
import { splitDesktopHotkeyAccelerator } from './platform/shared/preferences';

export const appRouteDefinitions: Array<{
  href: string;
  label: string;
  route: AppRoute;
}> = [
  { href: '#/', label: 'Home', route: 'home' },
  { href: '#/settings', label: 'Settings', route: 'settings' },
  { href: '#/documents', label: 'Documents', route: 'documents' },
  { href: '#/uploads', label: 'Uploads', route: 'uploads' },
];

function createHotkeyPreview(accelerator: string) {
  const preview = document.createElement('span');
  preview.className = 'hotkey-preview hotkey-preview--inline';
  preview.setAttribute('aria-hidden', 'true');

  splitDesktopHotkeyAccelerator(accelerator).forEach((token) => {
    const keycap = document.createElement('kbd');
    keycap.className = 'hotkey-kbd hotkey-kbd--inline';
    keycap.textContent = token;
    preview.append(keycap);
  });

  return preview;
}

export function getRouteFromHash(hash: string): AppRoute {
  const match = appRouteDefinitions.find((definition) => definition.href === hash);
  return match?.route ?? 'home';
}

export function createNavbar(
  route: AppRoute,
  hotkeys?: Partial<Record<AppRoute, string>>,
): HTMLElement {
  const navbar = document.createElement('nav');
  navbar.className = 'navbar';

  const brand = document.createElement('span');
  brand.className = 'navbar__brand';
  brand.textContent = 'Desktop App';

  const actions = document.createElement('div');
  actions.className = 'navbar__actions';

  const homeLink = document.createElement('a');
  homeLink.href = '#/';
  homeLink.textContent = 'Home';
  if (route === 'home') {
    homeLink.className = 'is-active';
  }

  const settingsLink = document.createElement('a');
  settingsLink.href = '#/settings';
  settingsLink.textContent = 'Settings';
  if (route === 'settings') {
    settingsLink.className = 'is-active';
  }

  const documentsLink = document.createElement('a');
  documentsLink.href = '#/documents';
  documentsLink.textContent = 'Documents';
  if (route === 'documents') {
    documentsLink.className = 'is-active';
  }

  const uploadsLink = document.createElement('a');
  uploadsLink.href = '#/uploads';
  uploadsLink.textContent = 'Uploads';
  if (route === 'uploads') {
    uploadsLink.className = 'is-active';
  }

  const mapsLink = document.createElement('a');
  mapsLink.href = '#/maps';
  mapsLink.textContent = 'Maps';
  if (route === 'maps') {
    mapsLink.className = 'is-active';
  }

  actions.append(homeLink, settingsLink, documentsLink, uploadsLink, mapsLink);
  appRouteDefinitions.forEach((definition) => {
    const link = document.createElement('a');
    link.href = definition.href;

    if (route === definition.route) {
      link.className = 'is-active';
    }

    const label = document.createElement('span');
    label.textContent = definition.label;
    link.append(label);

    const accelerator = hotkeys?.[definition.route];
    if (accelerator) {
      link.append(createHotkeyPreview(accelerator));
    }

    actions.append(link);
  });

  navbar.append(brand, actions);

  return navbar;
}
