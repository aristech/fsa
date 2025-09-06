## Prerequisites

- Node.js >=20 (Recommended)
- MongoDB running on localhost:27017
- Yarn package manager

## Quick Setup

For a fresh installation, simply run:

```sh
# 1. Install dependencies
yarn install

# 2. Start the development server (in one terminal)
yarn dev

# 3. Run the complete setup script (in another terminal)
node setup-initial-data.js
```

That's it! The setup script will handle everything automatically.

**Login Credentials:**
- URL: http://localhost:8082
- Email: admin@fsa-demo.com
- Password: admin123
- Tenant Slug: fsa-demo

For detailed setup instructions, see [SETUP.md](./SETUP.md).

## Manual Installation

**Using Yarn (Recommended)**

```sh
yarn install
yarn dev
```

**Using Npm**

```sh
npm i
npm run dev
```

## Build

```sh
yarn build
# or
npm run build
```

## Mock server

By default we provide demo data from : `https://api-dev-minimal-[version].vercel.app`

To set up your local server:

- **Guide:** [https://docs.minimals.cc/mock-server](https://docs.minimals.cc/mock-server).

- **Resource:** [Download](https://www.dropbox.com/scl/fo/bopqsyaatc8fbquswxwww/AKgu6V6ZGmxtu22MuzsL5L4?rlkey=8s55vnilwz2d8nsrcmdo2a6ci&dl=0).

## Full version

- Create React App ([migrate to CRA](https://docs.minimals.cc/migrate-to-cra/)).
- Next.js
- Vite.js

## Starter version

- To remove unnecessary components. This is a simplified version ([https://starter.minimals.cc/](https://starter.minimals.cc/))
- Good to start a new project. You can copy components from the full version.
- Make sure to install the dependencies exactly as compared to the full version.

---

**NOTE:**
_When copying folders remember to also copy hidden files like .env. This is important because .env files often contain environment variables that are crucial for the application to run correctly._
