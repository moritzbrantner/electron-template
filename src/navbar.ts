export type AppRoute = 'home' | 'settings' | 'documents' | 'uploads' | 'maps';
import { splitDesktopHotkeyAccelerator } from './platform/shared/preferences';

export const appRouteDefinitions: Array<{
  href: string;
  hotkeyName?: 'home' | 'settings' | 'documents' | 'uploads';
  label: string;
  route: AppRoute;
}> = [
  { href: '#/', hotkeyName: 'home', label: 'Home', route: 'home' },
  { href: '#/settings', hotkeyName: 'settings', label: 'Settings', route: 'settings' },
  { href: '#/documents', hotkeyName: 'documents', label: 'Documents', route: 'documents' },
  { href: '#/uploads', hotkeyName: 'uploads', label: 'Uploads', route: 'uploads' },
  { href: '#/maps', label: 'Maps', route: 'maps' },
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
  appRouteDefinitions.forEach((definition) => {
    const link = document.createElement('a');
    link.href = definition.href;

    if (route === definition.route) {
      link.className = 'is-active';
    }

    const label = document.createElement('span');
    label.textContent = definition.label;
    link.append(label);

    const accelerator = definition.hotkeyName ? hotkeys?.[definition.hotkeyName] : undefined;
    if (accelerator) {
      link.append(createHotkeyPreview(accelerator));
    }

    actions.append(link);
  });

  navbar.append(brand, actions);

  return navbar;
}
