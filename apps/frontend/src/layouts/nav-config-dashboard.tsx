import type { NavSectionProps } from 'src/components/nav-section';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

import { Label } from 'src/components/label';
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
  workOrder: icon('ic-order'),
  customer: icon('ic-user'),
  technician: icon('ic-user'),
  scheduling: icon('ic-calendar'),
  reports: icon('ic-analytics'),
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
export const navData: NavSectionProps['data'] = [
  /**
   * Overview
   */
  {
    subheader: 'Overview',
    items: [
      { title: 'App', path: paths.dashboard.root, icon: ICONS.dashboard },
      { title: 'Analytics', path: paths.dashboard.general.analytics, icon: ICONS.analytics },
    ],
  },
  /**
   * Management
   */
  {
    subheader: 'Management',
    items: [
      { title: 'Projects & Tasks', path: paths.dashboard.kanban, icon: ICONS.kanban },
      { title: 'Calendar', path: paths.dashboard.calendar, icon: ICONS.calendar },
      {
        title: 'Chat',
        path: paths.dashboard.chat,
        icon: ICONS.chat,
        info: (
          <Label color="error" variant="inverted">
            +32
          </Label>
        ),
      },
    ],
  },
  /**
   * Field Service Automation
   */
  {
    subheader: 'Field Service Automation',
    items: [
      {
        title: 'Work Orders',
        path: paths.dashboard.fsa.workOrders.root,
        icon: ICONS.workOrder,
        requiredPermissions: 'work_orders.view',
        children: [
          {
            title: 'List',
            path: paths.dashboard.fsa.workOrders.root,
            requiredPermissions: 'work_orders.view',
          },
          {
            title: 'Create',
            path: paths.dashboard.fsa.workOrders.new,
            requiredPermissions: 'work_orders.create',
          },
        ],
      },
      {
        title: 'Clients',
        path: paths.dashboard.fsa.clients.root,
        icon: ICONS.customer,
        requiredPermissions: 'clients.view',
        children: [
          {
            title: 'List',
            path: paths.dashboard.fsa.clients.root,
            requiredPermissions: 'clients.view',
          },
          {
            title: 'Create',
            path: paths.dashboard.fsa.clients.new,
            requiredPermissions: 'clients.create',
          },
        ],
      },
      {
        title: 'Personnel',
        path: '/dashboard/personnel',
        icon: ICONS.technician,
        requiredPermissions: 'personnel.view',
        children: [
          { title: 'List', path: '/dashboard/personnel', requiredPermissions: 'personnel.view' },
          {
            title: 'Roles',
            path: '/dashboard/personnel/roles',
            requiredPermissions: 'roles.manage',
          },
        ],
      },
    ],
  },
  /**
   * Item state
   */
  {
    subheader: 'Settings',
    items: [],
  },
];
