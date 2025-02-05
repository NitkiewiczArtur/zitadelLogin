"use server";

import { addSessionToCookie, updateSessionCookie } from "@/lib/cookies";
import {
  createSessionForUserIdAndIdpIntent,
  createSessionFromChecks,
  getSession,
  setSession,
} from "@/lib/zitadel";
import { ConnectError, Duration, timestampMs } from "@zitadel/client";
import {
  CredentialsCheckError,
  CredentialsCheckErrorSchema,
  ErrorDetail,
} from "@zitadel/proto/zitadel/message_pb";
import {
  Challenges,
  RequestChallenges,
} from "@zitadel/proto/zitadel/session/v2/challenge_pb";
import { Session } from "@zitadel/proto/zitadel/session/v2/session_pb";
import { Checks } from "@zitadel/proto/zitadel/session/v2/session_service_pb";
import { headers } from "next/headers";
import { getServiceUrlFromHeaders } from "../service";

type CustomCookieData = {
  id: string;
  token: string;
  loginName: string;
  organization?: string;
  creationTs: string;
  expirationTs: string;
  changeTs: string;
  requestId?: string; // if its linked to an OIDC flow
};

const passwordAttemptsHandler = (error: ConnectError) => {
  const details = error.findDetails(CredentialsCheckErrorSchema);

  if (details[0] && "failedAttempts" in details[0]) {
    const failedAttempts = details[0].failedAttempts;
    throw {
      error: `Failed to authenticate: You had ${failedAttempts} password attempts.`,
      failedAttempts: failedAttempts,
    };
  }
  throw error;
};

export async function createSessionAndUpdateCookie(
  checks: Checks,
  challenges: RequestChallenges | undefined,
  requestId: string | undefined,
  lifetime?: Duration,
): Promise<Session> {
  const _headers = await headers();
  const { serviceUrl, serviceRegion } = getServiceUrlFromHeaders(_headers);

  const createdSession = await createSessionFromChecks({
    serviceUrl,
    serviceRegion,
    checks,
    challenges,
    lifetime,
  });

  if (createdSession) {
    return getSession({
      serviceUrl,
      serviceRegion,
      sessionId: createdSession.sessionId,
      sessionToken: createdSession.sessionToken,
    }).then((response) => {
      if (response?.session && response.session?.factors?.user?.loginName) {
        const sessionCookie: CustomCookieData = {
          id: createdSession.sessionId,
          token: createdSession.sessionToken,
          creationTs: response.session.creationDate
            ? `${timestampMs(response.session.creationDate)}`
            : "",
          expirationTs: response.session.expirationDate
            ? `${timestampMs(response.session.expirationDate)}`
            : "",
          changeTs: response.session.changeDate
            ? `${timestampMs(response.session.changeDate)}`
            : "",
          loginName: response.session.factors.user.loginName ?? "",
        };

        if (requestId) {
          sessionCookie.requestId = requestId;
        }

        if (response.session.factors.user.organizationId) {
          sessionCookie.organization =
            response.session.factors.user.organizationId;
        }

        return addSessionToCookie(sessionCookie).then(() => {
          return response.session as Session;
        });
      } else {
        throw "could not get session or session does not have loginName";
      }
    });
  } else {
    throw "Could not create session";
  }
}

export async function createSessionForIdpAndUpdateCookie(
  userId: string,
  idpIntent: {
    idpIntentId?: string | undefined;
    idpIntentToken?: string | undefined;
  },
  requestId: string | undefined,
  lifetime?: Duration,
): Promise<Session> {
  const _headers = await headers();
  const { serviceUrl, serviceRegion } = getServiceUrlFromHeaders(_headers);

  const createdSession = await createSessionForUserIdAndIdpIntent({
    serviceUrl,
    serviceRegion,
    userId,
    idpIntent,
    lifetime,
  }).catch((error: ErrorDetail | CredentialsCheckError) => {
    console.error("Could not set session", error);
    if ("failedAttempts" in error && error.failedAttempts) {
      throw {
        error: `Failed to authenticate: You had ${error.failedAttempts} password attempts.`,
        failedAttempts: error.failedAttempts,
      };
    }
    throw error;
  });

  if (!createdSession) {
    throw "Could not create session";
  }

  const { session } = await getSession({
    serviceUrl,
    serviceRegion,
    sessionId: createdSession.sessionId,
    sessionToken: createdSession.sessionToken,
  });

  if (!session || !session.factors?.user?.loginName) {
    throw "Could not retrieve session";
  }

  const sessionCookie: CustomCookieData = {
    id: createdSession.sessionId,
    token: createdSession.sessionToken,
    creationTs: session.creationDate
      ? `${timestampMs(session.creationDate)}`
      : "",
    expirationTs: session.expirationDate
      ? `${timestampMs(session.expirationDate)}`
      : "",
    changeTs: session.changeDate ? `${timestampMs(session.changeDate)}` : "",
    loginName: session.factors.user.loginName ?? "",
    organization: session.factors.user.organizationId ?? "",
  };

  if (requestId) {
    sessionCookie.requestId = requestId;
  }

  if (session.factors.user.organizationId) {
    sessionCookie.organization = session.factors.user.organizationId;
  }

  return addSessionToCookie(sessionCookie).then(() => {
    return session as Session;
  });
}

export type SessionWithChallenges = Session & {
  challenges: Challenges | undefined;
};

export async function setSessionAndUpdateCookie(
  recentCookie: CustomCookieData,
  checks?: Checks,
  challenges?: RequestChallenges,
  requestId?: string,
  lifetime?: Duration,
) {
  const _headers = await headers();
  const { serviceUrl, serviceRegion } = getServiceUrlFromHeaders(_headers);

  return setSession({
    serviceUrl,
    serviceRegion,
    sessionId: recentCookie.id,
    sessionToken: recentCookie.token,
    challenges,
    checks,
    lifetime,
  })
    .then((updatedSession) => {
      if (updatedSession) {
        const sessionCookie: CustomCookieData = {
          id: recentCookie.id,
          token: updatedSession.sessionToken,
          creationTs: recentCookie.creationTs,
          expirationTs: recentCookie.expirationTs,
          // just overwrite the changeDate with the new one
          changeTs: updatedSession.details?.changeDate
            ? `${timestampMs(updatedSession.details.changeDate)}`
            : "",
          loginName: recentCookie.loginName,
          organization: recentCookie.organization,
        };

        if (requestId) {
          sessionCookie.requestId = requestId;
        }

        return getSession({
          serviceUrl,
          serviceRegion,
          sessionId: sessionCookie.id,
          sessionToken: sessionCookie.token,
        }).then((response) => {
          if (response?.session && response.session.factors?.user?.loginName) {
            const { session } = response;
            const newCookie: CustomCookieData = {
              id: sessionCookie.id,
              token: updatedSession.sessionToken,
              creationTs: sessionCookie.creationTs,
              expirationTs: sessionCookie.expirationTs,
              // just overwrite the changeDate with the new one
              changeTs: updatedSession.details?.changeDate
                ? `${timestampMs(updatedSession.details.changeDate)}`
                : "",
              loginName: session.factors?.user?.loginName ?? "",
              organization: session.factors?.user?.organizationId ?? "",
            };

            if (sessionCookie.requestId) {
              newCookie.requestId = sessionCookie.requestId;
            }

            return updateSessionCookie(sessionCookie.id, newCookie).then(() => {
              return { challenges: updatedSession.challenges, ...session };
            });
          } else {
            throw "could not get session or session does not have loginName";
          }
        });
      } else {
        throw "Session not be set";
      }
    })
    .catch(passwordAttemptsHandler);
}
