import { DynamicTheme } from "@/components/dynamic-theme";
import { RegisterForm } from "@/components/register-form";
import { getServiceUrlFromHeaders } from "@/lib/service";
import {
  getBrandingSettings,
  getDefaultOrg,
  getLegalAndSupportSettings,
  getLoginSettings,
  getPasswordComplexitySettings,
} from "@/lib/zitadel";
import { Organization } from "@zitadel/proto/zitadel/org/v2/org_pb";
import { getLocale, getTranslations } from "next-intl/server";
import { headers } from "next/headers";

export default async function Page(props: {
  searchParams: Promise<Record<string | number | symbol, string | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const locale = getLocale();
  const t = await getTranslations({ locale, namespace: "register" });

  let { firstname, lastname, email, organization, requestId } = searchParams;

  const _headers = await headers();
  const { serviceUrl, serviceRegion } = getServiceUrlFromHeaders(_headers);

  if (!organization) {
    const org: Organization | null = await getDefaultOrg({
      serviceUrl,
      serviceRegion,
    });
    if (org) {
      organization = org.id;
    }
  }

  const legal = await getLegalAndSupportSettings({
    serviceUrl,
    serviceRegion,
    organization,
  });
  const passwordComplexitySettings = await getPasswordComplexitySettings({
    serviceUrl,
    serviceRegion,
    organization,
  });

  const branding = await getBrandingSettings({
    serviceUrl,
    serviceRegion,
    organization,
  });

  const loginSettings = await getLoginSettings({
    serviceUrl,
    serviceRegion,
    organization,
  });

  if (!loginSettings?.allowRegister) {
    return (
      <DynamicTheme branding={branding}>
        <div className="flex flex-col items-center space-y-4">
          <h1>{t("disabled.title")}</h1>
          <p className="ztdl-p">{t("disabled.description")}</p>
        </div>
      </DynamicTheme>
    );
  }

  return (
    <DynamicTheme branding={branding}>
      <div className="flex flex-col items-center space-y-4">
        <h1>{t("title")}</h1>
        <p className="ztdl-p">{t("description")}</p>

        {legal && passwordComplexitySettings && (
          <RegisterForm
            legal={legal}
            organization={organization}
            firstname={firstname}
            lastname={lastname}
            email={email}
            requestId={requestId}
            loginSettings={loginSettings}
          ></RegisterForm>
        )}
      </div>
    </DynamicTheme>
  );
}
