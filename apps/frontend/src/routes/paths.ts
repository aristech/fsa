// ----------------------------------------------------------------------

const ROOTS = {
  AUTH: '/auth',
  AUTH_DEMO: '/auth-demo',
  DASHBOARD: '/dashboard',
};

// ----------------------------------------------------------------------

export const paths = {
  comingSoon: '/coming-soon',
  maintenance: '/maintenance',
  pricing: '/pricing',
  payment: '/payment',
  about: '/about-us',
  contact: '/contact-us',
  faqs: '/faqs',
  page403: '/error/403',
  page404: '/error/404',
  page500: '/error/500',
  components: '/components',
  docs: '/docs',
  changelog: '#',
  zoneStore: '#',
  upgradePlan: '/upgrade',
  freeUI: '#',
  figmaUrl: '#',
  documentation: '/docs',

  // AUTH
  auth: {
    jwt: {
      signIn: `${ROOTS.AUTH}/jwt/sign-in`,
      signUp: `${ROOTS.AUTH}/jwt/sign-up`,
      verifyAccount: `${ROOTS.AUTH}/jwt/verify-account`,
      resetPassword: `${ROOTS.AUTH}/jwt/reset-password`,
    },
  },
  authDemo: {
    split: {
      signIn: `${ROOTS.AUTH_DEMO}/split/sign-in`,
      signUp: `${ROOTS.AUTH_DEMO}/split/sign-up`,
      resetPassword: `${ROOTS.AUTH_DEMO}/split/reset-password`,
      updatePassword: `${ROOTS.AUTH_DEMO}/split/update-password`,
      verify: `${ROOTS.AUTH_DEMO}/split/verify`,
    },
    centered: {
      signIn: `${ROOTS.AUTH_DEMO}/centered/sign-in`,
      signUp: `${ROOTS.AUTH_DEMO}/centered/sign-up`,
      resetPassword: `${ROOTS.AUTH_DEMO}/centered/reset-password`,
      updatePassword: `${ROOTS.AUTH_DEMO}/centered/update-password`,
      verify: `${ROOTS.AUTH_DEMO}/centered/verify`,
    },
  },
  // DASHBOARD
  dashboard: {
    root: ROOTS.DASHBOARD,
    mail: `${ROOTS.DASHBOARD}/mail`,
    blank: `${ROOTS.DASHBOARD}/blank`,
    kanban: `${ROOTS.DASHBOARD}/kanban`,
    calendar: `${ROOTS.DASHBOARD}/calendar`,
    fileManager: `${ROOTS.DASHBOARD}/file-manager`,
    permission: `${ROOTS.DASHBOARD}/permission`,
    general: {
      app: `${ROOTS.DASHBOARD}/app`,
      analytics: `${ROOTS.DASHBOARD}/analytics`,
    },
    user: {
      root: `${ROOTS.DASHBOARD}/user`,
      profile: `${ROOTS.DASHBOARD}/user/profile`,
      account: `${ROOTS.DASHBOARD}/user/account`,
      cards: `${ROOTS.DASHBOARD}/user/cards`,
      list: `${ROOTS.DASHBOARD}/user/list`,
    },
    product: {
      root: `${ROOTS.DASHBOARD}/product`,
      details: (id: string) => `${ROOTS.DASHBOARD}/product/${id}`,
      edit: (id: string) => `${ROOTS.DASHBOARD}/product/${id}/edit`,
    },
    // Field Service Automation (using existing dashboard structure)
    fsa: {
      root: ROOTS.DASHBOARD, // Use main dashboard
      workOrders: {
        root: `${ROOTS.DASHBOARD}/work-orders`,
        new: `${ROOTS.DASHBOARD}/work-orders/new`,
        details: (id: string) => `${ROOTS.DASHBOARD}/work-orders/${id}`,
        edit: (id: string) => `${ROOTS.DASHBOARD}/work-orders/${id}/edit`,
      },
      clients: {
        root: `${ROOTS.DASHBOARD}/clients`,
        new: `${ROOTS.DASHBOARD}/clients/new`,
        edit: (id: string) => `${ROOTS.DASHBOARD}/clients/${id}/edit`,
      },
      personnel: {
        root: `${ROOTS.DASHBOARD}/personnel`,
        new: `${ROOTS.DASHBOARD}/personnel/new`,
        details: (id: string) => `${ROOTS.DASHBOARD}/personnel/${id}`,
        edit: (id: string) => `${ROOTS.DASHBOARD}/personnel/${id}/edit`,
      },
      materials: {
        root: `${ROOTS.DASHBOARD}/materials`,
        new: `${ROOTS.DASHBOARD}/materials/new`,
        details: (id: string) => `${ROOTS.DASHBOARD}/materials/${id}`,
        edit: (id: string) => `${ROOTS.DASHBOARD}/materials/${id}/edit`,
      },
      technicians: {
        root: `${ROOTS.DASHBOARD}/technicians`,
        new: `${ROOTS.DASHBOARD}/technicians/new`,
        details: (id: string) => `${ROOTS.DASHBOARD}/technicians/${id}`,
        edit: (id: string) => `${ROOTS.DASHBOARD}/technicians/${id}/edit`,
      },
      scheduling: `${ROOTS.DASHBOARD}/scheduling`,
      reports: `${ROOTS.DASHBOARD}/reports`,
    },
    // Settings
    settings: {
      root: `${ROOTS.DASHBOARD}/settings`,
      webhooks: `${ROOTS.DASHBOARD}/settings/webhooks`,
      apiKeys: `${ROOTS.DASHBOARD}/settings/api-keys`,
      smsReminders: `${ROOTS.DASHBOARD}/settings/sms-reminders`,
      company: `${ROOTS.DASHBOARD}/settings/company`,
      support: `${ROOTS.DASHBOARD}/settings/support`,
    },
  },
};
