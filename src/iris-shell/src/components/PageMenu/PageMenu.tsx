import type { Ref } from 'react';
import { IconButton } from '../IconButton/IconButton.js';
import { Menu, type MenuEntry } from '../Menu/Menu.js';
import { Tooltip } from '../Tooltip/Tooltip.js';

export interface PageMenuProps {
  ariaLabel?: string;
  favoriteLabel?: string;
  onFavorite?: () => void;
  onDownloadCsv?: () => void;
  onAskAi?: () => void;
}

/** Shared page overflow menu matching the ARS page-menu pattern. */
export function PageMenu({
  ariaLabel = 'Page actions',
  favoriteLabel = 'Add to Favorites',
  onFavorite,
  onDownloadCsv,
  onAskAi,
}: PageMenuProps) {
  const items: MenuEntry[] = [
    { kind: 'item', label: 'Customize', icon: 'Pencil' },
    { kind: 'divider' },
    { kind: 'item', label: favoriteLabel, icon: 'Star', onSelect: onFavorite },
    { kind: 'item', label: 'Download view as .CSV', icon: 'DownloadSimple', onSelect: onDownloadCsv },
    { kind: 'divider' },
    { kind: 'item', label: 'Ask AI', icon: 'Sparkle', onSelect: onAskAi },
  ];

  return (
    <Menu
      ariaLabel={ariaLabel}
      align="end"
      items={items}
      trigger={({ ref, onClick, expanded }) => (
        <Tooltip label="More options">
          <IconButton
            ref={ref as Ref<HTMLButtonElement>}
            icon="DotsThree"
            ariaLabel={ariaLabel}
            aria-haspopup="menu"
            aria-expanded={expanded}
            onClick={onClick}
          />
        </Tooltip>
      )}
    />
  );
}
