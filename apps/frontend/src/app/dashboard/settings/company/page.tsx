import { DynamicTitle } from 'src/components/dynamic-title';

import { CompanySettingsView } from 'src/sections/settings/company/view/company-settings-view';

// ----------------------------------------------------------------------

export default function CompanySettingsPage() {
  return (
    <>
      <DynamicTitle title="Company Settings" />
      <CompanySettingsView />
    </>
  );
}
