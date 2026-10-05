import { useMemo, useState, type ChangeEvent } from 'react';
import { Button } from '../../components/Button/Button.js';
import { FormField } from '../../components/FormField/FormField.js';
import { Modal } from '../../components/Modal/Modal.js';
import { TextInput } from '../../components/TextInput/TextInput.js';
import { Stepper } from '../../components/Stepper/Stepper.js';
import { Icon } from '../../components/Icon/Icon.js';
import { getObjectTemplate, loadCustomizedEntries, type CustomizationEntry } from '../../lib/customizationSchemas.js';
import { useDirectory } from '../../lib/directoryStore.js';
import { MoveGroupsModal } from '../GroupsPage/MoveGroupsModal.js';
import styles from './NewUserModal.module.css';

export interface NewUserModalProps {
  open: boolean;
  onClose: () => void;
  objectKind: 'entra' | 'ad';
  directories: string[];
  onCreate: (draft: {
    firstName: string;
    lastName: string;
    initials: string;
    name: string;
    displayName: string;
    userLogonName: string;
    directory: string;
    location: string;
    inactive: boolean;
  }) => void;
}

interface Draft {
  firstName: string;
  lastName: string;
  initials: string;
  name: string;
  displayName: string;
  userLogonName: string;
  directory: string;
  location: string;
  suffix: string;
  preWindowsLogonName: string;
  password: string;
  confirmPassword: string;
}

const EMPTY_DRAFT: Draft = {
  firstName: '',
  lastName: '',
  initials: '',
  name: '',
  displayName: '',
  userLogonName: '',
  directory: 'Entra 1',
  location: '',
  suffix: '@Entra1',
  preWindowsLogonName: '',
  password: '',
  confirmPassword: '',
};

export function NewUserModal({ open, onClose, objectKind, directories, onCreate }: NewUserModalProps) {
  const { getPath } = useDirectory();
  const customizedEntries = useMemo(
    () => loadCustomizedEntries(getObjectTemplate('user')!),
    [open],
  );
  const customizedEntry = (id: string): CustomizationEntry | undefined =>
    customizedEntries.find((entry) => entry.id === id);
  const isRequired = (id: string, fallback = false) => customizedEntry(id)?.required ?? fallback;
  const inputType = (id: string): 'text' | 'number' | 'date' =>
    customizedEntry(id)?.dataType === 'Number' ? 'number' : customizedEntry(id)?.dataType === 'Date' ? 'date' : 'text';
  const customizationIndex = (id: string) => {
    const index = customizedEntries.findIndex((entry) => entry.id === id);
    return index < 0 ? Number.MAX_SAFE_INTEGER : index;
  };
  const generalRowIds = ['names', 'initials', 'displayName'].sort((left, right) => {
    const rank = (rowId: string) => rowId === 'names'
      ? Math.min(customizationIndex('firstName'), customizationIndex('lastName'))
      : customizationIndex(rowId);
    return rank(left) - rank(right);
  });
  const [draft, setDraft] = useState<Draft>(() => ({ ...EMPTY_DRAFT, directory: directories[0] ?? 'Entra 1' }));
  const [step, setStep] = useState<1 | 2>(1);
  const [furthestStep, setFurthestStep] = useState<1 | 2>(1);
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);
  const [accountOptions, setAccountOptions] = useState({
    changePassword: true,
    preventPasswordChange: false,
    passwordNeverExpires: false,
    disabled: false,
    openProperties: false,
  });

  const setField = (field: keyof Draft) => (event: ChangeEvent<HTMLInputElement>) => {
    setDraft((current) => ({ ...current, [field]: event.target.value }));
  };

  const canContinue = useMemo(() => {
    const baseValid = Boolean(
      (!isRequired('firstName', true) || draft.firstName.trim()) &&
      (!isRequired('lastName', true) || draft.lastName.trim()) &&
      draft.name.trim() &&
      (!isRequired('displayName', true) || draft.displayName.trim()) &&
      draft.userLogonName.trim(),
    );
    if (objectKind !== 'ad') return baseValid;
    return baseValid && Boolean(draft.preWindowsLogonName.trim()) && Boolean(draft.location.trim());
  }, [draft, objectKind, customizedEntries]);
  const canCreate = Boolean(draft.password && draft.password === draft.confirmPassword);

  const close = () => {
    setDraft({ ...EMPTY_DRAFT, directory: directories[0] ?? 'Entra 1' });
    setStep(1);
    setFurthestStep(1);
    onClose();
  };

  const renderGeneralRow = (rowId: string) => {
    if (rowId === 'names') {
      return (
        <div className={styles.twoColumn} key={rowId}>
          <FormField label={customizedEntry('firstName')?.label ?? 'First name'} required={isRequired('firstName', true)}>
            <TextInput type={inputType('firstName')} value={draft.firstName} onChange={setField('firstName')} readOnly={customizedEntry('firstName')?.readOnly} />
          </FormField>
          <FormField label={customizedEntry('lastName')?.label ?? 'Last name'} required={isRequired('lastName', true)}>
            <TextInput type={inputType('lastName')} value={draft.lastName} onChange={setField('lastName')} readOnly={customizedEntry('lastName')?.readOnly} />
          </FormField>
        </div>
      );
    }
    if (rowId === 'initials') {
      return (
        <FormField key={rowId} label={customizedEntry('initials')?.label ?? 'Initials'} required={isRequired('initials')}>
          <TextInput type={inputType('initials')} value={draft.initials} onChange={setField('initials')} readOnly={customizedEntry('initials')?.readOnly} />
        </FormField>
      );
    }
    return (
      <FormField key={rowId} label={customizedEntry('displayName')?.label ?? 'Display name'} required={isRequired('displayName', true)} helperText={customizedEntry('displayName')?.description || 'The name shown to other users.'}>
        <TextInput type={inputType('displayName')} value={draft.displayName} onChange={setField('displayName')} readOnly={customizedEntry('displayName')?.readOnly} />
      </FormField>
    );
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={objectKind === 'ad' ? 'New AD User' : 'New Entra User'}
      subtitle={draft.directory}
      leadingIcon="User"
      size="l"
      className={styles.modal}
      bodyClassName={styles.body}
      footer={
        <div className={styles.footerContent}>
          <span className={styles.step}>Step {step} of 2</span>
          <Button
            variant="primary"
            disabled={step === 1 ? !canContinue : !canCreate}
            onClick={() => {
              if (step === 1) {
                setStep(2);
                setFurthestStep(2);
                return;
              }
              onCreate({
                firstName: draft.firstName.trim(),
                lastName: draft.lastName.trim(),
                initials: draft.initials.trim(),
                name: draft.name.trim(),
                displayName: draft.displayName.trim(),
                userLogonName: draft.userLogonName.trim(),
                directory: draft.directory,
                location: draft.location,
                inactive: accountOptions.disabled,
              });
              close();
            }}
          >
            {step === 1 ? 'Save and continue' : 'Create object'}
          </Button>
        </div>
      }
    >
      <Stepper
        items={[{ label: 'General' }, { label: 'Account' }]}
        activeIndex={step - 1}
        completedThrough={furthestStep - 1}
        onStepChange={(index) => {
          const nextStep = (index + 1) as 1 | 2;
          setStep(nextStep);
          setFurthestStep((current) => Math.max(current, nextStep) as 1 | 2);
        }}
        ariaLabel="New user steps"
      />
      <div className={styles.content}>
        <div className={styles.form}>
        {step === 1 ? <>
          {renderGeneralRow(generalRowIds[0])}
          {renderGeneralRow(generalRowIds[1])}
          <FormField label="Name" required helperText="The object name used in the directory.">
            <TextInput value={draft.name} onChange={setField('name')} />
          </FormField>
          {renderGeneralRow(generalRowIds[2])}
          <div className={styles.twoColumnLogon}>
            <FormField label="User logon name" required helperText="The sign-in name for this user.">
              <TextInput value={draft.userLogonName} onChange={setField('userLogonName')} />
            </FormField>
            <FormField label="Directory" required>
              <select className={styles.directorySelect} value={draft.directory} onChange={(e) => setDraft((current) => ({ ...current, directory: e.target.value }))} aria-label="Directory">
                {directories.map((directory) => <option key={directory} value={directory}>{directory}</option>)}
              </select>
            </FormField>
          </div>
          {objectKind === 'ad' && (
            <FormField label="Location" required helperText="The organizational unit this user will be created in.">
              <button type="button" className={styles.folderButton} onClick={() => setFolderPickerOpen(true)}>
                <Icon name="FolderOpen" size="16px" />
                <span>{draft.location || 'Select destination folder'}</span>
              </button>
            </FormField>
          )}
          {objectKind === 'ad' && (
            <FormField label="User logon name (pre-Windows 2000)" required helperText="The legacy sign-in name.">
              <TextInput value={draft.preWindowsLogonName} onChange={setField('preWindowsLogonName')} />
            </FormField>
          )}
        </> : <>
          <h3 className={styles.sectionTitle}>Account</h3>
          <p className={styles.sectionHelp}>Manage logon information and settings.</p>
          <div className={styles.accountField}>
            <FormField label="Password" required>
              <TextInput type="password" placeholder="Input text" value={draft.password} onChange={setField('password')} iconTrail="Eye" />
            </FormField>
            <FormField label="Confirm password" required>
              <TextInput type="password" placeholder="Input text" value={draft.confirmPassword} onChange={setField('confirmPassword')} iconTrail="Eye" />
            </FormField>
          </div>
          <span className={styles.optionsLabel}>Account options:</span>
          <label><input type="checkbox" checked={accountOptions.changePassword} onChange={(e) => setAccountOptions((o) => ({ ...o, changePassword: e.target.checked }))} /> User must change password at next login</label>
          <label><input type="checkbox" checked={accountOptions.preventPasswordChange} onChange={(e) => setAccountOptions((o) => ({ ...o, preventPasswordChange: e.target.checked }))} /> User cannot change password</label>
          <label><input type="checkbox" checked={accountOptions.passwordNeverExpires} onChange={(e) => setAccountOptions((o) => ({ ...o, passwordNeverExpires: e.target.checked }))} /> Password never expires</label>
          <label><input type="checkbox" checked={accountOptions.disabled} onChange={(e) => setAccountOptions((o) => ({ ...o, disabled: e.target.checked }))} /> Account is inactive</label>
          <label><input type="checkbox" checked={accountOptions.openProperties} onChange={(e) => setAccountOptions((o) => ({ ...o, openProperties: e.target.checked }))} /> Open properties for this object when I click Finish</label>
        </>}
        </div>
        <aside className={styles.help}>
          <h3>Add new object</h3>
          <p>To manage identity and display names, complete the required fields.</p>
        </aside>
      </div>
      {objectKind === 'ad' && (
        <MoveGroupsModal
          open={folderPickerOpen}
          count={1}
          objectLabel="User"
          title="Select destination folder"
          confirmLabel="Select"
          elevated
          onClose={() => setFolderPickerOpen(false)}
          onMove={(nodeId) => {
            const path = getPath(nodeId).map((crumb) => crumb.name).join(' / ');
            setDraft((current) => ({ ...current, location: path }));
            setFolderPickerOpen(false);
          }}
        />
      )}
    </Modal>
  );
}
