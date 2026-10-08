import { useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '../AppShell/AppShell.js';
import { BrandLogo } from '../../components/BrandLogo/BrandLogo.js';
import { Button } from '../../components/Button/Button.js';
import { Checkbox } from '../../components/Checkbox/Checkbox.js';
import { ContentHeader } from '../../components/ContentHeader/ContentHeader.js';
import { FormField } from '../../components/FormField/FormField.js';
import { Icon } from '../../components/Icon/Icon.js';
import { IconButton } from '../../components/IconButton/IconButton.js';
import { Modal } from '../../components/Modal/Modal.js';
import { SideSheet } from '../../components/SideSheet/SideSheet.js';
import { Tabs } from '../../components/Tabs/Tabs.js';
import { TextInput } from '../../components/TextInput/TextInput.js';
import { Tooltip } from '../../components/Tooltip/Tooltip.js';
import { navigate } from '../../lib/router.js';
import { showToast } from '../../lib/toastStore.js';
import {
  OBJECT_TEMPLATES,
  customizationStorageKey,
  getObjectTemplate,
  loadCustomizedEntries,
  saveCustomizedEntries,
  type CustomizationEntry,
  type ObjectTemplate,
} from '../../lib/customizationSchemas.js';
import styles from './CustomizationPage.module.css';

export type CustomizationSection =
  | 'home'
  | 'tasks'
  | 'settings'
  | 'object-pages'
  | 'object-detail'
  | 'new-entry';

interface CustomizationPageProps {
  section?: CustomizationSection;
  objectId?: string;
}

const customizationAreas = [
  {
    id: 'object-pages',
    title: 'Object pages',
    description: 'Forms, tabs and sections',
    icon: 'FileText',
  },
  {
    id: 'navigation',
    title: 'Navigation',
    description: 'Menus and navigation · Add or remove commands for each object type, such as User or Group',
    icon: 'TreeStructure',
  },
  {
    id: 'commands',
    title: 'Commands',
    description: 'Actions and commands · Customize pages associated with a command, such as property pages',
    icon: 'TerminalWindow',
  },
  {
    id: 'search',
    title: 'Search and filtering',
    description: 'Search pages and filters',
    icon: 'MagnifyingGlass',
  },
];

export function CustomizationPage({
  section = 'home',
  objectId = 'user',
}: CustomizationPageProps) {
  const normalizedSection = section === 'home' ? 'tasks' : section;
  const template = getObjectTemplate(objectId) ?? OBJECT_TEMPLATES.find((item) => item.id === 'user')!;

  return (
    <AppShell
      breadcrumb={
        normalizedSection === 'tasks'
          ? [{ label: 'Customization' }, { label: 'Forms and objects' }]
          : normalizedSection === 'settings'
            ? [{ label: 'Customization' }, { label: 'Branding and appearance' }]
            : [
                { label: 'Customization' },
                ...(normalizedSection === 'object-pages'
                  ? [{ label: 'Forms and objects' }]
                  : [
                      { label: 'Forms and objects', onClick: () => navigate('#/customization') },
                      { label: template.name },
                    ]),
              ]
      }
      activeGlobalItem={normalizedSection === 'settings' ? 'customization-branding' : 'customization-forms'}
      showSecondarySidebar={false}
    >
      <div className={styles.customizationScroll}>
        {normalizedSection === 'tasks' ? (
          <CustomizationTasks />
        ) : normalizedSection === 'settings' ? (
          <GlobalSettings />
        ) : normalizedSection === 'object-pages' ? (
          <ObjectPages />
        ) : (
          <ObjectEditor template={template} initiallyOpenModal={normalizedSection === 'new-entry'} />
        )}
      </div>
    </AppShell>
  );
}

function CustomizationTasks() {
  const [expandedAreas, setExpandedAreas] = useState(() => new Set(['object-pages']));
  const [insightsExpanded, setInsightsExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const templates = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return !normalized
      ? OBJECT_TEMPLATES
      : OBJECT_TEMPLATES.filter((item) => `${item.name} ${item.objectType}`.toLowerCase().includes(normalized));
  }, [query]);

  const toggleArea = (areaId: string) => {
    setExpandedAreas((current) => {
      const next = new Set(current);
      next.has(areaId) ? next.delete(areaId) : next.add(areaId);
      return next;
    });
  };

  return (
    <div className={styles.tasks}>
      <header className={styles.tasksIntroduction}>
        <h2>Forms and objects</h2>
        <p>Customize object pages, navigation, commands, and search pages and filters. Expand an area to get started.</p>
      </header>

      <div className={styles.customizationAreas}>
        {customizationAreas.map((area) => {
          const expanded = expandedAreas.has(area.id);
          const panelId = `customization-area-${area.id}`;
          return (
            <section key={area.id} className={styles.customizationArea}>
              <button
                type="button"
                className={styles.areaHeader}
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => toggleArea(area.id)}
              >
                <span className={`${styles.areaCaret} ${expanded ? styles.areaCaretExpanded : ''}`}>
                  <Icon name="CaretDown" size="16px" />
                </span>
                <span className={styles.areaIcon}><Icon name={area.icon} size="20px" /></span>
                <span className={styles.areaHeading}>
                  <strong>{area.title}</strong>
                  <span>{area.description}</span>
                </span>
              </button>

              <div
                id={panelId}
                className={`${styles.accordionMotion} ${expanded ? styles.accordionMotionExpanded : ''}`}
                aria-hidden={!expanded}
                inert={!expanded}
              >
                <div className={styles.accordionMotionInner}>
                  <div className={styles.areaPanel}>
                    {area.id === 'object-pages' ? (
                      <>
                        <div className={styles.areaGuidance}>
                          <p><strong>Forms:</strong> Forms are a set of pages associated with a command that requires data entry. Customize a form by adding or removing entries.</p>
                          <p><strong>Entries:</strong> Each entry displays or modifies object attributes or properties. Rearrange entries or adjust their behavior as needed.</p>
                        </div>
                        <div className={styles.searchRow}>
                          <TextInput
                            iconLead="MagnifyingGlass"
                            placeholder="Search by entry name"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            aria-label="Search object pages"
                          />
                          <Button variant="secondary" iconOnly aria-label="Filter object pages">
                            <Icon name="FunnelSimple" size="16px" />
                          </Button>
                        </div>
                        <ObjectPageTable templates={templates} query={query} />
                      </>
                    ) : (
                      <p className={styles.areaPlaceholder}>{area.description}</p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <div className={styles.insightsGroup}>
        <section className={styles.insights}>
          <button
            type="button"
            className={styles.areaHeader}
            aria-expanded={insightsExpanded}
            aria-controls="customization-insights"
            onClick={() => setInsightsExpanded((current) => !current)}
          >
            <span className={`${styles.areaCaret} ${insightsExpanded ? styles.areaCaretExpanded : ''}`}>
              <Icon name="CaretDown" size="16px" />
            </span>
            <span className={styles.areaIcon}><Icon name="Info" size="20px" /></span>
            <span className={styles.areaHeading}>
              <strong>Customization insights</strong>
              <span>Forms, entries, navigation and commands · Expand for an explanation whenever you need it</span>
            </span>
          </button>
          <div
            id="customization-insights"
            className={`${styles.accordionMotion} ${insightsExpanded ? styles.accordionMotionExpanded : ''}`}
            aria-hidden={!insightsExpanded}
            inert={!insightsExpanded}
          >
            <div className={styles.accordionMotionInner}>
              <div className={styles.insightsPanel}>
                <p><strong>Forms:</strong> Forms are a set of pages associated with a command that requires data entry.</p>
                <p><strong>Entries:</strong> Entries display or modify object attributes and can be rearranged or adjusted.</p>
                <p><strong>Navigation:</strong> Menus can be customized by adding or removing commands for each object type.</p>
                <p><strong>Commands:</strong> Commands perform tasks and can have associated pages customized.</p>
              </div>
            </div>
          </div>
        </section>
        <p className={styles.insightsHint}>Keep the guidance closed while you work. It is always available here.</p>
      </div>
    </div>
  );
}

function ObjectPageTable({ templates, query }: { templates: ObjectTemplate[]; query: string }) {
  return (
    <div className={styles.objectTable}>
      {templates.map((item) => (
        <button type="button" key={item.id} className={styles.objectRow} onClick={() => navigate(`#/customization/objects/${item.id}`)}>
          <span className={styles.objectName}><Icon name={item.icon} size="24px" /><strong>{item.name}</strong></span>
          <span>{item.objectType}</span>
        </button>
      ))}
      {templates.length === 0 && <p className={styles.empty}>No object pages match “{query}”.</p>}
    </div>
  );
}

interface SettingsState {
  productLink: string;
  companyLink: string;
  userNameFormat: string;
  hideObjectPath: boolean;
  applicationColor: string;
  theme: 'light' | 'dark' | 'high-contrast';
}

const DEFAULT_SETTINGS: SettingsState = {
  productLink: '',
  companyLink: '',
  userNameFormat: '@{1}@',
  hideObjectPath: false,
  applicationColor: '#00A6F4',
  theme: 'light',
};

function GlobalSettings() {
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [logoResetVersion, setLogoResetVersion] = useState(0);
  const [settings, setSettings] = useState<SettingsState>(() => {
    try {
      const saved = localStorage.getItem('ars.customization.global-settings');
      if (!saved) return DEFAULT_SETTINGS;
      const parsed: unknown = JSON.parse(saved);
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Stored global settings have an invalid shape.');
      }
      const candidate = parsed as Partial<SettingsState>;
      if (
        (candidate.productLink !== undefined && typeof candidate.productLink !== 'string') ||
        (candidate.companyLink !== undefined && typeof candidate.companyLink !== 'string') ||
        (candidate.userNameFormat !== undefined && typeof candidate.userNameFormat !== 'string') ||
        (candidate.hideObjectPath !== undefined && typeof candidate.hideObjectPath !== 'boolean') ||
        (candidate.applicationColor !== undefined && (typeof candidate.applicationColor !== 'string' || !isHexColor(candidate.applicationColor))) ||
        (candidate.theme !== undefined && !['light', 'dark', 'high-contrast'].includes(candidate.theme))
      ) {
        throw new Error('Stored global settings have invalid values.');
      }
      return {
        ...DEFAULT_SETTINGS,
        ...candidate,
        userNameFormat: candidate.userNameFormat && !['display', 'logon'].includes(candidate.userNameFormat)
          ? candidate.userNameFormat
          : DEFAULT_SETTINGS.userNameFormat,
      };
    } catch (error) {
      console.error('Unable to load global customization settings.', error);
      return DEFAULT_SETTINGS;
    }
  });

  const setLink = (field: 'productLink' | 'companyLink') => (value: string) =>
    setSettings((current) => ({ ...current, [field]: value }));

  const publish = () => {
    if (!isHexColor(settings.applicationColor)) {
      showToast('Enter a valid six-digit hex color before publishing.');
      return;
    }
    try {
      localStorage.setItem('ars.customization.global-settings', JSON.stringify(settings));
      showToast('Branding and appearance settings published.');
    } catch (error) {
      console.error('Unable to save global customization settings.', error);
      showToast('Branding and appearance settings could not be published.');
    }
  };

  return (
    <div className={styles.settingsPage}>
      <header className={styles.settingsIntroduction}>
        <h2>Branding and appearance</h2>
        <p>Manage logos, interface preferences, and the color scheme.</p>
      </header>

      <div className={styles.settingsCards}>
        <section className={`${styles.settingsCard} ${styles.brandingCard}`}>
          <h3>Logos and links</h3>
          <div className={styles.logoControls}>
            <LogoSetting
              title="Product logo image"
              description="Must be 110 pixels wide by 22 pixels high"
              linkLabel="Hyperlink on the product logo image"
              linkValue={settings.productLink}
              onLinkChange={setLink('productLink')}
              accept="image/*"
              resetVersion={logoResetVersion}
            />
            <LogoSetting
              title="Company logo image"
              description="Must be 47 pixels wide by 47 pixels high"
              linkLabel="Hyperlink on the company logo image"
              linkValue={settings.companyLink}
              onLinkChange={setLink('companyLink')}
              accept="image/*"
              resetVersion={logoResetVersion}
            />
            <LogoSetting
              title="Web interface site icon"
              description="ICO image, square in size"
              supportingText="ICO image · square · at least 16 × 16 pixels"
              accept=".ico,image/x-icon"
              resetVersion={logoResetVersion}
            />
          </div>
        </section>

        <section className={styles.settingsCard}>
          <h3>Interface preferences</h3>
          <label className={styles.userNameFormat}>
            <span className={styles.fieldLabel}>
              Logged-on user name format
              <Tooltip label="Controls how the logged-on user name is displayed.">
                <button type="button" className={styles.infoButton} aria-label="About logged-on user name format">
                  <Icon name="Info" size="16px" />
                </button>
              </Tooltip>
            </span>
            <TextInput
              value={settings.userNameFormat}
              onChange={(event) => setSettings((current) => ({ ...current, userNameFormat: event.target.value }))}
              aria-label="Logged-on user name format"
            />
          </label>
          <label className={styles.checkboxLabel}>
            <Checkbox
              checked={settings.hideObjectPath}
              onChange={(checked) => setSettings((current) => ({ ...current, hideObjectPath: checked }))}
              ariaLabel="Hide path to object"
            />
            <span>Hide path to object (breadcrumb navigation), to prevent viewing object location</span>
          </label>
        </section>

        <section className={styles.settingsCard}>
          <h3>Color scheme</h3>
          <div className={styles.colorScheme}>
            <div className={styles.settingDescription}>
              <strong>Application colors</strong>
              <span>Default palette shown</span>
            </div>
            <div className={styles.paletteControl}>
              <label className={styles.colorPicker}>
                <img src="/customization/saturation-brightness.png" alt="" />
                <input
                  ref={colorInputRef}
                  type="color"
                  value={isHexColor(settings.applicationColor) ? settings.applicationColor : DEFAULT_SETTINGS.applicationColor}
                  onChange={(event) => setSettings((current) => ({ ...current, applicationColor: event.target.value.toUpperCase() }))}
                  aria-label="Choose application color"
                />
              </label>
              <div className={styles.paletteSwatches} aria-label="Application color presets">
                {['#F0F9FF', '#74D4FF', '#00A6F4', '#00598A'].map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={styles.paletteSwatch}
                    style={{ backgroundColor: color }}
                    aria-label={`Use ${color}`}
                    aria-pressed={settings.applicationColor.toUpperCase() === color}
                    onClick={() => setSettings((current) => ({ ...current, applicationColor: color }))}
                  />
                ))}
              </div>
            </div>
            <div className={styles.colorValue}>
              <strong>Current color</strong>
              <div className={styles.hexControl}>
                <span
                  className={styles.currentColor}
                  style={{ backgroundColor: isHexColor(settings.applicationColor) ? settings.applicationColor : DEFAULT_SETTINGS.applicationColor }}
                  aria-hidden="true"
                />
                <TextInput
                  value={settings.applicationColor}
                  onChange={(event) => setSettings((current) => ({ ...current, applicationColor: event.target.value.toUpperCase() }))}
                  aria-label="Hex color value"
                />
                <IconButton icon="Eyedropper" ariaLabel="Pick application color" onClick={() => colorInputRef.current?.click()} />
              </div>
              <span>Hex color value</span>
            </div>
          </div>
        </section>

        <section className={styles.settingsCard}>
          <h3>Theme scheme</h3>
          <p className={styles.themeHelp}>Choose the interface theme. Light is selected by default.</p>
          <div className={styles.themeCards}>
            <ThemeCard
              value="light"
              label="Light"
              description="Default · High readability"
              selected={settings.theme === 'light'}
              onSelect={() => setSettings((current) => ({ ...current, theme: 'light' }))}
            />
            <ThemeCard
              value="dark"
              label="Dark"
              description="Reduced eye strain in low light"
              selected={settings.theme === 'dark'}
              onSelect={() => setSettings((current) => ({ ...current, theme: 'dark' }))}
            />
            <ThemeCard
              value="high-contrast"
              label="High Contrast"
              description="Maximum contrast · Accessibility"
              selected={settings.theme === 'high-contrast'}
              onSelect={() => setSettings((current) => ({ ...current, theme: 'high-contrast' }))}
            />
          </div>
        </section>
      </div>
      <div className={styles.settingsFooter}>
        <Button
          size="s"
          variant="secondary"
          onClick={() => {
            setSettings(DEFAULT_SETTINGS);
            setLogoResetVersion((current) => current + 1);
          }}
        >
          Reset to default
        </Button>
        <Button size="s" onClick={publish}>Publish</Button>
      </div>
    </div>
  );
}

function LogoSetting({
  title,
  description,
  linkLabel,
  linkValue,
  onLinkChange,
  supportingText,
  accept,
  resetVersion,
}: {
  title: string;
  description: string;
  linkLabel?: string;
  linkValue?: string;
  onLinkChange?: (value: string) => void;
  supportingText?: string;
  accept: string;
  resetVersion: number;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [resetVersion]);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const nextUrl = URL.createObjectURL(file);
    setPreviewUrl(nextUrl);
  };

  return (
    <div className={styles.logoSetting}>
      <div className={styles.settingDescription}>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
      <div className={styles.imageControl}>
        <div className={styles.logoPreview}>
          {previewUrl ? <img src={previewUrl} alt={`${title} preview`} /> : <BrandLogo size="24px" />}
        </div>
        <label className={styles.uploadControl}>
          <Icon name="UploadSimple" size="20px" />
          <span className={styles.visuallyHidden}>Upload {title.toLowerCase()}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
        </label>
      </div>
      {linkLabel && onLinkChange ? (
        <label className={styles.linkControl}>
          <span className={styles.fieldLabel}>{linkLabel}</span>
          <TextInput value={linkValue ?? ''} onChange={(event) => onLinkChange(event.target.value)} placeholder="Default address" />
        </label>
      ) : (
        <p className={styles.logoSupportingText}>{supportingText}</p>
      )}
    </div>
  );
}

function ThemeCard({
  value,
  label,
  description,
  selected,
  onSelect,
}: {
  value: SettingsState['theme'];
  label: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <label className={`${styles.themeCard} ${selected ? styles.themeCardSelected : ''}`}>
      <span className={styles.themeCardHeader}>
        <input
          className={styles.visuallyHidden}
          type="radio"
          name="theme-scheme"
          value={value}
          checked={selected}
          onChange={onSelect}
        />
        <strong>{label}</strong>
      </span>
      <span className={`${styles.themePreview} ${styles[`themePreview_${value}`]}`}>
        <span className={styles.themePreviewNav}><i /><b /></span>
        <span className={styles.themePreviewContent} />
        <span className={styles.themePreviewSwatches}><i /><i /><i /><i /></span>
      </span>
      <span className={styles.themeDescription}>{description}</span>
    </label>
  );
}

function isHexColor(value: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(value);
}

function ObjectPages() {
  const [query, setQuery] = useState('');
  const templates = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return !normalized
      ? OBJECT_TEMPLATES
      : OBJECT_TEMPLATES.filter((item) => `${item.name} ${item.objectType}`.toLowerCase().includes(normalized));
  }, [query]);

  return (
    <>
      <ContentHeader
        variant="detail"
        icon="File"
        title="Object Pages"
        onBack={() => navigate('#/customization')}
        backLabel="Back to Customization"
      />
      <div className={styles.objectPages}>
        <div className={styles.searchRow}>
          <TextInput iconLead="MagnifyingGlass" placeholder="Search by entry name" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search object pages" />
          <Button variant="secondary" iconOnly aria-label="Filter object pages"><Icon name="FunnelSimple" size="16px" /></Button>
        </div>
        <ObjectPageTable templates={templates} query={query} />
      </div>
    </>
  );
}

function ObjectEditor({ template, initiallyOpenModal }: { template: ObjectTemplate; initiallyOpenModal: boolean }) {
  const storageKey = customizationStorageKey(template.id);
  const tabItems = template.tabs.map((label, index) => ({ value: `${index}:${label}`, label }));
  const [entries, setEntries] = useState<CustomizationEntry[]>(() => loadCustomizedEntries(template));
  const [activeTab, setActiveTab] = useState(tabItems[0]?.value ?? '');
  const [query, setQuery] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [entryDraft, setEntryDraft] = useState<CustomizationEntry | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(initiallyOpenModal);

  useEffect(() => {
    setEntries(loadCustomizedEntries(template));
    setActiveTab(tabItems[0]?.value ?? '');
    setSelectedEntryId(null);
    setEntryDraft(null);
    setModalOpen(initiallyOpenModal);
  }, [initiallyOpenModal, storageKey, template]);

  const persistEntries = (next: CustomizationEntry[]): boolean => {
    if (!saveCustomizedEntries(template, next)) {
      showToast(`Changes to ${template.name} could not be saved.`);
      return false;
    }
    setEntries(next);
    return true;
  };
  const visibleEntries = entries.filter((entry) => entry.label.toLowerCase().includes(query.trim().toLowerCase()));
  const openEntry = (entry: CustomizationEntry) => {
    setSelectedEntryId(entry.id);
    setEntryDraft({ ...entry });
  };
  const closeEntry = () => {
    setSelectedEntryId(null);
  };
  const saveEntry = () => {
    if (!entryDraft) return;
    if (!persistEntries(entries.map((entry) => entry.id === entryDraft.id ? entryDraft : entry))) return;
    showToast(`${entryDraft.label} saved.`);
    closeEntry();
  };
  const addEntry = (entry: CustomizationEntry) => {
    const next = [entry, ...entries];
    if (!persistEntries(next)) return;
    openEntry(entry);
    showToast(`${entry.label} added to ${template.name}.`);
  };
  const moveEntry = (entryId: string, targetIndex: number) => {
    const sourceIndex = entries.findIndex((entry) => entry.id === entryId);
    const boundedIndex = Math.max(0, Math.min(entries.length - 1, targetIndex));
    if (sourceIndex < 0 || sourceIndex === boundedIndex) return;
    const next = [...entries];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(boundedIndex, 0, moved);
    persistEntries(next);
  };

  return (
    <>
      <ContentHeader
        variant="detail"
        icon="FolderStar"
        title={template.name}
        subtitle="Form"
        onBack={() => navigate('#/customization')}
        backLabel="Back to Forms and objects"
        tabs={<Tabs items={tabItems} value={activeTab} onChange={setActiveTab} ariaLabel={`${template.name} sections`} />}
      />
      <div className={styles.editor}>
        <div className={styles.editorToolbar}>
          <TextInput iconLead="MagnifyingGlass" placeholder="Search by entry name" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search entries" />
          <Button variant="secondary" iconOnly aria-label="Filter entries"><Icon name="FunnelSimple" size="16px" /></Button>
          <Button iconLead="Plus" iconTrail="CaretDown" onClick={() => setModalOpen(true)}>Add entry</Button>
        </div>
        <div className={styles.entryTable} role="table" aria-label={`${template.name} entries`}>
          <div className={styles.entryTableHeader} role="row">
            <span role="columnheader" aria-label="Drag handle" />
            <span role="columnheader">Order</span>
            <span role="columnheader">Entry Name</span>
            <span role="columnheader">Property</span>
            <span role="columnheader">Entry Type</span>
            <span role="columnheader" aria-label="Actions" />
          </div>
          <div className={styles.entryTableBody} role="rowgroup">
            {visibleEntries.map((entry) => {
              const entryIndex = entries.findIndex((item) => item.id === entry.id);
              return (
              <div
                key={entry.id}
                className={`${styles.entryTableRow} ${draggedId === entry.id ? styles.entryRowDragging : ''}`}
                role="row"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const sourceId = event.dataTransfer.getData('text/plain') || draggedId;
                  if (sourceId) moveEntry(sourceId, entryIndex);
                  setDraggedId(null);
                }}
              >
                <span role="cell" className={styles.entryControlCell}>
                  <span
                    className={styles.dragHandle}
                    draggable
                    aria-hidden="true"
                    onDragStart={(event) => {
                      setDraggedId(entry.id);
                      event.dataTransfer.setData('text/plain', entry.id);
                    }}
                    onDragEnd={() => setDraggedId(null)}
                  >
                    <Icon name="DotsSixVertical" size="20px" />
                  </span>
                </span>
                <span role="cell" className={styles.entryControlCell}>
                  <EntryOrderInput
                    key={`${entry.id}:${entryIndex}`}
                    label={entry.label}
                    position={entryIndex + 1}
                    total={entries.length}
                    onCommit={(position) => moveEntry(entry.id, position - 1)}
                  />
                </span>
                <span role="cell" className={styles.entryNameCell}>
                  <button
                    type="button"
                    className={styles.entryName}
                    onClick={() => openEntry(entry)}
                    onKeyDown={(event) => {
                      if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
                      event.preventDefault();
                      moveEntry(entry.id, entryIndex + (event.key === 'ArrowUp' ? -1 : 1));
                    }}
                    aria-label={`${entry.label}. Press Alt+Up or Alt+Down to reorder.`}
                  >
                    <Icon name="FolderStar" size="16px" />
                    <span>{entry.label}</span>
                  </button>
                </span>
                <span role="cell" className={styles.entryCellText}>{entry.property}</span>
                <span role="cell" className={styles.entryCellText}>{entry.dataType}</span>
                <span role="cell" className={styles.entryActions}>
                  <IconButton
                    icon="DotsThreeOutline"
                    ariaLabel={`Edit ${entry.label}`}
                    variant="ghost"
                    size="s"
                    onClick={() => openEntry(entry)}
                  />
                </span>
              </div>
            )})}
            {visibleEntries.length === 0 && (
              <div role="row">
                <p role="cell" className={styles.empty}>No entries are configured for this section.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <SideSheet
        open={selectedEntryId !== null && entryDraft !== null}
        onClose={closeEntry}
        title={entryDraft?.label ?? 'Entry details'}
        className={styles.entrySideSheet}
        bodyClassName={styles.entrySideSheetBody}
        footer={(
          <>
            <Button variant="secondary" onClick={closeEntry}>Cancel</Button>
            <Button
              onClick={saveEntry}
              disabled={!entryDraft?.label.trim() || !entryDraft.tooltip.trim()}
            >
              Save
            </Button>
          </>
        )}
      >
        {entryDraft && <EntryDetails entry={entryDraft} onChange={setEntryDraft} />}
      </SideSheet>
      <CreateEntryModal open={modalOpen} template={template} onClose={() => setModalOpen(false)} onCreate={addEntry} />
    </>
  );
}

function EntryOrderInput({ label, position, total, onCommit }: { label: string; position: number; total: number; onCommit: (position: number) => void }) {
  const [draft, setDraft] = useState(String(position));

  const commit = () => {
    const parsed = Number.parseInt(draft, 10);
    if (Number.isNaN(parsed)) {
      setDraft(String(position));
      return;
    }
    const bounded = Math.max(1, Math.min(total, parsed));
    setDraft(String(bounded));
    if (bounded !== position) onCommit(bounded);
  };

  return (
    <input
      className={styles.orderInput}
      type="text"
      inputMode="numeric"
      maxLength={2}
      value={draft}
      aria-label={`Order position for ${label}, ${position} of ${total}`}
      onChange={(event) => setDraft(event.target.value.replace(/\D/g, '').slice(0, 2))}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commit();
        }
        if (event.key === 'Escape') setDraft(String(position));
      }}
    />
  );
}

function EntryDetails({ entry, onChange }: { entry: CustomizationEntry; onChange: (entry: CustomizationEntry) => void }) {
  const [detailTab, setDetailTab] = useState('general');
  return (
    <div className={styles.entryDetails}>
      <Tabs items={[{ value: 'general', label: 'General' }, { value: 'advanced', label: 'Advanced' }]} value={detailTab} onChange={setDetailTab} ariaLabel={`${entry.label} settings`} />
      {detailTab === 'general' ? (
        <div className={styles.entryForm}>
          <FormField label="Entry Name" required><TextInput value={entry.label} onChange={(event) => onChange({ ...entry, label: event.target.value })} /></FormField>
          <FormField label="Entry description"><TextInput value={entry.description} onChange={(event) => onChange({ ...entry, description: event.target.value })} /></FormField>
          <FormField label="Entry ToolTip" required><TextInput value={entry.tooltip} onChange={(event) => onChange({ ...entry, tooltip: event.target.value })} /></FormField>
          <FormField label="Entry type">
            <select className={styles.nativeSelect} value={entry.dataType} onChange={(event) => onChange({ ...entry, dataType: event.target.value as CustomizationEntry['dataType'] })}>
              {(['Auto', 'Text', 'Number', 'Boolean', 'Date'] as const).map((type) => <option key={type}>{type}</option>)}
            </select>
          </FormField>
          <FormField label="Property:"><TextInput value={entry.property} readOnly /></FormField>
          <CheckLabel label="Treat as single-valued" checked={entry.singleValued ?? false} onChange={(checked) => onChange({ ...entry, singleValued: checked })} />
          <CheckLabel label="Read only" checked={entry.readOnly ?? false} onChange={(checked) => onChange({ ...entry, readOnly: checked })} />
        </div>
      ) : (
        <div className={styles.entryForm}>
          <CheckLabel label="Required" checked={entry.required ?? false} onChange={(checked) => onChange({ ...entry, required: checked })} />
          <p className={styles.advancedCopy}>Validation continues to use the behavior defined by the product form.</p>
        </div>
      )}
    </div>
  );
}

function CreateEntryModal({ open, template, onClose, onCreate }: { open: boolean; template: ObjectTemplate; onClose: () => void; onCreate: (entry: CustomizationEntry) => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [property, setProperty] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [showLdap, setShowLdap] = useState(false);
  const [draft, setDraft] = useState({ name: '', description: '', tooltip: '', type: 'Auto' as CustomizationEntry['dataType'], readOnly: false, singleValued: false });

  useEffect(() => {
    if (open) {
      setStep(1);
      setProperty('');
      setShowAll(false);
      setShowLdap(false);
      setDraft({ name: '', description: '', tooltip: '', type: 'Auto', readOnly: false, singleValued: false });
    }
  }, [open]);

  const close = () => {
    onClose();
    if (window.location.hash.endsWith('/new')) navigate(`#/customization/objects/${template.id}`);
  };

  const save = () => {
    onCreate({
      id: `custom-${Date.now()}`,
      label: draft.name.trim(),
      property,
      description: draft.description.trim(),
      tooltip: draft.tooltip.trim(),
      dataType: draft.type,
      readOnly: draft.readOnly,
      singleValued: draft.singleValued,
    });
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Create New Entry"
      subtitle={template.name}
      leadingIcon="User"
      size="l"
      className={styles.entryModal}
      bodyClassName={styles.entryModalBody}
      footer={
        <div className={styles.modalFooter}>
          <span>Step {step} of 2</span>
          <Button
            disabled={step === 1 ? !property : !draft.name.trim() || !draft.tooltip.trim()}
            iconTrail="ArrowRight"
            onClick={() => step === 1 ? setStep(2) : save()}
          >
            {step === 1 ? 'Save and continue' : 'Create entry'}
          </Button>
        </div>
      }
    >
      <div className={styles.modalMain}>
        <div className={styles.modalForm}>
          <Tabs
            items={[{ value: '1', label: 'Managed Property', counter: 1 }, { value: '2', label: 'Properties', counter: 2 }]}
            value={String(step)}
            onChange={(value) => value === '1' || property ? setStep(Number(value) as 1 | 2) : undefined}
            ariaLabel="Create entry steps"
          />
          {step === 1 ? (
            <div className={styles.modalFields}>
              <FormField label="Property" required>
                <select className={styles.nativeSelect} value={property} onChange={(event) => {
                  const value = event.target.value;
                  setProperty(value);
                  const label = value.replace(/^edsva-/, '').replace(/([A-Z])/g, ' $1').trim();
                  setDraft((current) => ({ ...current, name: label || current.name, tooltip: label || current.tooltip }));
                }}>
                  <option value="">Select a property for this entry……</option>
                  <option value="edsva-SMExch-AcceptMessagesOnlyForm">edsva-SMExch-AcceptMessagesOnlyForm</option>
                  {showAll && template.entries.map((entry) => <option key={entry.property} value={entry.property}>{showLdap ? entry.property : entry.label}</option>)}
                </select>
              </FormField>
              <CheckLabel label="Show all possible properties" checked={showAll} onChange={setShowAll} />
              <CheckLabel label="Show LDAP display names" checked={showLdap} onChange={setShowLdap} />
            </div>
          ) : (
            <div className={styles.modalFields}>
              <FormField label="Entry name" required><TextInput value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></FormField>
              <FormField label="Entry description"><TextInput value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} /></FormField>
              <FormField label="Entry ToolTip" required><TextInput value={draft.tooltip} onChange={(event) => setDraft((current) => ({ ...current, tooltip: event.target.value }))} /></FormField>
              <FormField label="Entry type">
                <select className={styles.nativeSelect} value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as CustomizationEntry['dataType'] }))}>
                  {(['Auto', 'Text', 'Number', 'Boolean', 'Date'] as const).map((type) => <option key={type}>{type}</option>)}
                </select>
              </FormField>
              <FormField label="Property:"><TextInput value={property} readOnly /></FormField>
              <CheckLabel label="Treat as single-valued" checked={draft.singleValued} onChange={(checked) => setDraft((current) => ({ ...current, singleValued: checked }))} />
              <CheckLabel label="Read only" checked={draft.readOnly} onChange={(checked) => setDraft((current) => ({ ...current, readOnly: checked }))} />
            </div>
          )}
        </div>
        <aside className={styles.modalHelp}>
          <h3>Create new entry</h3>
          <p>Create a new entry for this object form. Configure its managed property and the behavior shown on the property page.</p>
        </aside>
      </div>
    </Modal>
  );
}

function CheckLabel({
  label,
  checked,
  readOnly,
  onChange,
}: {
  label: string;
  checked: boolean;
  readOnly?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <label className={styles.checkLabel}>
      <Checkbox
        checked={checked}
        onChange={readOnly ? undefined : onChange}
        disabled={readOnly}
        ariaLabel={label}
      />
      <span>{label}</span>
    </label>
  );
}
