import { Tabs } from '../../ui';

/** `/admin/settings` (General) and `/admin/settings/templates`. */
export function SettingsTabs() {
  return (
    <Tabs
      label="Settings sections"
      items={[
        { to: '/admin/settings', label: 'General' },
        { to: '/admin/settings/templates', label: 'Templates' },
      ]}
    />
  );
}
