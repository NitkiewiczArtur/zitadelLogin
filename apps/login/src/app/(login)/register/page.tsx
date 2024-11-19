import { DynamicTheme } from "@/components/dynamic-theme";
import { RegisterFormWithoutPassword } from "@/components/register-form-without-password";
import {
  getBrandingSettings,
  getDefaultOrg,
  getLegalAndSupportSettings,
  getLoginSettings,
  getPasswordComplexitySettings,
} from "@/lib/zitadel";
import { Organization } from "@zitadel/proto/zitadel/org/v2/org_pb";
import { getLocale, getTranslations } from "next-intl/server";

export default async function Page({
  searchParams,
}: {
  searchParams: Record<string | number | symbol, string | undefined>;
}) {
  const locale = getLocale();
  const t = await getTranslations({ locale, namespace: "register" });

  let { firstname, lastname, email, organization, authRequestId } =
    searchParams;

  if (!organization) {
    const org: Organization | null = await getDefaultOrg();
    if (org) {
      organization = org.id;
    }
  }

  const setPassword = !!(firstname && lastname && email);

  const legal = await getLegalAndSupportSettings(organization);
  const passwordComplexitySettings =
    await getPasswordComplexitySettings(organization);

  const branding = await getBrandingSettings(organization);

  const loginSettings = await getLoginSettings(organization);

  if (!loginSettings?.allowRegister) {
    return (
      <DynamicTheme branding={branding}>
        <div>{t("disabled.title")}</div>
        <p className="ztdl-p">{t("disabled.description")}</p>
      </DynamicTheme>
    );
  }

  return (
    <DynamicTheme branding={branding}>
      <div className="flex flex-col items-center space-y-4">
        <h1>{t("title")}</h1>
        <p className="ztdl-p">{t("description")}</p>

        {legal && passwordComplexitySettings && (
          <RegisterFormWithoutPassword
            legal={legal}
            organization={organization}
            firstname={firstname}
            lastname={lastname}
            email={email}
            authRequestId={authRequestId}
            loginSettings={loginSettings}
          ></RegisterFormWithoutPassword>
        )}
      </div>
    </DynamicTheme>
  );
}
