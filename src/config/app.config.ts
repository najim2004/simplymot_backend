export default () => ({
  app: {
    name: process.env.APP_NAME,
    key: process.env.APP_KEY,
    url: process.env.APP_URL,
    client_app_url: process.env.CLIENT_APP_URL,
    port: parseInt(process.env.PORT, 10) || 3000,
  },

  fileSystems: {
    public: {},
    s3: {
      driver: 's3',
      key: process.env.AWS_ACCESS_KEY_ID,
      secret: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_DEFAULT_REGION,
      bucket: process.env.AWS_BUCKET,
      url: process.env.AWS_URL,
      endpoint: process.env.AWS_ENDPOINT,
    },
    gcs: {
      driver: 'gcs',
      projectId: process.env.GCP_PROJECT_ID,
      keyFile: process.env.GCP_KEY_FILE,
      apiEndpoint: process.env.GCP_API_ENDPOINT,
      bucket: process.env.GCP_BUCKET,
    },
  },

  database: {
    url: String(process.env.DATABASE_URL),
  },

  redis: {
    host: process.env.REDIS_HOST,
    password: process.env.REDIS_PASSWORD,
    port: process.env.REDIS_PORT,
  },

  rateLimit: {
    shortTtl: parseInt(process.env.RATE_LIMIT_SHORT_TTL || '60', 10),
    shortLimit: parseInt(process.env.RATE_LIMIT_SHORT_LIMIT || '20', 10),
    mediumTtl: parseInt(process.env.RATE_LIMIT_MEDIUM_TTL || '600', 10),
    mediumLimit: parseInt(process.env.RATE_LIMIT_MEDIUM_LIMIT || '100', 10),
  },

  security: {
    salt: 10,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiry: process.env.JWT_EXPIRY,
  },

  mail: {
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: process.env.MAIL_PORT || 587,
    user: process.env.MAIL_USERNAME,
    password: process.env.MAIL_PASSWORD,
    from: process.env.MAIL_FROM_ADDRESS,
    from_name: process.env.MAIL_FROM_NAME,
  },

  auth: {
    google: {
      app_id: process.env.GOOGLE_APP_ID,
      app_secret: process.env.GOOGLE_APP_SECRET,
      callback: process.env.GOOGLE_CALLBACK_URL,
    },
  },

  payment: {
    stripe: {
      secret_key: process.env.STRIPE_SECRET_KEY,
      webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
    },
    paypal: {
      client_id: process.env.PAYPAL_CLIENT_ID,
      secret: process.env.PAYPAL_SECRET,
      api: process.env.PAYPAL_API,
    },
  },

  /**
   * Storage directory
   */
  storageUrl: {
    rootUrl: './public/storage',
    rootUrlPublic: '/public/storage',
    // storage directory
    package: '/package',
    destination: '/destination',
    blog: '/blog',
    avatar: '/avatar',
    garage: '/garage',
    websiteInfo: '/website-info',
    // chat
    attachment: '/attachment',
  },

  defaultUser: {
    system: {
      username: process.env.SYSTEM_USERNAME,
      email: process.env.SYSTEM_EMAIL,
      password: process.env.SYSTEM_PASSWORD,
    },
  },

  dvla: {
    api_key: process.env.DVLA_API_KEY,
    /** Static fallback proxy when Webshare API is unavailable. */
    proxy_url: process.env.DVLA_PROXY_URL,
    /** Webshare API token — fetches current proxy list (refreshes when IPs change). */
    webshare_api_token: process.env.WEBSHARE_API_TOKEN,
    proxy_prefer_countries: (process.env.DVLA_PROXY_PREFER_COUNTRIES ?? 'GB,US')
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean),
    /** Minutes before re-fetching proxy list from Webshare (default 10). */
    proxy_refresh_minutes:
      parseInt(process.env.DVLA_PROXY_REFRESH_MINUTES ?? '10', 10) || 10,
  },
  mot: {
    client_id: process.env.MOT_CLIENT_ID,
    client_secret: process.env.MOT_CLIENT_SECRET,
    api_key: process.env.MOT_API_KEY,
  },

  /**
   * Background jobs (BullMQ). Subscription reconciliation runs off the HTTP thread
   * and defaults to low-traffic UK hours.
   */
  jobs: {
    subscriptionReconciliation: {
      enabled: process.env.SUBSCRIPTION_RECONCILE_ENABLED !== 'false',
      /** Cron pattern (BullMQ repeat). Default: 03:15 Europe/London */
      cronPattern: process.env.SUBSCRIPTION_RECONCILE_CRON || '15 3 * * *',
      timezone: process.env.SUBSCRIPTION_RECONCILE_TZ || 'Europe/London',
      batchSize: parseInt(
        process.env.SUBSCRIPTION_RECONCILE_BATCH_SIZE || '40',
        10,
      ),
      /** Parallel Stripe.retrieveSubscription calls inside one batch */
      stripeConcurrency: parseInt(
        process.env.SUBSCRIPTION_RECONCILE_STRIPE_CONCURRENCY || '5',
        10,
      ),
    },
  },
});
