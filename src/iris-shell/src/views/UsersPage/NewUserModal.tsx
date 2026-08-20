import { useMemo, useState, type ChangeEvent } from 'react';
import { Button } from '../../components/Button/Button.js';
import { FormField } from '../../components/FormField/FormField.js';
import { Modal } from '../../components/Modal/Modal.js';
import { TextInput } from '../../components/TextInput/TextInput.js';
import { Stepper } from '../../components/Stepper/Stepper.js';
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
  suffix: '@Entra1',
  preWindowsLogonName: '',
  password: '',
  confirmPassword: '',
};

export function NewUserModal({ open, onClose, objectKind, directories, onCreate }: NewUserModalProps) {
  const [draft, setDraft] = useState<Draft>(() => ({ ...EMPTY_DRAFT, directory: directories[0] ?? 'Entra 1' }));
  const [step, setStep] = useState<1 | 2>(1);
  const [furthestStep, setFurthestStep] = useState<1 | 2>(1);
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

  const canContinue = useMemo(
    () => Boolean(
      draft.firstName.trim() &&
      draft.lastName.trim() &&
      draft.name.trim() &&
      draft.displayName.trim() &&
      draft.userLogonName.trim() &&
      objectKind === 'ad' ? draft.preWindowsLogonName.trim() : true,
    ),
    [draft],
  );
  const canCreate = Boolean(draft.password && draft.password === draft.confirmPassword);

  const close = () => {
    setDraft({ ...EMPTY_DRAFT, directory: directories[0] ?? 'Entra 1' });
    setStep(1);
    setFurthestStep(1);
    onClose();
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
          <div className={styles.twoColumn}>
            <FormField label="First name" required>
              <TextInput value={draft.firstName} onChange={setField('firstName')} />
            </FormField>
            <FormField label="Last name" required>
              <TextInput value={draft.lastName} onChange={setField('lastName')} />
            </FormField>
          </div>
          <FormField label="Initials">
            <TextInput value={draft.initials} onChange={setField('initials')} />
          </FormField>
          <FormField label="Name" required helperText="The object name used in the directory.">
            <TextInput value={draft.name} onChange={setField('name')} />
          </FormField>
          <FormField label="Display name" required helperText="The name shown to other users.">
            <TextInput value={draft.displayName} onChange={setField('displayName')} />
          </FormField>
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
    </Modal>
  );
}
