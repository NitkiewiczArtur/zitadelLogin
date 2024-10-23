"use server";

import {
  getUserByID,
  listAuthenticationMethodTypes,
  resendEmailCode,
  resendInviteCode,
  verifyEmail,
  verifyInviteCode,
} from "@/lib/zitadel";
import { create } from "@zitadel/client";
import { ChecksSchema } from "@zitadel/proto/zitadel/session/v2/session_service_pb";
import { redirect } from "next/navigation";
import { createSessionAndUpdateCookie } from "./cookie";

type VerifyUserByEmailCommand = {
  userId: string;
  code: string;
  isInvite: boolean;
  authRequestId?: string;
};

export async function verifyUserAndCreateSession(
  command: VerifyUserByEmailCommand,
) {
  const verifyResponse = command.isInvite
    ? await verifyInviteCode(command.userId, command.code).catch((error) => {
        return { error: "Could not verify invite" };
      })
    : await verifyEmail(command.userId, command.code).catch((error) => {
        return { error: "Could not verify email" };
      });

  if (!verifyResponse) {
    return { error: "Could not verify user" };
  }

  const userResponse = await getUserByID(command.userId);

  if (!userResponse || !userResponse.user) {
    return { error: "Could not load user" };
  }

  const checks = create(ChecksSchema, {
    user: {
      search: {
        case: "loginName",
        value: userResponse.user.preferredLoginName,
      },
    },
  });

  const session = await createSessionAndUpdateCookie(
    checks,
    undefined,
    command.authRequestId,
  );

  const authMethodResponse = await listAuthenticationMethodTypes(
    command.userId,
  );

  if (!authMethodResponse || !authMethodResponse.authMethodTypes) {
    return { error: "Could not load possible authenticators" };
  }
  console.log("xs");
  // if no authmethods are found on the user, redirect to set one up
  if (
    authMethodResponse &&
    authMethodResponse.authMethodTypes &&
    authMethodResponse.authMethodTypes.length == 0
  ) {
    const params = new URLSearchParams({
      sessionId: session.id,
    });

    if (session.factors?.user?.loginName) {
      params.set("loginName", session.factors?.user?.loginName);
    }

    console.log("/authenticator/set?" + params);
    return redirect("/authenticator/set?" + params);
  }

  // return {
  //   authMethodTypes: authMethodResponse.authMethodTypes,
  //   sessionId: session.id,
  //   factors: session.factors,
  // };
}

type resendVerifyEmailCommand = {
  userId: string;
  isInvite: boolean;
};

export async function resendVerification(command: resendVerifyEmailCommand) {
  return command.isInvite
    ? resendEmailCode(command.userId)
    : resendInviteCode(command.userId);
}
