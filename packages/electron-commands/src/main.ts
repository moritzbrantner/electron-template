import { createRequire } from 'node:module';

import type { BrowserWindow, IpcMain, IpcMainInvokeEvent, Menu, MenuItem, MenuItemConstructorOptions } from 'electron';

import { commandsChannels, type CommandState } from './shared.ts';

const require = createRequire(import.meta.url);

export interface CommandContext {
  window: BrowserWindow | null;
}

export interface CommandDefinition {
  accelerator?: string;
  id: string;
  isEnabled?: (context: CommandContext) => boolean;
  label: string;
  execute: (context: CommandContext) => Promise<void> | void;
}

export interface CommandsServiceOptions {
  getWindowForEvent?: (event: IpcMainInvokeEvent) => BrowserWindow | null;
  getWindowForState?: () => BrowserWindow | null;
  definitions: CommandDefinition[];
}

export function createCommandsService(options: CommandsServiceOptions) {
  const menuItemIdPrefix = 'command:';
  const commandMap = new Map<string, CommandDefinition>();
  const acceleratorMap = new Map<string, string>();

  options.definitions.forEach((definition) => {
    if (commandMap.has(definition.id)) {
      throw new Error(`Duplicate command id: ${definition.id}`);
    }

    if (definition.accelerator) {
      const existingCommandId = acceleratorMap.get(definition.accelerator);

      if (existingCommandId) {
        throw new Error(
          `Duplicate command accelerator: ${definition.accelerator} (${existingCommandId} and ${definition.id})`,
        );
      }

      acceleratorMap.set(definition.accelerator, definition.id);
    }

    commandMap.set(definition.id, definition);
  });

  function getContext(window: BrowserWindow | null): CommandContext {
    return { window };
  }

  function normalizeInputToAccelerator(input: {
    alt?: boolean;
    control?: boolean;
    key: string;
    meta?: boolean;
    shift?: boolean;
  }) {
    const key = input.key.length === 1 ? input.key.toUpperCase() : input.key;
    const parts: string[] = [];

    if (input.control || input.meta) {
      parts.push('CmdOrCtrl');
    }

    if (input.alt) {
      parts.push('Alt');
    }

    if (input.shift) {
      parts.push('Shift');
    }

    parts.push(key);
    return parts.join('+');
  }

  function getDefinition(commandId: string) {
    const definition = commandMap.get(commandId);

    if (!definition) {
      throw new Error(`Unknown command: ${commandId}`);
    }

    return definition;
  }

  function isEnabled(commandId: string, window = options.getWindowForState?.() ?? null) {
    const definition = getDefinition(commandId);
    return definition.isEnabled ? definition.isEnabled(getContext(window)) : true;
  }

  async function run(commandId: string, window = options.getWindowForState?.() ?? null) {
    const definition = getDefinition(commandId);
    const context = getContext(window);

    if (definition.isEnabled && !definition.isEnabled(context)) {
      throw new Error(`Command is disabled: ${commandId}`);
    }

    await definition.execute(context);
    refreshApplicationMenu(window);
  }

  function list(window = options.getWindowForState?.() ?? null): CommandState[] {
    return options.definitions.map((definition) => ({
      accelerator: definition.accelerator,
      enabled: definition.isEnabled ? definition.isEnabled(getContext(window)) : true,
      id: definition.id,
    }));
  }

  function createMenuItem(
    commandId: string,
    overrides?: Omit<MenuItemConstructorOptions, 'accelerator' | 'click' | 'enabled' | 'label'>,
  ): MenuItemConstructorOptions {
    const definition = getDefinition(commandId);

    return {
      accelerator: definition.accelerator,
      click: async (_menuItem, browserWindow) => {
        const targetWindow = browserWindow && 'webContents' in browserWindow ? (browserWindow as BrowserWindow) : null;
        await run(commandId, targetWindow);
      },
      enabled: isEnabled(commandId),
      id: `${menuItemIdPrefix}${commandId}`,
      label: definition.label,
      ...overrides,
    };
  }

  function walkMenuItems(menuItems: MenuItem[], visitor: (item: MenuItem) => void) {
    menuItems.forEach((item) => {
      visitor(item);

      if (item.submenu) {
        walkMenuItems(item.submenu.items, visitor);
      }
    });
  }

  function applyMenuState(menu: Menu, window = options.getWindowForState?.() ?? null) {
    walkMenuItems(menu.items, (item) => {
      if (typeof item.id !== 'string' || !item.id.startsWith(menuItemIdPrefix)) {
        return;
      }

      const commandId = item.id.slice(menuItemIdPrefix.length);
      item.enabled = isEnabled(commandId, window);
    });
  }

  function refreshApplicationMenu(window = options.getWindowForState?.() ?? null) {
    const { Menu: ElectronMenu } = require('electron') as typeof import('electron');

    if (typeof ElectronMenu?.getApplicationMenu !== 'function') {
      return;
    }

    const applicationMenu = ElectronMenu.getApplicationMenu();

    if (!applicationMenu) {
      return;
    }

    applyMenuState(applicationMenu, window);
  }

  function attachToWindow(browserWindow: BrowserWindow) {
    browserWindow.webContents.on('before-input-event', (event, input) => {
      const accelerator = normalizeInputToAccelerator(input);
      const commandId = acceleratorMap.get(accelerator);

      if (!commandId) {
        return;
      }

      event.preventDefault();
      void run(commandId, browserWindow);
    });
  }

  function installIpc(ipcMain: IpcMain) {
    const { BrowserWindow: ElectronBrowserWindow } = require('electron') as typeof import('electron');

    ipcMain.handle(commandsChannels.list, async () => list());
    ipcMain.handle(commandsChannels.run, async (event, commandId: string) => {
      const window = options.getWindowForEvent?.(event) ?? ElectronBrowserWindow.fromWebContents(event.sender);
      await run(commandId, window);
    });

    return () => {
      ipcMain.removeHandler(commandsChannels.list);
      ipcMain.removeHandler(commandsChannels.run);
    };
  }

  return {
    applyMenuState,
    attachToWindow,
    createMenuItem,
    installIpc,
    isEnabled,
    list,
    refreshApplicationMenu,
    run,
  };
}
