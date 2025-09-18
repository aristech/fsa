import type { NavSectionProps } from 'src/components/nav-section';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';
import { useTranslate } from 'src/locales/use-locales';

import { SvgColor } from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name: string) => (
  <SvgColor src={`${CONFIG.assetsDir}/assets/icons/navbar/${name}.svg`} />
);

const ICONS = {
  job: icon('ic-job'),
  blog: icon('ic-blog'),
  chat: icon('ic-chat'),
  mail: icon('ic-mail'),
  user: icon('ic-user'),
  file: icon('ic-file'),
  lock: icon('ic-lock'),
  tour: icon('ic-tour'),
  order: icon('ic-order'),
  label: icon('ic-label'),
  blank: icon('ic-blank'),
  kanban: icon('ic-kanban'),
  folder: icon('ic-folder'),
  course: icon('ic-course'),
  params: icon('ic-params'),
  banking: icon('ic-banking'),
  booking: icon('ic-booking'),
  invoice: icon('ic-invoice'),
  product: icon('ic-product'),
  calendar: icon('ic-calendar'),
  disabled: icon('ic-disabled'),
  external: icon('ic-external'),
  subpaths: icon('ic-subpaths'),
  menuItem: icon('ic-menu-item'),
  ecommerce: icon('ic-ecommerce'),
  analytics: icon('ic-analytics'),
  dashboard: icon('ic-dashboard'),
  // FSA Icons
  workOrder: icon('ic-course'),
  customer: icon('ic-banking'),
  technician: icon('ic-user'),
  scheduling: icon('ic-calendar'),
  reports: icon('ic-analytics'),
  materials: icon('ic-job'),
};

// ----------------------------------------------------------------------

/**
 * Input nav data is an array of navigation section items used to define the structure and content of a navigation bar.
 * Each section contains a subheader and an array of items, which can include nested children items.
 *
 * Each item can have the following properties:
 * - `title`: The title of the navigation item.
 * - `path`: The URL path the item links to.
 * - `icon`: An optional icon component to display alongside the title.
 * - `info`: Optional additional information to display, such as a label.
 * - `allowedRoles`: An optional array of roles that are allowed to see the item.
 * - `caption`: An optional caption to display below the title.
 * - `children`: An optional array of nested navigation items.
 * - `disabled`: An optional boolean to disable the item.
 * - `deepMatch`: An optional boolean to indicate if the item should match subpaths.
 */
export function useNavData(): NavSectionProps['data'] {
  const { t } = useTranslate('navbar');

  return [
    /**
     * Overview
     */
    {
      subheader: t('overview.title'),
      items: [
        { title: t('overview.app'), path: paths.dashboard.root, icon: ICONS.dashboard },
        { title: t('overview.analytics'), path: paths.dashboard.general.analytics, icon: ICONS.analytics },
        { title: t('overview.reports'), path: '/dashboard/analytics/reports', icon: ICONS.tour },
      ],
    },
    /**
     * Management
     */
    {
      subheader: t('management.title'),
      items: [
        { title: t('management.projectsTasks'), path: paths.dashboard.kanban, icon: ICONS.kanban },
        { title: t('management.calendar'), path: paths.dashboard.calendar, icon: ICONS.calendar },
        // {
        //   title: t('management.chat'),
        //   path: paths.dashboard.chat,
        //   icon: ICONS.chat,
        //   info: (
        //     <Label color="error" variant="inverted">
        //       +32
        //     </Label>
        //   ),
        // },
      ],
    },
    /**
     * Field Service Automation
     */
    {
      subheader: t('fieldService.title'),
      items: [
        {
          title: t('fieldService.workOrders.title'),
          path: paths.dashboard.fsa.workOrders.root,
          icon: ICONS.workOrder,
          requiredPermissions: 'work_orders.view',
          children: [
            {
              title: t('fieldService.workOrders.list'),
              path: paths.dashboard.fsa.workOrders.root,
              requiredPermissions: 'work_orders.view',
            },
            {
              title: t('fieldService.workOrders.create'),
              path: paths.dashboard.fsa.workOrders.new,
              requiredPermissions: 'work_orders.create',
            },
          ],
        },
        {
          title: t('fieldService.clients.title'),
          path: paths.dashboard.fsa.clients.root,
          icon: ICONS.customer,
          requiredPermissions: 'clients.view',
          children: [
            {
              title: t('fieldService.clients.list'),
              path: paths.dashboard.fsa.clients.root,
              requiredPermissions: 'clients.view',
            },
            {
              title: t('fieldService.clients.create'),
              path: paths.dashboard.fsa.clients.new,
              requiredPermissions: 'clients.create',
            },
          ],
        },
        {
          title: t('fieldService.personnel.title'),
          path: '/dashboard/personnel',
          icon: ICONS.technician,
          requiredPermissions: 'personnel.view',
          children: [
            { title: t('fieldService.personnel.list'), path: '/dashboard/personnel', requiredPermissions: 'personnel.view' },
            {
              title: t('fieldService.personnel.roles'),
              path: '/dashboard/personnel/roles',
              requiredPermissions: 'roles.manage',
            },
          ],
        },
        {
          title: t('fieldService.materials.title'),
          path: paths.dashboard.fsa.materials.root,
          icon: ICONS.materials,
          requiredPermissions: 'materials.view',
          children: [
            {
              title: t('fieldService.materials.list'),
              path: paths.dashboard.fsa.materials.root,
              requiredPermissions: 'materials.view',
            },
          ],
        },
      ],
    },
    /**
     * Item state
     */
    {
      subheader: t('settings.title'),
      items: [],
    },
  ];
}
