export type Item = {
  name: string;
  slug: string;
  description?: string;
};

export enum ProviderSlug {
  GOOGLE = "google",
  GITHUB = "github",
}

export const demos: { name: string; items: Item[] }[] = [
  {
    name: "Login",
    items: [
      {
        name: "Loginname",
        slug: "loginname",
        description: "Start the loginflow with loginname",
      },
      {
        name: "Accounts",
        slug: "accounts",
        description: "List active and inactive sessions",
      },
      {
        name: "Passkey Registration",
        slug: "passkey/add",
        description: "The page to add a users passkey device",
      },
    ],
  },
  {
    name: "Register",
    items: [
      {
        name: "Register",
        slug: "register",
        description: "Add a user with password or passkey",
      },
      {
        name: "IDP Register",
        slug: "register/idp",
        description: "Add a user from an external identity provider",
      },
    ],
  },
];
