import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Button } from '../../components/Button/Button.js';
import { Card } from '../../components/Card/Card.js';
import { FormField } from '../../components/FormField/FormField.js';
import { Select } from '../../components/Select/Select.js';
import { TextInput } from '../../components/TextInput/TextInput.js';
import { Textarea } from '../../components/Textarea/Textarea.js';
import type { User } from '../UsersPage/mockUsers.js';
import type { UserPatch } from '../../lib/usersStore.js';
import styles from './InlinePropertiesCard.module.css';

interface Draft {
  firstName: string;
  lastName: string;
  displayName: string;
  userPrincipalName: string;
  directory: string;
  initials: string;
  longDescription: string;
}

type DraftField = keyof Draft;
type DraftErrors = Partial<Record<DraftField, string>>;

interface InlinePropertiesCardProps {
  user: User;
  onSave: (patch: UserPatch) => void;
}

export function InlinePropertiesCard({ user, onSave }: InlinePropertiesCardProps) {
  const [editing, setEditing] = useState(false);
  const [focusField, setFocusField] = useState<DraftField | null>(null);
  const [draft, setDraft] = useState(() => seedFromUser(user));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [shakeTrigger, setShakeTrigger] = useState(0);
  const inputRefs = useRef<Partial<Record<DraftField, HTMLInputElement | HTMLTextAreaElement | null>>>({});

  useEffect(() => {
    setDraft(seedFromUser(user));
    setEditing(false);
    setFocusField(null);
  }, [user]);

  useEffect(() => {
    if (!editing || !focusField) return;
    inputRefs.current[focusField]?.focus();
    inputRefs.current[focusField]?.select();
    setFocusField(null);
  }, [editing, focusField]);

  const startEditing = (field?: DraftField) => {
    setErrors({});
    setFocusField(field ?? null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setDraft(seedFromUser(user));
    setErrors({});
    setEditing(false);
    setFocusField(null);
  };

  const setField = (field: DraftField) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setDraft((current) => ({ ...current, [field]: event.target.value }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validate(draft);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setShakeTrigger((current) => current + 1);
      return;
    }
    onSave({
      details: {
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        displayName: draft.displayName.trim(),
        userPrincipalName: draft.userPrincipalName.trim(),
        directory: draft.directory,
        initials: draft.initials.trim(),
        longDescription: draft.longDescription,
      },
    });
    setEditing(false);
  };

  return (
    <Card
      className={styles.card}
      title="Properties"
      helper="To manage identity and display names."
      actions={
        editing ? (
          <div className={styles.actions}>
            <Button variant="secondary" size="s" onClick={cancelEditing}>Cancel</Button>
            <Button variant="primary" size="s" onClick={submit}>Save</Button>
          </div>
        ) : (
          <Button variant="secondary" size="s" onClick={() => startEditing()}>Edit</Button>
        )
      }
    >
      {editing ? (
        <form className={styles.form} onSubmit={submit} noValidate>
          <div className={styles.formGrid}>
            <FormField label="First name" required error={errors.firstName} shakeTrigger={shakeTrigger}>
              <TextInput ref={(element) => { inputRefs.current.firstName = element; }} value={draft.firstName} onChange={setField('firstName')} autoComplete="given-name" />
            </FormField>
            <FormField label="Last name" required error={errors.lastName} shakeTrigger={shakeTrigger}>
              <TextInput ref={(element) => { inputRefs.current.lastName = element; }} value={draft.lastName} onChange={setField('lastName')} autoComplete="family-name" />
            </FormField>
            <FormField label="Display name" required error={errors.displayName} shakeTrigger={shakeTrigger}>
              <TextInput ref={(element) => { inputRefs.current.displayName = element; }} value={draft.displayName} onChange={setField('displayName')} />
            </FormField>
            <FormField label="User principal name" required error={errors.userPrincipalName} shakeTrigger={shakeTrigger}>
              <TextInput ref={(element) => { inputRefs.current.userPrincipalName = element; }} value={draft.userPrincipalName} onChange={setField('userPrincipalName')} />
            </FormField>
            <FormField label="Directory" required error={errors.directory} shakeTrigger={shakeTrigger}>
              <Select label={`@${draft.directory}`} size="s" aria-label="Directory" />
            </FormField>
            <FormField label="Initials">
              <TextInput ref={(element) => { inputRefs.current.initials = element; }} value={draft.initials} onChange={setField('initials')} maxLength={4} />
            </FormField>
          </div>
          <FormField label="Description">
            <Textarea ref={(element) => { inputRefs.current.longDescription = element; }} rows={4} value={draft.longDescription} onChange={setField('longDescription')} />
          </FormField>
          <button type="submit" hidden />
        </form>
      ) : (
        <div className={styles.readList}>
          <ReadRow label="First name" value={user.details.firstName} onClick={() => startEditing('firstName')} />
          <ReadRow label="Last name" value={user.details.lastName} onClick={() => startEditing('lastName')} />
          <ReadRow label="Display name" value={user.details.displayName} onClick={() => startEditing('displayName')} />
          <ReadRow label="User principal name" value={user.details.userPrincipalName} onClick={() => startEditing('userPrincipalName')} />
          <ReadRow label="Authorization info" value={user.details.authorizationInfo || '—'} onClick={() => startEditing()} />
          <ReadRow label="Description" value={user.details.longDescription} onClick={() => startEditing('longDescription')} multiline />
        </div>
      )}
    </Card>
  );
}

function ReadRow({ label, value, onClick, multiline = false }: { label: string; value: string; onClick: () => void; multiline?: boolean }) {
  return (
    <div className={styles.readRow}>
      <span className={styles.readLabel}>{label}</span>
      <button type="button" className={`${styles.readValue} ${multiline ? styles.multiline : ''}`} onClick={onClick}>{value}</button>
    </div>
  );
}

function seedFromUser(user: User): Draft {
  return {
    firstName: user.details.firstName,
    lastName: user.details.lastName,
    displayName: user.details.displayName,
    userPrincipalName: user.details.userPrincipalName,
    directory: user.details.directory,
    initials: user.details.initials,
    longDescription: user.details.longDescription,
  };
}

function validate(draft: Draft): DraftErrors {
  const errors: DraftErrors = {};
  if (!draft.firstName.trim()) errors.firstName = 'Required';
  if (!draft.lastName.trim()) errors.lastName = 'Required';
  if (!draft.displayName.trim()) errors.displayName = 'Required';
  if (!draft.userPrincipalName.trim()) errors.userPrincipalName = 'Required';
  if (!draft.directory.trim()) errors.directory = 'Required';
  return errors;
}
