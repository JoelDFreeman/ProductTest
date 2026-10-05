export interface CustomizationEntry {
  id: string;
  label: string;
  property: string;
  description: string;
  tooltip: string;
  dataType: 'Auto' | 'Text' | 'Number' | 'Boolean' | 'Date';
  required?: boolean;
  readOnly?: boolean;
  singleValued?: boolean;
}

export interface ObjectTemplate {
  id: string;
  name: string;
  objectType: string;
  icon: string;
  tabs: string[];
  entries: CustomizationEntry[];
}

export function customizationStorageKey(templateId: string): string {
  return `ars.customization.template.${templateId}`;
}

export function loadCustomizedEntries(template: ObjectTemplate): CustomizationEntry[] {
  const storageKey = customizationStorageKey(template.id);
  let saved: string | null;
  try {
    saved = window.localStorage.getItem(storageKey);
  } catch (error) {
    console.error(`Unable to read customization for ${template.name}.`, error);
    return template.entries;
  }
  if (!saved) return template.entries;

  try {
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) throw new Error('Stored customization is not an array.');
    const entries = parsed.filter((entry): entry is CustomizationEntry =>
      typeof entry === 'object' &&
      entry !== null &&
      typeof (entry as CustomizationEntry).id === 'string' &&
      typeof (entry as CustomizationEntry).label === 'string' &&
      typeof (entry as CustomizationEntry).property === 'string',
    );
    if (entries.length !== parsed.length) throw new Error('Stored customization contains invalid entries.');
    return entries;
  } catch (error) {
    console.error(`Unable to parse customization for ${template.name}.`, error);
    try {
      window.localStorage.removeItem(storageKey);
    } catch (removeError) {
      console.error(`Unable to remove invalid customization for ${template.name}.`, removeError);
    }
    return template.entries;
  }
}

export function saveCustomizedEntries(template: ObjectTemplate, entries: CustomizationEntry[]): boolean {
  try {
    window.localStorage.setItem(customizationStorageKey(template.id), JSON.stringify(entries));
    return true;
  } catch (error) {
    console.error(`Unable to save customization for ${template.name}.`, error);
    return false;
  }
}

const userEntries: CustomizationEntry[] = [
  { id: 'firstName', label: 'First name', property: 'givenName', description: 'The user’s first name.', tooltip: 'First name', dataType: 'Text', required: true, singleValued: true },
  { id: 'lastName', label: 'Last name', property: 'sn', description: 'The user’s last name.', tooltip: 'Last name', dataType: 'Text', required: true, singleValued: true },
  { id: 'initials', label: 'Initials', property: 'initials', description: 'The user’s initials.', tooltip: 'Initials', dataType: 'Text', singleValued: true },
  { id: 'displayName', label: 'Display name', property: 'displayName', description: 'The name displayed throughout the product.', tooltip: 'Display name', dataType: 'Text', required: true, singleValued: true },
  { id: 'description', label: 'Description', property: 'description', description: 'A description of the user.', tooltip: 'Description', dataType: 'Text' },
  { id: 'office', label: 'Office', property: 'physicalDeliveryOfficeName', description: 'The user’s office.', tooltip: 'Office', dataType: 'Text', singleValued: true },
  { id: 'telephone', label: 'Telephone number', property: 'telephoneNumber', description: 'The user’s business phone number.', tooltip: 'Telephone number', dataType: 'Text' },
  { id: 'mobile', label: 'Mobile', property: 'mobile', description: 'The user’s mobile phone number.', tooltip: 'Mobile', dataType: 'Text' },
  { id: 'email', label: 'E-Mail', property: 'mail', description: 'The user’s email address.', tooltip: 'E-Mail', dataType: 'Text' },
  { id: 'webpage', label: 'Webpage', property: 'wWWHomePage', description: 'The user’s webpage.', tooltip: 'Webpage', dataType: 'Text' },
];

const commonTabs = ['General', 'Address', 'Account', 'Telephones', 'Organization', 'Profile'];

export const OBJECT_TEMPLATES: ObjectTemplate[] = [
  { id: 'active-directory', name: 'Active Directory', objectType: 'edsDomainsCollection', icon: 'UserCircleGear', tabs: ['General'], entries: [] },
  { id: 'automation-workflow', name: 'Automation Workflow', objectType: 'edsAutomationWorkflowDefinition', icon: 'Devices', tabs: ['General'], entries: [] },
  { id: 'builtin-domain', name: 'builtinDomain', objectType: 'builtinDomain', icon: 'HardDrive', tabs: ['General'], entries: [] },
  { id: 'computer', name: 'Computer', objectType: 'computer', icon: 'ComputerTower', tabs: ['General', 'Operating system', 'Member Of', 'Object'], entries: [
    { id: 'computerName', label: 'Computer name', property: 'name', description: 'The computer name.', tooltip: 'Computer name', dataType: 'Text', required: true, singleValued: true },
    { id: 'computerDescription', label: 'Description', property: 'description', description: 'A description of the computer.', tooltip: 'Description', dataType: 'Text' },
    { id: 'computerType', label: 'Computer type', property: 'computerType', description: 'The type of computer.', tooltip: 'Computer type', dataType: 'Text', singleValued: true },
    { id: 'computerLocation', label: 'Location', property: 'location', description: 'The computer location.', tooltip: 'Location', dataType: 'Text', singleValued: true },
  ] },
  { id: 'contact', name: 'Contact', objectType: 'contact', icon: 'AddressBook', tabs: commonTabs, entries: userEntries.filter((entry) => ['firstName', 'lastName', 'displayName', 'description', 'telephone', 'mobile', 'email', 'webpage'].includes(entry.id)) },
  { id: 'container', name: 'Container', objectType: 'container', icon: 'ShippingContainer', tabs: ['General', 'Object'], entries: [] },
  { id: 'container-ad-lds', name: 'Container (AD LDS Object)', objectType: 'container', icon: 'ShippingContainer', tabs: ['General', 'Object'], entries: [] },
  { id: 'default', name: 'default', objectType: 'Default', icon: 'HardDrive', tabs: ['General'], entries: [] },
  { id: 'device', name: 'Device', objectType: 'edsDevice', icon: 'Devices', tabs: ['General', 'Object'], entries: [
    { id: 'deviceName', label: 'Display name', property: 'displayName', description: 'The device display name.', tooltip: 'Display name', dataType: 'Text', required: true, singleValued: true },
    { id: 'deviceDescription', label: 'Description', property: 'description', description: 'A description of the device.', tooltip: 'Description', dataType: 'Text' },
  ] },
  { id: 'domain', name: 'Domain', objectType: 'domainDNS', icon: 'HardDrive', tabs: ['General', 'Object'], entries: [] },
  { id: 'domain-ad-lds', name: 'domainDNS (AD LDS Object)', objectType: 'domainDNS', icon: 'HardDrive', tabs: ['General', 'Object'], entries: [] },
  { id: 'adam-instances', name: 'edsADAMInstancesCollection (AD LDS Object)', objectType: 'edsADAMInstancesCollection', icon: 'Devices', tabs: ['General'], entries: [] },
  { id: 'azure-application', name: 'edsAzureApplication', objectType: 'edsAzureApplication', icon: 'Browsers', tabs: ['General', 'Object'], entries: [] },
  { id: 'group', name: 'Group Properties', objectType: 'group', icon: 'UsersThree', tabs: ['General', 'Members', 'Member Of', 'Managed By', 'Object'], entries: [
    { id: 'groupName', label: 'Display name', property: 'displayName', description: 'The group display name.', tooltip: 'Display name', dataType: 'Text', required: true, singleValued: true },
    { id: 'groupDescription', label: 'Description', property: 'description', description: 'A description of the group.', tooltip: 'Description', dataType: 'Text' },
    { id: 'groupScope', label: 'Group scope', property: 'groupScope', description: 'The group scope.', tooltip: 'Group scope', dataType: 'Text', required: true, singleValued: true },
    { id: 'groupType', label: 'Group type', property: 'groupType', description: 'The group type.', tooltip: 'Group type', dataType: 'Text', required: true, singleValued: true },
  ] },
  { id: 'user', name: 'User Properties', objectType: 'user', icon: 'Folder', tabs: [...commonTabs, 'Managed By', 'Picture', 'Published certificates', 'Objects details', 'Organization'], entries: userEntries },
];

export function getObjectTemplate(id: string): ObjectTemplate | undefined {
  const normalized = decodeURIComponent(id).trim().toLowerCase();
  return OBJECT_TEMPLATES.find((template) =>
    template.id === normalized ||
    template.name.toLowerCase() === normalized ||
    template.objectType.toLowerCase() === normalized,
  );
}
