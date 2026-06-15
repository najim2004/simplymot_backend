import axios, { AxiosProxyConfig, AxiosResponse } from 'axios';
import appConfig from '../../../config/app.config';
import {
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from '@nestjs/common';

/**
 * DVLA Service for interacting with UK Driver and Vehicle Licensing Agency APIs
 *
 * Outbound proxy: Webshare API (GB → US) with DVLA_PROXY_URL fallback.
 */
export class DvlaService {
  private static readonly logger = new Logger(DvlaService.name);

  private static readonly DVLA_API_KEY = appConfig().dvla.api_key;
  private static readonly DVLA_VEHICLE_URL =
    'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles';
  private static readonly MOT_API_BASE_URL =
    'https://history.mot.api.gov.uk/v1/trade/vehicles/registration';
  private static readonly MOT_CLIENT_ID = appConfig().mot.client_id;
  private static readonly MOT_CLIENT_SECRET = appConfig().mot.client_secret;
  private static readonly MOT_TOKEN_URL =
    'https://login.microsoftonline.com/a455b827-244f-4c97-b5b4-ce5d13b4d00c/oauth2/v2.0/token';
  private static readonly MOT_SCOPE = 'https://tapi.dvsa.gov.uk/.default';
  private static readonly WEBSHARE_PROXY_LIST_URL =
    'https://proxy.webshare.io/api/v2/proxy/list/';

  private static motAccessToken: string | null = null;
  private static tokenExpiryTime: number = 0;
  private static outboundProxyCache: {
    config: AxiosProxyConfig;
    country: string;
    fetchedAt: number;
  } | null = null;

  static async resolveOutboundProxy(): Promise<AxiosProxyConfig | undefined> {
    const { dvla } = appConfig();
    const apiToken = dvla.webshare_api_token?.trim();
    const fallbackUrl = dvla.proxy_url?.trim();
    const refreshMinutes = dvla.proxy_refresh_minutes ?? 10;
    const preferCountries = dvla.proxy_prefer_countries ?? ['GB', 'US'];
    const ttlMs = refreshMinutes * 60 * 1000;
    const now = Date.now();

    if (!apiToken && !fallbackUrl) {
      return undefined;
    }

    if (
      this.outboundProxyCache &&
      now - this.outboundProxyCache.fetchedAt < ttlMs
    ) {
      return this.outboundProxyCache.config;
    }

    if (apiToken) {
      try {
        for (const countryCode of preferCountries) {
          const listResponse = await axios.get<{
            results: Array<{
              id: string;
              username: string;
              password: string;
              proxy_address: string;
              port: number;
              valid: boolean;
              country_code: string;
            }>;
          }>(this.WEBSHARE_PROXY_LIST_URL, {
            params: {
              mode: 'direct',
              valid: true,
              country_code__in: countryCode,
              page: 1,
              page_size: 25,
            },
            headers: { Authorization: `Token ${apiToken}` },
            timeout: 15000,
          });

          const entry = listResponse.data.results?.find(
            (proxyEntry) =>
              proxyEntry.valid &&
              proxyEntry.proxy_address &&
              proxyEntry.port &&
              proxyEntry.username &&
              proxyEntry.password,
          );

          if (entry) {
            const config: AxiosProxyConfig = {
              protocol: 'http',
              host: entry.proxy_address,
              port: entry.port,
              auth: {
                username: entry.username,
                password: entry.password,
              },
            };
            this.outboundProxyCache = {
              config,
              country: entry.country_code,
              fetchedAt: now,
            };
            this.logger.log(
              `DVLA outbound proxy via Webshare (${entry.country_code}) ${config.host}:${config.port}`,
            );
            return config;
          }
        }

        this.logger.warn(
          'Webshare API returned no valid proxy for preferred countries; trying DVLA_PROXY_URL fallback',
        );
      } catch (error) {
        this.logger.warn(
          `Webshare proxy list fetch failed: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    if (fallbackUrl) {
      try {
        const normalized = fallbackUrl.trim().replace(/\/+$/, '');
        const parsedUrl = new URL(normalized);
        const protocol = (parsedUrl.protocol.replace(':', '') || 'http') as
          | 'http'
          | 'https';
        const port = parsedUrl.port
          ? parseInt(parsedUrl.port, 10)
          : protocol === 'https'
            ? 443
            : 80;
        const auth =
          parsedUrl.username !== ''
            ? {
                username: decodeURIComponent(parsedUrl.username),
                password: decodeURIComponent(parsedUrl.password),
              }
            : undefined;
        const config: AxiosProxyConfig = {
          protocol,
          host: parsedUrl.hostname,
          port,
          auth,
        };
        this.outboundProxyCache = {
          config,
          country: 'static',
          fetchedAt: now,
        };
        this.logger.log(
          `DVLA outbound proxy via DVLA_PROXY_URL ${config.host}:${config.port}`,
        );
        return config;
      } catch {
        this.logger.warn(
          'DVLA_PROXY_URL is set but could not be parsed; outbound calls run without proxy',
        );
      }
    }

    return undefined;
  }

  static async getVehicleDetails(
    registrationNumber: string,
  ): Promise<DvlaVehicleResponse> {
    try {
      const normalizedRegistration =
        this.normalizeRegistrationNumber(registrationNumber);

      if (!this.isValidRegistrationNumber(normalizedRegistration)) {
        throw new BadRequestException('Invalid registration number format');
      }

      let proxy = await this.resolveOutboundProxy();
      let response: AxiosResponse<DvlaVehicleResponse>;

      try {
        response = await axios.post(
          this.DVLA_VEHICLE_URL,
          { registrationNumber: normalizedRegistration },
          {
            headers: {
              'x-api-key': this.DVLA_API_KEY,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
            ...(proxy ? { proxy } : {}),
          },
        );
      } catch (error) {
        let proxyError = false;
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 407) {
            proxyError = true;
          } else if (
            !error.response &&
            error.code &&
            [
              'ECONNREFUSED',
              'ETIMEDOUT',
              'ECONNRESET',
              'EPROXY',
              'ECONNABORTED',
              'ENOTFOUND',
            ].includes(error.code)
          ) {
            proxyError = true;
          }
        } else {
          const code = (error as NodeJS.ErrnoException)?.code;
          if (
            code === 'ECONNREFUSED' ||
            code === 'ETIMEDOUT' ||
            code === 'ECONNRESET' ||
            code === 'EPROXY' ||
            code === 'ECONNABORTED'
          ) {
            proxyError = true;
          }
        }

        if (!proxyError) {
          this.handleDvlaApiError(error, registrationNumber, 'vehicle details');
        }

        this.logger.warn(
          'Outbound proxy error; refreshing proxy list and retrying once',
        );
        this.outboundProxyCache = null;
        proxy = await this.resolveOutboundProxy();
        response = await axios.post(
          this.DVLA_VEHICLE_URL,
          { registrationNumber: normalizedRegistration },
          {
            headers: {
              'x-api-key': this.DVLA_API_KEY,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
            ...(proxy ? { proxy } : {}),
          },
        );
      }

      this.logger.log(
        `Successfully retrieved vehicle details for: ${normalizedRegistration}`,
      );
      return response.data;
    } catch (error) {
      this.handleDvlaApiError(error, registrationNumber, 'vehicle details');
    }
  }

  static async getMotHistory(
    registrationNumber: string,
  ): Promise<MotHistoryResponse> {
    try {
      const normalizedRegistration =
        this.normalizeRegistrationNumber(registrationNumber);

      this.logger.log(
        `Fetching MOT history for registration: ${normalizedRegistration}`,
      );

      if (!this.isValidRegistrationNumber(normalizedRegistration)) {
        throw new BadRequestException('Invalid registration number format');
      }

      await this.ensureValidMotToken();

      const config = appConfig();
      const motUserAgent =
        process.env.MOT_API_USER_AGENT?.trim() ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';

      let proxy = await this.resolveOutboundProxy();
      let response: AxiosResponse<MotHistoryResponse>;

      try {
        response = await axios.get(
          `${this.MOT_API_BASE_URL}/${normalizedRegistration}`,
          {
            headers: {
              Authorization: `Bearer ${this.motAccessToken}`,
              'X-API-Key': config.mot.api_key,
              'User-Agent': motUserAgent,
              Accept: 'application/json, text/plain, */*',
              'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
              'Accept-Encoding': 'gzip, deflate, br',
              'Sec-Fetch-Dest': 'empty',
              'Sec-Fetch-Mode': 'cors',
              'Sec-Fetch-Site': 'cross-site',
              'Sec-Ch-Ua': '"Chromium";v="129", "Not=A?Brand";v="24"',
              'Sec-Ch-Ua-Mobile': '?0',
              'Sec-Ch-Ua-Platform': '"Windows"',
              DNT: '1',
              Connection: 'keep-alive',
              'Upgrade-Insecure-Requests': '1',
            },
            timeout: 15000,
            ...(proxy ? { proxy } : {}),
          },
        );
      } catch (error) {
        let proxyError = false;
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 407) {
            proxyError = true;
          } else if (
            !error.response &&
            error.code &&
            [
              'ECONNREFUSED',
              'ETIMEDOUT',
              'ECONNRESET',
              'EPROXY',
              'ECONNABORTED',
              'ENOTFOUND',
            ].includes(error.code)
          ) {
            proxyError = true;
          }
        } else {
          const code = (error as NodeJS.ErrnoException)?.code;
          if (
            code === 'ECONNREFUSED' ||
            code === 'ETIMEDOUT' ||
            code === 'ECONNRESET' ||
            code === 'EPROXY' ||
            code === 'ECONNABORTED'
          ) {
            proxyError = true;
          }
        }

        if (!proxyError) {
          this.handleMotApiError(error, registrationNumber, 'MOT history');
        }

        this.logger.warn(
          'Outbound proxy error; refreshing proxy list and retrying once',
        );
        this.outboundProxyCache = null;
        proxy = await this.resolveOutboundProxy();
        response = await axios.get(
          `${this.MOT_API_BASE_URL}/${normalizedRegistration}`,
          {
            headers: {
              Authorization: `Bearer ${this.motAccessToken}`,
              'X-API-Key': config.mot.api_key,
              'User-Agent': motUserAgent,
              Accept: 'application/json, text/plain, */*',
              'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
              'Accept-Encoding': 'gzip, deflate, br',
              'Sec-Fetch-Dest': 'empty',
              'Sec-Fetch-Mode': 'cors',
              'Sec-Fetch-Site': 'cross-site',
              'Sec-Ch-Ua': '"Chromium";v="129", "Not=A?Brand";v="24"',
              'Sec-Ch-Ua-Mobile': '?0',
              'Sec-Ch-Ua-Platform': '"Windows"',
              DNT: '1',
              Connection: 'keep-alive',
              'Upgrade-Insecure-Requests': '1',
            },
            timeout: 15000,
            ...(proxy ? { proxy } : {}),
          },
        );
      }

      this.logger.log(
        `Successfully retrieved MOT history for: ${normalizedRegistration}`,
      );
      return response.data;
    } catch (error) {
      this.handleMotApiError(error, registrationNumber, 'MOT history');
    }
  }

  static async getCompleteVehicleData(
    registrationNumber: string,
  ): Promise<CombinedVehicleData> {
    try {
      const normalizedRegistration =
        this.normalizeRegistrationNumber(registrationNumber);

      this.logger.log(
        `Fetching complete vehicle data for: ${normalizedRegistration}`,
      );

      const [dvlaData, motData] = await Promise.allSettled([
        this.getVehicleDetails(normalizedRegistration),
        this.getMotHistory(normalizedRegistration),
      ]);

      const combinedData: CombinedVehicleData = {
        registrationNumber: normalizedRegistration,
        dvlaData: dvlaData.status === 'fulfilled' ? dvlaData.value : null,
        motData: motData.status === 'fulfilled' ? motData.value : null,
        lastUpdated: new Date(),
      };

      if (dvlaData.status === 'fulfilled') {
        this.logger.log(`DVLA API: Success for ${normalizedRegistration}`);
      } else {
        this.logger.warn(
          `DVLA API: Failed for ${normalizedRegistration} - ${dvlaData.reason}`,
        );
      }

      if (motData.status === 'fulfilled') {
        this.logger.log(`MOT API: Success for ${normalizedRegistration}`);
      } else {
        this.logger.warn(
          `MOT API: Failed for ${normalizedRegistration} - ${motData.reason}`,
        );
      }

      if (!combinedData.dvlaData && !combinedData.motData) {
        throw new NotFoundException('Vehicle not found in any database');
      }

      this.logger.log(
        `Complete vehicle data retrieved for: ${normalizedRegistration}`,
      );
      return combinedData;
    } catch (error) {
      this.logger.error(
        `Failed to get complete vehicle data for ${registrationNumber}:`,
        error,
      );
      throw error;
    }
  }

  private static async ensureValidMotToken(): Promise<void> {
    const now = Date.now();

    if (this.motAccessToken && now < this.tokenExpiryTime - 300000) {
      return;
    }

    try {
      this.logger.log('Refreshing MOT API access token');

      let proxy = await this.resolveOutboundProxy();
      let response: AxiosResponse<MotTokenResponse>;

      try {
        response = await axios.post(
          this.MOT_TOKEN_URL,
          new URLSearchParams({
            client_id: this.MOT_CLIENT_ID,
            client_secret: this.MOT_CLIENT_SECRET,
            scope: this.MOT_SCOPE,
            grant_type: 'client_credentials',
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 10000,
            ...(proxy ? { proxy } : {}),
          },
        );
      } catch (error) {
        let proxyError = false;
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 407) {
            proxyError = true;
          } else if (
            !error.response &&
            error.code &&
            [
              'ECONNREFUSED',
              'ETIMEDOUT',
              'ECONNRESET',
              'EPROXY',
              'ECONNABORTED',
              'ENOTFOUND',
            ].includes(error.code)
          ) {
            proxyError = true;
          }
        } else {
          const code = (error as NodeJS.ErrnoException)?.code;
          if (
            code === 'ECONNREFUSED' ||
            code === 'ETIMEDOUT' ||
            code === 'ECONNRESET' ||
            code === 'EPROXY' ||
            code === 'ECONNABORTED'
          ) {
            proxyError = true;
          }
        }

        if (!proxyError) {
          throw error;
        }

        this.logger.warn(
          'Outbound proxy error; refreshing proxy list and retrying once',
        );
        this.outboundProxyCache = null;
        proxy = await this.resolveOutboundProxy();
        response = await axios.post(
          this.MOT_TOKEN_URL,
          new URLSearchParams({
            client_id: this.MOT_CLIENT_ID,
            client_secret: this.MOT_CLIENT_SECRET,
            scope: this.MOT_SCOPE,
            grant_type: 'client_credentials',
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 10000,
            ...(proxy ? { proxy } : {}),
          },
        );
      }

      this.motAccessToken = response.data.access_token;
      this.tokenExpiryTime = now + response.data.expires_in * 1000;

      this.logger.log('MOT API access token refreshed successfully');
    } catch (error: any) {
      console.log('========== [TOKEN REFRESH ERROR] ==========');
      console.log('Source: ensureValidMotToken()');
      console.log('Status:', error?.response?.status);
      console.log(
        'Response Data:',
        JSON.stringify(error?.response?.data, null, 2),
      );
      console.log('Message:', error?.message);
      console.log('Full Error:', error);
      console.log('===========================================');
      throw new InternalServerErrorException(
        'Unable to authenticate with MOT API',
      );
    }
  }

  private static normalizeRegistrationNumber(
    registrationNumber: string,
  ): string {
    if (!registrationNumber || typeof registrationNumber !== 'string') {
      return '';
    }

    return registrationNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  }

  private static isValidRegistrationNumber(
    registrationNumber: string,
  ): boolean {
    if (!registrationNumber || typeof registrationNumber !== 'string') {
      return false;
    }

    const cleanReg = this.normalizeRegistrationNumber(registrationNumber);
    const genericUkRegPattern = /^[A-Z0-9]+$/;

    return (
      genericUkRegPattern.test(cleanReg) &&
      cleanReg.length >= 1 &&
      cleanReg.length <= 10
    );
  }

  private static handleDvlaApiError(
    error: any,
    registrationNumber: string,
    operation: string,
  ): never {
    console.log('========== [DVLA API ERROR] ==========');
    console.log(
      `Source: handleDvlaApiError() | Reg: ${registrationNumber} | Op: ${operation}`,
    );
    console.log('Status:', error?.response?.status);
    console.log(
      'Response Data:',
      JSON.stringify(error?.response?.data, null, 2),
    );
    console.log('Message:', error?.message);
    console.log('Full Error:', error);
    console.log('======================================');

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;

      switch (status) {
        case 404:
          throw new NotFoundException(
            `Vehicle not found in DVLA database: ${registrationNumber}`,
          );
        case 400:
          throw new BadRequestException(
            `Invalid request to DVLA API: ${message}`,
          );
        case 401:
          throw new InternalServerErrorException(
            'DVLA API authentication failed',
          );
        case 403:
          throw new InternalServerErrorException('DVLA API access forbidden');
        case 429:
          throw new InternalServerErrorException(
            'DVLA API rate limit exceeded',
          );
        case 500:
        case 502:
        case 503:
          throw new InternalServerErrorException(
            'DVLA API service temporarily unavailable',
          );
        default:
          throw new InternalServerErrorException(`DVLA API error: ${message}`);
      }
    }

    throw new InternalServerErrorException(
      `Unexpected error accessing DVLA API: ${error.message}`,
    );
  }

  private static handleMotApiError(
    error: any,
    registrationNumber: string,
    operation: string,
  ): never {
    console.log('========== [MOT API ERROR] ==========');
    console.log(
      `Source: handleMotApiError() | Reg: ${registrationNumber} | Op: ${operation}`,
    );
    console.log('Status:', error?.response?.status);
    console.log(
      'Response Data:',
      JSON.stringify(error?.response?.data, null, 2),
    );
    console.log('Message:', error?.message);
    console.log('Full Error:', error);
    console.log('=====================================');

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;

      switch (status) {
        case 404:
          throw new NotFoundException(
            `Vehicle not found in MOT database: ${registrationNumber}`,
          );
        case 400:
          throw new BadRequestException(
            `Invalid request to MOT API: ${message}`,
          );
        case 401:
          throw new InternalServerErrorException(
            'MOT API authentication failed - token may be invalid',
          );
        case 403:
          throw new InternalServerErrorException(
            'MOT API access forbidden - check API key and permissions',
          );
        case 429:
          throw new InternalServerErrorException('MOT API rate limit exceeded');
        case 500:
        case 502:
        case 503:
          throw new InternalServerErrorException(
            'MOT API service temporarily unavailable',
          );
        default:
          throw new InternalServerErrorException(`MOT API error: ${message}`);
      }
    }

    throw new InternalServerErrorException(
      `Unexpected error accessing MOT API: ${error.message}`,
    );
  }
}

export interface DvlaVehicleResponse {
  registrationNumber: string;
  taxStatus: string;
  taxDueDate: string;
  motStatus: string;
  make: string;
  yearOfManufacture: number;
  engineCapacity: number;
  co2Emissions: number;
  fuelType: string;
  markedForExport: boolean;
  colour: string;
  typeApproval: string;
  dateOfLastV5CIssued: string;
  motExpiryDate: string;
  wheelplan: string;
  monthOfFirstRegistration: string;
}

export interface MotHistoryResponse {
  registration: string;
  make: string;
  model: string;
  firstUsedDate: string;
  fuelType: string;
  primaryColour: string;
  registrationDate: string;
  manufactureDate: string;
  engineSize: string;
  hasOutstandingRecall: string;
  motTests: MotTest[];
}

export interface MotTest {
  registrationAtTimeOfTest: string | null;
  motTestNumber: string;
  completedDate: string;
  expiryDate: string;
  odometerValue: string;
  odometerUnit: string;
  odometerResultType: string;
  motTestResult: string;
  rfrAndComments: RfrComment[];
}

export interface RfrComment {
  type: string;
  text: string;
  dangerous: boolean;
}

export interface MotTokenResponse {
  token_type: string;
  expires_in: number;
  ext_expires_in: number;
  access_token: string;
}

export interface CombinedVehicleData {
  registrationNumber: string;
  dvlaData: DvlaVehicleResponse | null;
  motData: MotHistoryResponse | null;
  lastUpdated: Date;
}
