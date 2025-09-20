import type { Metadata } from 'next';

import { CONFIG } from 'src/global-config';

import { AIAssistantView } from 'src/sections/ai-assistant/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `AI Assistant - ${CONFIG.appName}` };

export default function Page() {
  return <AIAssistantView />;
}