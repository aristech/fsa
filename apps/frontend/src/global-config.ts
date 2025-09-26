import { paths } from 'src/routes/paths';

import packageJson from '../package.json';

// ----------------------------------------------------------------------

export type ConfigValue = {
  appName: string;
  appVersion: string;
  serverUrl: string;
  assetsDir: string;
  isStaticExport: boolean;
  upload: {
    maxFileSizeMB: number;
    maxFilesPerRequest: number;
  };
  auth: {
    method: 'jwt';
    skip: boolean;
    redirectPath: string;
  };
};

// ----------------------------------------------------------------------

export const CONFIG: ConfigValue = {
  appName: 'Field Service Automation',
  appVersion: packageJson.version,
  serverUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
  assetsDir: process.env.NEXT_PUBLIC_ASSETS_DIR ?? '',
  isStaticExport: JSON.parse(process.env.BUILD_STATIC_EXPORT ?? 'false'),
  /**
   * File Upload
   */
  upload: {
    maxFileSizeMB: parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB ?? '10', 10),
    maxFilesPerRequest: parseInt(process.env.NEXT_PUBLIC_MAX_FILES_PER_REQUEST ?? '10', 10),
  },
  /**
   * Auth
   * @method jwt
   */
  auth: {
    method: 'jwt',
    skip: false,
    redirectPath: paths.dashboard.root,
  },
};
