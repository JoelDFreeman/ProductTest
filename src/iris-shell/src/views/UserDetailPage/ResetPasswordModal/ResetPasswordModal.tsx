import { useEffect, useId, useState } from 'react';
import { cx } from '../../../lib/cx.js';
import { Button } from '../../../components/Button/Button.js';
import { Checkbox } from '../../../components/Checkbox/Checkbox.js';
import { FormField } from '../../../components/FormField/FormField.js';
import { Icon } from '../../../components/Icon/Icon.js';
import { IconButton } from '../../../components/IconButton/IconButton.js';
import { Modal } from '../../../components/Modal/Modal.js';
import { Spinner } from '../../../components/Spinner/Spinner.js';
import { TextInput } from '../../../components/TextInput/TextInput.js';
import { Tooltip } from '../../../components/Tooltip/Tooltip.js';
import styles from './ResetPasswordModal.module.css';

/** Any named object works — the modal only displays the name. */
export interface ResetTarget {
  name: string;
  username?: string;
  displayName?: string;
  location?: string;
}

export interface ResetPasswordModalProps {
  open: boolean;
  onClose: () => void;
  user: ResetTarget;
  mode?: 'ad' | 'entra';
}

export function ResetPasswordModal({ open, onClose, user, mode = 'ad' }: ResetPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [mustChangeAtLogin, setMustChangeAtLogin] = useState(true);
  const [accountEnabled, setAccountEnabled] = useState(true);
  const [cannotChangePassword, setCannotChangePassword] = useState(false);
  const [passwordNeverExpires, setPasswordNeverExpires] = useState(false);
  const [adResetState, setAdResetState] = useState<'form' | 'processing' | 'success'>('form');

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    if (mode === 'entra') {
      const generated = generatePassword();
      setPassword(generated);
      setConfirmPassword(generated);
      return;
    }
    setAdResetState('form');
    setPassword('');
    setConfirmPassword('');
    setMustChangeAtLogin(true);
    setAccountEnabled(true);
    setCannotChangePassword(false);
    setPasswordNeverExpires(false);
  }, [mode, open]);

  useEffect(() => {
    if (!open || mode !== 'ad' || adResetState !== 'processing') return undefined;
    const timer = setTimeout(() => setAdResetState('success'), 2000);
    return () => clearTimeout(timer);
  }, [adResetState, mode, open]);

  useEffect(() => {
    if (!copied) return undefined;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const canReset = password.trim().length > 0;
  const identityValue = user.username ?? user.displayName ?? user.name;
  const adComplete = mode === 'ad' && adResetState !== 'form';

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="m"
      className={styles.modal}
      title="Password Reset"
      subtitle={`${identityValue} · ${user.location ?? '—'}`}
      leadingIcon="Password"
      footer={
        mode === 'ad' && !adComplete ? (
          <>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={() => setAdResetState('processing')} disabled={!canReset}>Reset password</Button>
          </>
        ) : (
          <Button variant="primary" onClick={onClose}>Close</Button>
        )
      }
    >
      {mode === 'ad' && adResetState === 'form' ? (
        <AdResetContent
          password={password}
          confirmPassword={confirmPassword}
          onPasswordChange={setPassword}
          onConfirmPasswordChange={setConfirmPassword}
          mustChangeAtLogin={mustChangeAtLogin}
          onMustChangeAtLoginChange={setMustChangeAtLogin}
          accountEnabled={accountEnabled}
          onAccountEnabledChange={setAccountEnabled}
          cannotChangePassword={cannotChangePassword}
          onCannotChangePasswordChange={setCannotChangePassword}
          passwordNeverExpires={passwordNeverExpires}
          onPasswordNeverExpiresChange={setPasswordNeverExpires}
        />
      ) : mode === 'ad' && adResetState === 'processing' ? (
        <AdProcessingContent />
      ) : (
        <EntraResetContent
          password={password}
          copied={copied}
          onCopyChange={setCopied}
          successMessage={mode === 'ad' ? 'Password has been reset successfully.' : undefined}
        />
      )}
    </Modal>
  );
}

function AdProcessingContent() {
  return (
    <div className={styles.processingBody}>
      <p className={styles.processingTitle}>Please wait...</p>
      <Spinner size="lg" />
    </div>
  );
}

function AdResetContent({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  mustChangeAtLogin,
  onMustChangeAtLoginChange,
  accountEnabled,
  onAccountEnabledChange,
  cannotChangePassword,
  onCannotChangePasswordChange,
  passwordNeverExpires,
  onPasswordNeverExpiresChange,
}: {
  password: string;
  confirmPassword: string;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  mustChangeAtLogin: boolean;
  onMustChangeAtLoginChange: (checked: boolean) => void;
  accountEnabled: boolean;
  onAccountEnabledChange: (checked: boolean) => void;
  cannotChangePassword: boolean;
  onCannotChangePasswordChange: (checked: boolean) => void;
  passwordNeverExpires: boolean;
  onPasswordNeverExpiresChange: (checked: boolean) => void;
}) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [confirmCopied, setConfirmCopied] = useState(false);

  useEffect(() => {
    if (!passwordCopied) return undefined;
    const t = setTimeout(() => setPasswordCopied(false), 2000);
    return () => clearTimeout(t);
  }, [passwordCopied]);

  useEffect(() => {
    if (!confirmCopied) return undefined;
    const t = setTimeout(() => setConfirmCopied(false), 2000);
    return () => clearTimeout(t);
  }, [confirmCopied]);

  return (
    <div className={styles.body}>
      <FormField label="Password" required>
        <EditablePasswordField
          value={password}
          visible={passwordVisible}
          copied={passwordCopied}
          onVisibilityChange={setPasswordVisible}
          onCopiedChange={setPasswordCopied}
          onChange={onPasswordChange}
        />
      </FormField>
      <FormField label="Confirm password" required>
        <EditablePasswordField
          value={confirmPassword}
          visible={confirmPasswordVisible}
          copied={confirmCopied}
          onVisibilityChange={setConfirmPasswordVisible}
          onCopiedChange={setConfirmCopied}
          onChange={onConfirmPasswordChange}
        />
      </FormField>
      <LoginSettingsBlock
        mustChangeAtLogin={mustChangeAtLogin}
        onMustChangeAtLoginChange={onMustChangeAtLoginChange}
        accountEnabled={accountEnabled}
        onAccountEnabledChange={onAccountEnabledChange}
        cannotChangePassword={cannotChangePassword}
        onCannotChangePasswordChange={onCannotChangePasswordChange}
        passwordNeverExpires={passwordNeverExpires}
        onPasswordNeverExpiresChange={onPasswordNeverExpiresChange}
      />
    </div>
  );
}

function EditablePasswordField({
  value,
  visible,
  copied,
  onVisibilityChange,
  onCopiedChange,
  onChange,
}: {
  value: string;
  visible: boolean;
  copied: boolean;
  onVisibilityChange: (visible: boolean) => void;
  onCopiedChange: (copied: boolean) => void;
  onChange: (value: string) => void;
}) {
  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        throw new Error('clipboard-unavailable');
      }
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        // best-effort copy
      }
    }
    onCopiedChange(true);
  };

  return (
    <TextInput
      type={visible ? 'text' : 'password'}
      placeholder="Input text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      autoComplete="new-password"
      size="s"
      className={styles.passwordInput}
      iconTrail={(
        <span className={styles.inputActions}>
          <Tooltip label={visible ? 'Hide password' : 'Show password'}>
            <IconButton
              icon={visible ? 'EyeClosed' : 'Eye'}
              ariaLabel={visible ? 'Hide password' : 'Show password'}
              size="s"
              onClick={() => onVisibilityChange(!visible)}
            />
          </Tooltip>
          <Tooltip label={copied ? 'Copied' : 'Copy password'}>
            <IconButton
              icon={<CopyPasswordSwap copied={copied} />}
              ariaLabel="Copy password"
              size="s"
              onClick={handleCopy}
              className={copied ? styles.copyDone : undefined}
              disabled={!value}
            />
          </Tooltip>
        </span>
      )}
    />
  );
}

function LoginSettingsBlock({
  mustChangeAtLogin,
  onMustChangeAtLoginChange,
  accountEnabled,
  onAccountEnabledChange,
  cannotChangePassword,
  onCannotChangePasswordChange,
  passwordNeverExpires,
  onPasswordNeverExpiresChange,
}: {
  mustChangeAtLogin: boolean;
  onMustChangeAtLoginChange: (checked: boolean) => void;
  accountEnabled: boolean;
  onAccountEnabledChange: (checked: boolean) => void;
  cannotChangePassword: boolean;
  onCannotChangePasswordChange: (checked: boolean) => void;
  passwordNeverExpires: boolean;
  onPasswordNeverExpiresChange: (checked: boolean) => void;
}) {
  return (
    <div className={styles.settingsBlock} aria-label="Login settings">
      <h3 className={styles.settingsTitle}>Login settings</h3>
      <label className={styles.checkRow}><Checkbox checked={mustChangeAtLogin} onChange={onMustChangeAtLoginChange} ariaLabel="User must change password at next sign-in" /> User must change password at next sign-in</label>
      <label className={styles.checkRow}><Checkbox checked={accountEnabled} onChange={onAccountEnabledChange} ariaLabel="Account is enabled" /> Account is enabled</label>
      <label className={styles.checkRow}><Checkbox checked={cannotChangePassword} onChange={onCannotChangePasswordChange} ariaLabel="User cannot change password" /> User cannot change password</label>
      <label className={styles.checkRow}><Checkbox checked={passwordNeverExpires} onChange={onPasswordNeverExpiresChange} ariaLabel="Password never expires" /> Password never expires</label>
    </div>
  );
}

function EntraResetContent({
  password,
  copied,
  onCopyChange,
  successMessage,
}: {
  password: string;
  copied: boolean;
  onCopyChange: (copied: boolean) => void;
  successMessage?: string;
}) {
  return (
    <div className={styles.body}>
      <div className={styles.banner}>
        <div className={styles.bannerIcon}><Icon name="CheckCircle" size="20px" /></div>
        <div className={styles.bannerContent}>
          <div className={styles.bannerTitle}>{successMessage ?? 'Password and login settings have been generated.'}</div>
          <FormField label="">
            <PasswordField
              password={password}
              canCopy
              copied={copied}
              onCopied={onCopyChange}
            />
          </FormField>
        </div>
      </div>
    </div>
  );
}

interface PasswordFieldProps {
  password: string;
  canCopy?: boolean;
  copied?: boolean;
  onCopied?: (copied: boolean) => void;
}

function PasswordField({
  password,
  canCopy = true,
  copied = false,
  onCopied,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(password);
      } else {
        throw new Error('clipboard-unavailable');
      }
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = password;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        // best-effort copy
      }
    }
    onCopied?.(true);
  };

  return (
    <TextInput
      type={visible ? 'text' : 'password'}
      value={password}
      onChange={() => undefined}
      readOnly
      autoComplete="new-password"
      size="s"
      className={styles.passwordInput}
      iconTrail={(
        <span className={styles.inputActions}>
          <Tooltip label={visible ? 'Hide password' : 'Show password'}>
            <IconButton
              icon={visible ? 'EyeClosed' : 'Eye'}
              ariaLabel={visible ? 'Hide password' : 'Show password'}
              size="s"
              onClick={() => setVisible((v) => !v)}
            />
          </Tooltip>
          {canCopy && (
            <Tooltip label={copied ? 'Copied' : 'Copy password'}>
              <IconButton
                icon={<CopyPasswordSwap copied={copied} />}
                ariaLabel="Copy password"
                size="s"
                onClick={handleCopy}
                className={copied ? styles.copyDone : undefined}
                disabled={!password}
              />
            </Tooltip>
          )}
        </span>
      )}
    />
  );
}

function CopyPasswordSwap({ copied }: { copied: boolean }) {
  return (
    <span className={styles.copySwap} data-copied={copied ? 'true' : 'false'} aria-hidden="true">
      <span className={cx(styles.copySwapLayer, styles.copySwapCopy)}>
        <Icon name="CopySimple" size="16px" />
      </span>
      <span className={cx(styles.copySwapLayer, styles.copySwapCheck)}>
        <Icon name="CheckCircle" size="16px" />
      </span>
    </span>
  );
}

function generatePassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) out += alphabet[bytes[i] % alphabet.length];
  return out;
}
