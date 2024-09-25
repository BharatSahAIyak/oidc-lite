import { PrismaClient, OidcModel } from '@prisma/client';
import { Adapter, AdapterPayload } from 'oidc-provider';
import { ApplicationDataDto } from 'src/application/application.dto';
import { PrismaService } from '../prisma/prisma.service';
import { UtilsService } from '../utils/utils.service';

const prisma = new PrismaClient();

export const types = [
  'Session', // 1
  'AccessToken', // rem
  'AuthorizationCode', // 3 rem
  'RefreshToken', // bn rha h and getting saved in oidcModel, ttl set krna h, iska aur id token ka
  'DeviceCode',
  'ClientCredentials',
  'Client', // done
  'InitialAccessToken',
  'RegistrationAccessToken',
  'Interaction',
  'ReplayDetection',
  'PushedAuthorizationRequest',
  'Grant', //13
  'BackchannelAuthenticationRequest',
].reduce(
  (map, name, i) => ({ ...map, [name]: i + 1 }),
  {} as Record<string, number>,
);

const prepare = (doc: OidcModel) => {
  doc.payload = JSON.parse(doc.payload);
  const isPayloadJson =
    doc.payload &&
    typeof doc.payload === 'object' &&
    !Array.isArray(doc.payload);

  const payload = isPayloadJson ? doc.payload : {};

  return {
    ...payload,
    ...(doc.consumedAt ? { consumed: true } : undefined),
  };
};

export const expiresAt = (expiresIn?: number) =>
  expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

export class PrismaAdapter implements Adapter {
  type: number;
  name: string;
  private static prismaService: PrismaService;
  private static utilsService: UtilsService;
  static {
    this.prismaService = new PrismaService();
    this.utilsService = new UtilsService(PrismaAdapter.prismaService);
  }
  constructor(name: string) {
    this.type = types[name];
    this.name = name;
  }

  async upsert(
    id: string,
    payload: AdapterPayload,
    expiresIn?: number,
  ): Promise<void> {
    const data = {
      type: this.type,
      payload: JSON.stringify(payload),
      grantId: payload.grantId,
      userCode: payload.userCode,
      uid: payload.uid,
      expiresAt: expiresAt(expiresIn),
    };

    await prisma.oidcModel.upsert({
      where: {
        id_type: {
          id,
          type: this.type,
        },
      },
      update: {
        ...data,
      },
      create: {
        id,
        ...data,
      },
    });
  }

  async find(id: string): Promise<AdapterPayload | undefined> {
    if (this.name === 'Client') {
      const client = await PrismaAdapter.prismaService.application.findUnique({
        where: { id },
      });
      if (!client || !client.active) return undefined;

      const clientData: ApplicationDataDto = JSON.parse(client.data);
      const scope =
        await PrismaAdapter.utilsService.returnScopesForAGivenApplicationId(id);

      const formattedClientData: AdapterPayload = {
        client_id: id,
        client_secret: clientData.oauthConfiguration.clientSecret,
        redirect_uris: clientData.oauthConfiguration.authorizedRedirectURLs,
        grant_types: clientData.oauthConfiguration.enabledGrants,
        client_name: client.name,
        post_logout_redirect_uris: [clientData.oauthConfiguration.logoutURL], // check this, not having any effect
        scope: scope.join(' '),
        logo_uri: client.logo_uri, // this is url to application image to display while login
        extra: {
          skipConsentScreen: clientData.oauthConfiguration.skipConsentScreen,
          enablePKCE: clientData.oauthConfiguration.enablePKCE,
        },
        'urn:custom:client:allowed-cors-origins':
          clientData.oauthConfiguration.authorizedOriginURLs, // TODO: might be used in cors else remove
      };
      // console.log(formattedClientData);
      return formattedClientData;
    }
    const doc = await prisma.oidcModel.findUnique({
      where: {
        id_type: {
          id,
          type: this.type,
        },
      },
    });
    // doc.payload = JSON.parse(doc.payload);
    if (this.name === 'Session') {
    }
    if (this.name === 'Interaction') {
      const params = JSON.parse(doc.payload).params;
      const client_id = params.client_id;
      const client = await PrismaAdapter.prismaService.application.findUnique({
        where: { id: client_id },
      });
      if (!client) return undefined;
    }

    if (!doc || (doc.expiresAt && doc.expiresAt < new Date())) {
      return undefined;
    }

    return prepare(doc);
  }

  // to return previous instance of session by its uid
  async findByUid(uid: string): Promise<AdapterPayload | undefined> {
    const doc = await prisma.oidcModel.findUnique({
      where: {
        uid,
      },
    });

    if (!doc || (doc.expiresAt && doc.expiresAt < new Date())) {
      return undefined;
    }

    return prepare(doc);
  }

  // for device code
  async findByUserCode(userCode: string): Promise<AdapterPayload | undefined> {
    const doc = await prisma.oidcModel.findFirst({
      where: {
        userCode,
      },
    });
    doc.payload = JSON.parse(doc.payload);

    if (!doc || (doc.expiresAt && doc.expiresAt < new Date())) {
      return undefined;
    }

    return prepare(doc);
  }

  // marked the model consumed but not expired
  async consume(id: string): Promise<void> {
    await prisma.oidcModel.update({
      where: {
        id_type: {
          id,
          type: this.type,
        },
      },
      data: {
        consumedAt: new Date(),
      },
    });
  }

  // remove an oidc-model
  async destroy(id: string): Promise<void> {
    await prisma.oidcModel.delete({
      where: {
        id_type: {
          id,
          type: this.type,
        },
      },
    });
  }

  // remove an oidc-model by grantId
  async revokeByGrantId(grantId: string): Promise<void> {
    await prisma.oidcModel.deleteMany({
      where: {
        grantId,
      },
    });
  }
}
