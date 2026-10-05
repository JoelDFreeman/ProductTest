import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../AppShell/AppShell.js';
import { Button } from '../../components/Button/Button.js';
import { Checkbox } from '../../components/Checkbox/Checkbox.js';
import { ContentHeader } from '../../components/ContentHeader/ContentHeader.js';
import { FormField } from '../../components/FormField/FormField.js';
import { Icon } from '../../components/Icon/Icon.js';
import { Modal } from '../../components/Modal/Modal.js';
import { PageMenu } from '../../components/PageMenu/PageMenu.js';
import { Tabs } from '../../components/Tabs/Tabs.js';
import { TextInput } from '../../components/TextInput/TextInput.js';
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

const primaryTabs = [
  { value: 'tasks', label: 'Customization tasks', icon: 'PaintBrush' },
  { value: 'settings', label: 'Global settings', icon: 'GlobeSimple' },
];

const taskCards = [
  { title: 'Object Pages', subtitle: 'Forms, tabs, sections', icon: 'Files', href: '#/customization/object-pages' },
  { title: 'Navigation', subtitle: 'Menus & navigation', icon: 'TreeStructure' },
  { title: 'Commands', subtitle: 'Actions & commands', icon: 'TerminalWindow' },
  { title: 'Search and filtering', subtitle: 'Search pages & filters', icon: 'MagnifyingGlass' },
];

export function CustomizationPage({
  section = 'home',
  objectId = 'user',
}: CustomizationPageProps) {
  const normalizedSection = section === 'home' ? 'tasks' : section;
  const isWorkspace = normalizedSection === 'tasks' || normalizedSection === 'settings';
  const template = getObjectTemplate(objectId) ?? OBJECT_TEMPLATES.find((item) => item.id === 'user')!;

  return (
    <AppShell
      breadcrumb={
        isWorkspace
          ? [{ label: 'Customization' }]
          : [
              { label: 'Customization', onClick: () => navigate('#/customization') },
              ...(normalizedSection === 'object-pages'
                ? [{ label: 'Object Pages' }]
                : [
                    { label: 'Directory objects', onClick: () => navigate('#/customization/object-pages') },
                    { label: template.name },
                  ]),
            ]
      }
      activeGlobalItem="customization"
      showSecondarySidebar={false}
    >
      {isWorkspace ? (
        <CustomizationWorkspace section={normalizedSection as 'tasks' | 'settings'} />
      ) : normalizedSection === 'object-pages' ? (
        <ObjectPages />
      ) : (
        <ObjectEditor template={template} initiallyOpenModal={normalizedSection === 'new-entry'} />
      )}
    </AppShell>
  );
}

function CustomizationWorkspace({ section }: { section: 'tasks' | 'settings' }) {
  return (
    <>
      <ContentHeader
        icon="Wrench"
        title="Customization"
        actions={<PageMenu favoriteLabel="Add page to Favorites" />}
      />
      <div className={styles.workspace}>
        <Tabs
          items={primaryTabs}
          value={section}
          onChange={(value) => navigate(value === 'settings' ? '#/customization/settings' : '#/customization')}
          ariaLabel="Customization sections"
        />
        {section === 'tasks' ? <CustomizationTasks /> : <GlobalSettings />}
      </div>
    </>
  );
}

function CustomizationTasks() {
  return (
    <div className={styles.tasks}>
      <div className={styles.taskGrid}>
        {taskCards.map((card) => (
          <button
            type="button"
            key={card.title}
            className={styles.taskCard}
            onClick={() => card.href ? navigate(card.href) : showToast(`${card.title} customization is not available in this prototype.`)}
          >
            <span className={styles.taskCardHeader}>
              <span className={styles.taskIcon}><Icon name={card.icon} size="24px" /></span>
              <strong>{card.title}</strong>
              <Icon name="CaretRight" size="16px" className={styles.taskCaret} />
            </span>
            <span className={styles.taskSubtitle}>{card.subtitle}</span>
          </button>
        ))}
      </div>
      <section className={styles.infoPanel}>
        <Icon name="Info" size="20px" />
        <div>
          <strong>Customization includes the management of menus, commands, forms and extras, and can be customized as follows:</strong>
          <p><b>Forms:</b> Forms or a set of pages associated with a command that requires data entry. You can customize a form by adding or removing entries.</p>
          <p><b>Entries:</b> Each entry is intended to view or modify certain portions of directory data referred to as object attributes or properties. You can rearrange entries or adjust their behavior as needed.</p>
          <p><b>Navigation:</b> For each object type, such as User or Group, the interface displays a menu consisting of commands. You can customize a menu by adding or removing commands.</p>
          <p><b>Commands:</b> Each command on a menu is intended to perform a certain task, such as displaying property pages. You can customize pages associated with a command.</p>
        </div>
      </section>
    </div>
  );
}

interface SettingsState {
  productLink: string;
  companyLink: string;
  userNameFormat: 'display' | 'logon';
}

function GlobalSettings() {
  const [settings, setSettings] = useState<SettingsState>(() => {
    const defaults: SettingsState = { productLink: '', companyLink: '', userNameFormat: 'display' };
    try {
      const saved = localStorage.getItem('ars.customization.global-settings');
      if (!saved) return defaults;
      const parsed: unknown = JSON.parse(saved);
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        typeof (parsed as SettingsState).productLink !== 'string' ||
        typeof (parsed as SettingsState).companyLink !== 'string' ||
        !['display', 'logon'].includes((parsed as SettingsState).userNameFormat)
      ) {
        throw new Error('Stored global settings have an invalid shape.');
      }
      return parsed as SettingsState;
    } catch (error) {
      console.error('Unable to load global customization settings.', error);
      return defaults;
    }
  });

  const setLink = (field: 'productLink' | 'companyLink') => (value: string) =>
    setSettings((current) => ({ ...current, [field]: value }));

  const save = () => {
    try {
      localStorage.setItem('ars.customization.global-settings', JSON.stringify(settings));
      showToast('Global customization settings saved.');
    } catch (error) {
      console.error('Unable to save global customization settings.', error);
      showToast('Global customization settings could not be saved.');
    }
  };

  return (
    <div className={styles.settingsPage}>
      <div className={styles.settingsRows}>
        <LogoSetting label="Product logo image (must be 110 pixels wide by 22 pixels high):" />
        <LinkSetting label="Hyperlink on the product logo image:" value={settings.productLink} onChange={setLink('productLink')} />
        <LogoSetting label="Company logo image (must be 47 pixels wide by 47 pixels high):" />
        <LinkSetting label="Hyperlink on the company logo image:" value={settings.companyLink} onChange={setLink('companyLink')} />
        <LogoSetting label="Web interface site icon (ICO Image, square in size, at least 16x16 pixels):" />
        <fieldset className={styles.radioGroup}>
          <legend>Logged-on user name format:</legend>
          <label><input type="radio" name="name-format" checked={settings.userNameFormat === 'display'} onChange={() => setSettings((current) => ({ ...current, userNameFormat: 'display' }))} /> Display name</label>
          <label><input type="radio" name="name-format" checked={settings.userNameFormat === 'logon'} onChange={() => setSettings((current) => ({ ...current, userNameFormat: 'logon' }))} /> Logon name</label>
        </fieldset>
      </div>
      <div className={styles.settingsFooter}><Button size="s" onClick={save}>Save</Button></div>
    </div>
  );
}

function LogoSetting({ label }: { label: string }) {
  const [selected, setSelected] = useState(false);
  return (
    <div className={styles.settingRow}>
      <strong>{label}</strong>
      <div className={styles.logoPreview}>{selected ? <Icon name="Image" size="20px" /> : <Icon name="ImageSquare" size="16px" />}</div>
      <div className={styles.settingActions}>
        <Button size="s" onClick={() => setSelected(true)}>Change</Button>
        <Button size="s" variant="secondary" onClick={() => setSelected(false)}>Restore Default</Button>
      </div>
    </div>
  );
}

function LinkSetting({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className={styles.settingRow}>
      <strong>{label}</strong>
      <TextInput value={value} onChange={(event) => onChange(event.target.value)} placeholder="Default address" />
      <div className={styles.settingActions}>
        <Button size="s" onClick={() => onChange('')}>Clear</Button>
        <Button size="s" variant="secondary" onClick={() => onChange('')}>Restore Default</Button>
      </div>
    </div>
  );
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
        <div className={styles.objectTable}>
          {templates.map((item) => (
            <button type="button" key={item.id} className={styles.objectRow} onClick={() => navigate(`#/customization/objects/${item.id}`)}>
              <span className={styles.objectName}><Icon name={item.icon} size="20px" /><strong>{item.name}</strong></span>
              <span>{item.objectType}</span>
            </button>
          ))}
          {templates.length === 0 && <p className={styles.empty}>No object pages match “{query}”.</p>}
        </div>
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
  const [expanded, setExpanded] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(initiallyOpenModal);

  useEffect(() => {
    setEntries(loadCustomizedEntries(template));
    setActiveTab(tabItems[0]?.value ?? '');
    setExpanded(null);
  }, [storageKey, template]);

  const persistEntries = (next: CustomizationEntry[]) => {
    setEntries(next);
    if (!saveCustomizedEntries(template, next)) showToast(`Changes to ${template.name} could not be saved.`);
  };
  const visibleEntries = entries.filter((entry) => entry.label.toLowerCase().includes(query.trim().toLowerCase()));
  const addEntry = (entry: CustomizationEntry) => {
    const next = [entry, ...entries];
    persistEntries(next);
    setExpanded(entry.id);
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
        icon={template.icon}
        title={template.name}
        subtitle="Form"
        onBack={() => navigate('#/customization/object-pages')}
        backLabel="Back to Object Pages"
        tabs={<Tabs items={tabItems} value={activeTab} onChange={setActiveTab} ariaLabel={`${template.name} sections`} />}
      />
      <div className={styles.editor}>
        <div className={styles.editorToolbar}>
          <TextInput iconLead="MagnifyingGlass" placeholder="Search by entry name" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search entries" />
          <Button variant="secondary" iconOnly aria-label="Filter entries"><Icon name="FunnelSimple" size="16px" /></Button>
          <Button iconLead="Plus" iconTrail="CaretDown" onClick={() => setModalOpen(true)}>Add entry</Button>
        </div>
        <div className={styles.entryList}>
          {visibleEntries.map((entry) => {
            const entryIndex = entries.findIndex((item) => item.id === entry.id);
            return (
            <section
              key={entry.id}
              className={styles.entryRow}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                moveEntry(event.dataTransfer.getData('text/plain'), entryIndex);
              }}
            >
              <div className={styles.entryHeaderRow}>
                <span
                  className={styles.dragHandle}
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData('text/plain', entry.id)}
                  aria-hidden="true"
                >
                  <Icon name="DotsSixVertical" size="16px" />
                </span>
                <EntryOrderInput
                  key={`${entry.id}:${entryIndex}`}
                  label={entry.label}
                  position={entryIndex + 1}
                  total={entries.length}
                  onCommit={(position) => moveEntry(entry.id, position - 1)}
                />
                <button
                  type="button"
                  className={styles.entryHeader}
                  onClick={() => setExpanded((current) => current === entry.id ? null : entry.id)}
                  onKeyDown={(event) => {
                    if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
                    event.preventDefault();
                    moveEntry(entry.id, entryIndex + (event.key === 'ArrowUp' ? -1 : 1));
                  }}
                  aria-expanded={expanded === entry.id}
                  aria-label={`${entry.label}. Press Alt+Up or Alt+Down to reorder.`}
                >
                  <Icon name={expanded === entry.id ? 'CaretUp' : 'CaretDown'} size="16px" />
                  <strong>{entry.label}</strong>
                </button>
              </div>
              {expanded === entry.id && (
                <EntryDetails
                  entry={entry}
                  onChange={(updated) => persistEntries(entries.map((item) => item.id === updated.id ? updated : item))}
                />
              )}
            </section>
          )})}
          {visibleEntries.length === 0 && <p className={styles.empty}>No entries are configured for this section.</p>}
        </div>
      </div>
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
