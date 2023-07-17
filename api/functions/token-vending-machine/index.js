const { AuthClient, CacheClient, Configurations, CacheGet, CredentialProvider, ExpiresIn, GenerateAuthToken, TopicRole, AllTopics, CacheRole } = require('@gomomento/sdk');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const secrets = new SecretsManagerClient();
let authClient;
let cacheClient;

exports.handler = async (event) => {
  try {
    await initializeMomento();

    const ipAddress = event.requestContext.identity.sourceIp;
    const cacheResponse = await cacheClient.get(process.env.CACHE_NAME, `${ipAddress}-token`);
    if (cacheResponse instanceof CacheGet.Hit) {
      return {
        statusCode: 200,
        body: cacheResponse.valueString(),
        headers: { 'Access-Control-Allow-Origin': '*' }
      };
    } else {
      const tokenScope = {
        permissions: [
          {
            role: TopicRole.PublishSubscribe,
            cache: process.env.CACHE_NAME,
            topic: AllTopics
          },
          {
            role: CacheRole.ReadWrite,
            cache: process.env.CACHE_NAME
          }
        ]
      };

      const token = await authClient.generateAuthToken(tokenScope, ExpiresIn.hours(1));
      if (token instanceof GenerateAuthToken.Success) {
        const vendedToken = JSON.stringify({
          token: token.authToken,
          exp: token.expiresAt.epoch()
        });

        await cacheClient.set(process.env.CACHE_NAME, `${ipAddress}-token`, vendedToken);
        return {
          statusCode: 200,
          body: vendedToken,
          headers: { 'Access-Control-Allow-Origin': '*' }
        };
      } else {
        throw new Error('Unable to create auth token');
      }
    }
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Something went wrong' }),
      headers: { 'Access-Control-Allow-Origin': '*' }
    };
  }
};

const initializeMomento = async () => {
  if (cacheClient && authClient) {
    return;
  }

  const secretResponse = await secrets.send(new GetSecretValueCommand({ SecretId: process.env.SECRET_ID }));
  const secret = JSON.parse(secretResponse.SecretString);
  cacheClient = new CacheClient({
    configuration: Configurations.InRegion.Default.latest(),
    credentialProvider: CredentialProvider.fromString({ authToken: secret.momento }),
    defaultTtlSeconds: 3300
  });

  authClient = new AuthClient({
    credentialProvider: CredentialProvider.fromString({ authToken: secret.momento })
  });
};