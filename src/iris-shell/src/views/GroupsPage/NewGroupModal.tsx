import { useMemo, useState, type ChangeEvent } from 'react';
import { Button } from '../../components/Button/Button.js';
import { FormField } from '../../components/FormField/FormField.js';
import { Modal } from '../../components/Modal/Modal.js';
import { TextInput } from '../../components/TextInput/TextInput.js';
import { Textarea } from '../../components/Textarea/Textarea.js';
import { Stepper } from '../../components/Stepper/Stepper.js';
import styles from './NewGroupModal.module.css';

export interface NewGroupDraft {
  name: string;
  displayName: string;
  description: string;
  scope: 'Domain local' | 'Global' | 'Universal';
  directory: string;
}

interface NewGroupModalProps {
  open: boolean;
  onClose: () => void;
  directories: string[];
  onCreate: (draft: NewGroupDraft) => void;
}

const EMPTY_DRAFT: NewGroupDraft = {
  name: '',
  displayName: '',
  description: '',
  scope: 'Global',
  directory: 'Entra 1',
};

export function NewGroupModal({ open, onClose, directories, onCreate }: NewGroupModalProps) {
  const [draft, setDraft] = useState<NewGroupDraft>(() => ({
    ...EMPTY_DRAFT,
    directory: directories[0] ?? EMPTY_DRAFT.directory,
  }));
  const [step, setStep] = useState<1 | 2>(1);
  const [furthestStep, setFurthestStep] = useState<1 | 2>(1);

  const setTextField = (field: 'name' | 'displayName' | 'description') => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setDraft((current) => ({ ...current, [field]: event.target.value }));
  };

  const canContinue = useMemo(() => Boolean(draft.name.trim() && draft.displayName.trim()), [draft.name, draft.displayName]);

  const close = () => {
    setDraft({ ...EMPTY_DRAFT, directory: directories[0] ?? EMPTY_DRAFT.directory });
    setStep(1);
    setFurthestStep(1);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="New Group"
      subtitle={draft.directory}
      leadingIcon="UsersThree"
      size="l"
      className={styles.modal}
      bodyClassName={styles.body}
      footer={
        <div className={styles.footerContent}>
          <span className={styles.step}>Step {step} of 2</span>
          <div className={styles.footerActions}>
            <Button variant="secondary" onClick={close}>Cancel</Button>
            <Button
              variant="primary"
              disabled={step === 1 ? !canContinue : false}
              onClick={() => {
                if (step === 1) {
                  setStep(2);
                  setFurthestStep(2);
                  return;
                }
                onCreate({ ...draft, name: draft.name.trim(), displayName: draft.displayName.trim(), description: draft.description.trim() });
                close();
              }}
            >
              {step === 1 ? 'Save and continue' : 'Create object'}
            </Button>
          </div>
        </div>
      }
    >
      <Stepper
        items={[{ label: 'General' }, { label: 'Group options' }]}
        activeIndex={step - 1}
        completedThrough={furthestStep - 1}
        onStepChange={(index) => {
          const nextStep = (index + 1) as 1 | 2;
          setStep(nextStep);
          setFurthestStep((current) => Math.max(current, nextStep) as 1 | 2);
        }}
        ariaLabel="New group steps"
      />
      <div className={styles.content}>
        <div className={styles.form}>
          {step === 1 ? <>
            <FormField label="Name" required helperText="The object name used in the directory.">
              <TextInput value={draft.name} onChange={setTextField('name')} />
            </FormField>
            <FormField label="Display name" required helperText="The name shown to other users.">
              <TextInput value={draft.displayName} onChange={setTextField('displayName')} />
            </FormField>
            <FormField label="Description">
              <Textarea rows={4} value={draft.description} onChange={setTextField('description')} />
            </FormField>
            <FormField label="Directory" required>
              <select className={styles.select} value={draft.directory} onChange={(event) => setDraft((current) => ({ ...current, directory: event.target.value }))} aria-label="Directory">
                {directories.map((directory) => <option key={directory} value={directory}>{directory}</option>)}
              </select>
            </FormField>
          </> : <>
            <h3 className={styles.sectionTitle}>Group options</h3>
            <p className={styles.sectionHelp}>Choose the scope for this group.</p>
            <fieldset className={styles.scopeField}>
              <legend>Group scope</legend>
              {(['Domain local', 'Global', 'Universal'] as const).map((scope) => (
                <label key={scope}><input type="radio" name="new-group-scope" checked={draft.scope === scope} onChange={() => setDraft((current) => ({ ...current, scope }))} />{scope}</label>
              ))}
            </fieldset>
          </>}
        </div>
        <aside className={styles.help}>
          <h3>Create new object</h3>
          <p>To manage group identity and directory settings, complete the required fields.</p>
        </aside>
      </div>
    </Modal>
  );
}
