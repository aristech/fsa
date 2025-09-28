import { useTranslate } from 'src/locales/use-locales';

// ----------------------------------------------------------------------

export function useSubscriptionTranslations() {
  const { t } = useTranslate('subscription');

  return {
    // Plan translations
    getPlanName: (planId: string) => t(`plans.${planId}.name`),
    getPlanDescription: (planId: string) => t(`plans.${planId}.description`),
    getPlanHighlight: (planId: string, index: number) => t(`plans.${planId}.highlights.${index}`),

    // Labels
    mostPopular: t('labels.mostPopular'),
    freeTrial: t('labels.freeTrial'),
    trialDays: t('labels.trialDays'),
    features: t('labels.features'),
    loading: t('labels.loading'),
    error: t('labels.error'),

    // Actions
    selectPlan: t('actions.selectPlan'),
    getStarted: t('actions.getStarted'),
    upgrade: t('actions.upgrade'),
    contactSales: t('actions.contactSales'),
    currentPlan: t('actions.currentPlan'),

    // Billing
    monthly: t('billing.monthly'),
    yearly: t('billing.yearly'),
    perMonth: t('billing.perMonth'),
    perYear: t('billing.perYear'),
    savings: t('billing.savings'),

    // Sections
    sectionTitle: t('sections.title'),
    sectionSubtitle: t('sections.subtitle'),
    sectionDescription: t('sections.description'),
  };
}
