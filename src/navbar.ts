export type AppRoute = 'home' | 'settings' | 'documents' | 'uploads' | 'maps';

export function createNavbar(route: AppRoute): HTMLElement {
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
  navbar.append(brand, actions);

  return navbar;
}
