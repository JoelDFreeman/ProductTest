import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type MutableRefObject } from 'react';
import { Button } from '../../components/Button/Button.js';
import { Card } from '../../components/Card/Card.js';
import { FormField } from '../../components/FormField/FormField.js';
import { TextInput } from '../../components/TextInput/TextInput.js';
import type { User, UserDetails } from '../UsersPage/mockUsers.js';
import type { UserPatch } from '../../lib/usersStore.js';
import styles from './InlineUserDetailsCard.module.css';

type DetailField = 'city' | 'state' | 'postalCode' | 'country' | 'businessPhone' | 'mobilePhone' | 'email' | 'otherEmails' | 'faxPhone' | 'mailNickname';
type JobField = 'jobTitle' | 'companyName' | 'department' | 'employeeId' | 'employeeType' | 'hireDate';
type ActiveField = DetailField | JobField | null;
type DraftErrors = Partial<Record<ActiveField extends null ? never : ActiveField, string>>;

interface InlineUserDetailsCardProps {
  user: User;
  onSave: (patch: UserPatch) => void;
}

export function InlineUserDetailsCard({ user, onSave }: InlineUserDetailsCardProps) {
  const [editing, setEditing] = useState<'details' | 'job' | null>(null);
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [detailsDraft, setDetailsDraft] = useState(() => seedDetails(user.details));
  const [jobDraft, setJobDraft] = useState(() => seedJob(user.details));
  const [errors, setErrors] = useState<DraftErrors>({});
  const inputRefs = useRef<Partial<Record<ActiveField extends null ? never : ActiveField, HTMLInputElement | null>>>({});

  useEffect(() => {
    setDetailsDraft(seedDetails(user.details));
    setJobDraft(seedJob(user.details));
    setEditing(null);
    setActiveField(null);
  }, [user]);

  useEffect(() => {
    if (!editing || !activeField) return;
    inputRefs.current[activeField]?.focus();
    inputRefs.current[activeField]?.select();
    setActiveField(null);
  }, [editing, activeField]);

  const startEditing = (mode: 'details' | 'job', field?: DetailField | JobField) => {
    setErrors({});
    setActiveField(field ?? null);
    setEditing(mode);
  };

  const cancel = () => {
    setDetailsDraft(seedDetails(user.details));
    setJobDraft(seedJob(user.details));
    setErrors({});
    setEditing(null);
    setActiveField(null);
  };

  const setDetailField = (field: DetailField) => (event: ChangeEvent<HTMLInputElement>) => {
    setDetailsDraft((current) => ({ ...current, [field]: event.target.value }));
  };

  const setJobField = (field: JobField) => (event: ChangeEvent<HTMLInputElement>) => {
    setJobDraft((current) => ({ ...current, [field]: event.target.value }));
  };

  const submitDetails = () => {
    onSave({ details: detailsDraft });
    setEditing(null);
  };

  const submitJob = () => {
    onSave({ details: jobDraft });
    setEditing(null);
  };

  return (
    <div className={styles.stack}>
      <Card
        title="User details"
        helper="To manage contact and location information."
        actions={editing === 'details' ? <Actions onCancel={cancel} onSave={submitDetails} /> : <Button variant="secondary" size="s" onClick={() => startEditing('details')}>Edit</Button>}
      >
        {editing === 'details' ? (
          <form className={styles.form} onSubmit={(event) => { event.preventDefault(); submitDetails(); }} noValidate>
            <div className={styles.grid}>
              <Field label="City" field="city" value={detailsDraft.city} onChange={setDetailField('city')} refs={inputRefs} />
              <Field label="State" field="state" value={detailsDraft.state} onChange={setDetailField('state')} refs={inputRefs} />
              <Field label="ZIP / Postal code" field="postalCode" value={detailsDraft.postalCode} onChange={setDetailField('postalCode')} refs={inputRefs} />
              <Field label="Country / Region" field="country" value={detailsDraft.country} onChange={setDetailField('country')} refs={inputRefs} />
              <Field label="Business phone" field="businessPhone" value={detailsDraft.businessPhone} onChange={setDetailField('businessPhone')} refs={inputRefs} />
              <Field label="Mobile phone" field="mobilePhone" value={detailsDraft.mobilePhone} onChange={setDetailField('mobilePhone')} refs={inputRefs} />
              <Field label="Email" field="email" value={detailsDraft.email} onChange={setDetailField('email')} refs={inputRefs} />
              <Field label="Other emails" field="otherEmails" value={detailsDraft.otherEmails} onChange={setDetailField('otherEmails')} refs={inputRefs} />
              <Field label="Fax phone" field="faxPhone" value={detailsDraft.faxPhone} onChange={setDetailField('faxPhone')} refs={inputRefs} />
              <Field label="Mail nickname" field="mailNickname" value={detailsDraft.mailNickname} onChange={setDetailField('mailNickname')} refs={inputRefs} />
            </div>
          </form>
        ) : (
          <div className={styles.readList}>
            <ReadRow label="City" value={user.details.city} onClick={() => startEditing('details', 'city')} />
            <ReadRow label="State" value={user.details.state} onClick={() => startEditing('details', 'state')} />
            <ReadRow label="ZIP / Postal code" value={user.details.postalCode} onClick={() => startEditing('details', 'postalCode')} />
            <ReadRow label="Country / Region" value={user.details.country} onClick={() => startEditing('details', 'country')} />
            <ReadRow label="Business phone" value={user.details.businessPhone} onClick={() => startEditing('details', 'businessPhone')} />
            <ReadRow label="Mobile phone" value={user.details.mobilePhone} onClick={() => startEditing('details', 'mobilePhone')} />
            <ReadRow label="Email" value={user.details.email} onClick={() => startEditing('details', 'email')} />
            <ReadRow label="Other emails" value={user.details.otherEmails || '—'} onClick={() => startEditing('details', 'otherEmails')} />
            <ReadRow label="Fax phone" value={user.details.faxPhone || '—'} onClick={() => startEditing('details', 'faxPhone')} />
            <ReadRow label="Mail nickname" value={user.details.mailNickname} onClick={() => startEditing('details', 'mailNickname')} />
          </div>
        )}
      </Card>

      <Card
        title="Job info"
        helper="Manage employment information."
        actions={editing === 'job' ? <Actions onCancel={cancel} onSave={submitJob} /> : <Button variant="secondary" size="s" onClick={() => startEditing('job')}>Edit</Button>}
      >
        {editing === 'job' ? (
          <form className={styles.form} onSubmit={(event) => { event.preventDefault(); submitJob(); }} noValidate>
            <div className={styles.grid}>
              <Field label="Job title" field="jobTitle" value={jobDraft.jobTitle} onChange={setJobField('jobTitle')} refs={inputRefs} />
              <Field label="Company name" field="companyName" value={jobDraft.companyName} onChange={setJobField('companyName')} refs={inputRefs} />
              <Field label="Department" field="department" value={jobDraft.department} onChange={setJobField('department')} refs={inputRefs} />
              <Field label="Employee ID" field="employeeId" value={jobDraft.employeeId} onChange={setJobField('employeeId')} refs={inputRefs} />
              <Field label="Employee type" field="employeeType" value={jobDraft.employeeType} onChange={setJobField('employeeType')} refs={inputRefs} />
              <Field label="Employee hire date" field="hireDate" value={jobDraft.hireDate} onChange={setJobField('hireDate')} refs={inputRefs} />
            </div>
          </form>
        ) : (
          <div className={styles.readList}>
            <ReadRow label="Job title" value={user.details.jobTitle} onClick={() => startEditing('job', 'jobTitle')} />
            <ReadRow label="Company name" value={user.details.companyName} onClick={() => startEditing('job', 'companyName')} />
            <ReadRow label="Department" value={user.details.department} onClick={() => startEditing('job', 'department')} />
            <ReadRow label="Employee ID" value={user.details.employeeId} onClick={() => startEditing('job', 'employeeId')} />
            <ReadRow label="Employee type" value={user.details.employeeType} onClick={() => startEditing('job', 'employeeType')} />
            <ReadRow label="Employee hire date" value={user.details.hireDate} onClick={() => startEditing('job', 'hireDate')} />
          </div>
        )}
      </Card>
    </div>
  );
}

function Actions({ onCancel, onSave }: { onCancel: () => void; onSave: () => void }) {
  return (
    <div className={styles.actions}>
      <Button variant="secondary" size="s" onClick={onCancel}>Cancel</Button>
      <Button variant="primary" size="s" onClick={onSave}>Save</Button>
    </div>
  );
}

function Field({ label, field, value, onChange, refs }: { label: string; field: DetailField | JobField; value: string; onChange: (event: ChangeEvent<HTMLInputElement>) => void; refs: MutableRefObject<Partial<Record<DetailField | JobField, HTMLInputElement | null>>> }) {
  return (
    <FormField label={label}>
      <TextInput ref={(element) => { refs.current[field] = element; }} value={value} onChange={onChange} />
    </FormField>
  );
}

function ReadRow({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <div className={styles.readRow}>
      <span className={styles.readLabel}>{label}</span>
      <button type="button" className={styles.readValue} onClick={onClick}>{value}</button>
    </div>
  );
}

function seedDetails(details: UserDetails): Record<DetailField, string> {
  return {
    city: details.city,
    state: details.state,
    postalCode: details.postalCode,
    country: details.country,
    businessPhone: details.businessPhone,
    mobilePhone: details.mobilePhone,
    email: details.email,
    otherEmails: details.otherEmails,
    faxPhone: details.faxPhone,
    mailNickname: details.mailNickname,
  };
}

function seedJob(details: UserDetails): Record<JobField, string> {
  return {
    jobTitle: details.jobTitle,
    companyName: details.companyName,
    department: details.department,
    employeeId: details.employeeId,
    employeeType: details.employeeType,
    hireDate: details.hireDate,
  };
}
