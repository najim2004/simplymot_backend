import axios, {
  AxiosProxyConfig,
  AxiosResponse,
} from 'axios';
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
 * This service handles:
 * - Vehicle enquiry API (basic vehicle information)
 * - MOT History API (detailed MOT test history and vehicle details)
 * - Automatic OAuth token management for MOT API
 * - Optional outbound HTTP(S) proxy (DVLA_PROXY_URL) for vehicle + MOT calls
 * - Comprehensive error handling and logging
 */
export class DvlaService {
  private static readonly logger = new Logger(DvlaService.name);

  // API Configuration
  private static readonly DVLA_API_KEY = appConfig().dvla.api_key;
  private static readonly DVLA_VEHICLE_URL =
    'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles';
  private static readonly MOT_API_BASE_URL =
    'https://history.mot.api.gov.uk/v1/trade/vehicles/registration';

  // MOT API OAuth Configuration
  private static readonly MOT_CLIENT_ID = appConfig().mot.client_id;
  private static readonly MOT_CLIENT_SECRET = appConfig().mot.client_secret;
  private static readonly MOT_TOKEN_URL =
    'https://login.microsoftonline.com/a455b827-244f-4c97-b5b4-ce5d13b4d00c/oauth2/v2.0/token';
  private static readonly MOT_SCOPE = 'https://tapi.dvsa.gov.uk/.default';

  // Token management
  private static motAccessToken: string | null = null;
  private static tokenExpiryTime: number = 0;

  /** `null` = not resolved yet; `false` = no proxy; object = axios proxy config */
  private static outboundProxyCache: AxiosProxyConfig | false | null = null;

  private static getOutboundProxyConfig(): AxiosProxyConfig | undefined {
    if (this.outboundProxyCache === false) {
      return undefined;
    }
    if (this.outboundProxyCache !== null) {
      return this.outboundProxyCache;
    }
    const url = appConfig().dvla.proxy_url?.trim();
    if (!url) {
      this.outboundProxyCache = false;
      return undefined;
    }
    const parsed = this.parseProxyUrl(url);
    if (!parsed) {
      this.logger.warn(
        'DVLA_PROXY_URL is set but could not be parsed; outbound calls run without proxy',
      );
      this.outboundProxyCache = false;
      return undefined;
    }
    this.outboundProxyCache = parsed;
    this.logger.log(
      'DVLA_PROXY_URL is set; DVLA vehicle and MOT API requests use this proxy',
    );
    return parsed;
  }

  private static parseProxyUrl(raw: string): AxiosProxyConfig | null {
    try {
      // e.g. http://user:pass@31.59.20.176:6754/ — trim + drop trailing slashes
      const normalized = raw.trim().replace(/\/+$/, '');
      const u = new URL(normalized);
      const protocol = (u.protocol.replace(':', '') || 'http') as
        | 'http'
        | 'https';
      const port = u.port
        ? parseInt(u.port, 10)
        : protocol === 'https'
          ? 443
          : 80;
      const auth =
        u.username !== ''
          ? {
              username: decodeURIComponent(u.username),
              password: decodeURIComponent(u.password),
            }
          : undefined;
      return {
        protocol,
        host: u.hostname,
        port,
        auth,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get vehicle details from DVLA Vehicle Enquiry API
   *
   * @param registrationNumber - UK vehicle registration number (e.g., 'OV12UYY')
   * @returns Promise<DvlaVehicleResponse> - Vehicle information from DVLA
   * @throws NotFoundException - When vehicle is not found
   * @throws InternalServerErrorException - When DVLA API is unavailable
   */
  static async getVehicleDetails(
    registrationNumber: string,
  ): Promise<DvlaVehicleResponse> {
    try {
      // this.logger.log(
      //   `Fetching vehicle details for registration: ${registrationNumber}`,
      // );

      // Validate registration number format
      if (!this.isValidRegistrationNumber(registrationNumber)) {
        throw new BadRequestException('Invalid registration number format');
      }

      const proxy = this.getOutboundProxyConfig();
      const response: AxiosResponse<DvlaVehicleResponse> = await axios.post(
        this.DVLA_VEHICLE_URL,
        { registrationNumber: registrationNumber.toUpperCase() },
        {
          headers: {
            'x-api-key': this.DVLA_API_KEY,
            'Content-Type': 'application/json',
          },
          timeout: 10000, // 10 second timeout
          ...(proxy ? { proxy } : {}),
        },
      );

      this.logger.log(
        `Successfully retrieved vehicle details for: ${registrationNumber}`,
      );
      return response.data;
    } catch (error) {
      this.handleDvlaApiError(error, registrationNumber, 'vehicle details');
    }
  }

  /**
   * Get MOT history and detailed vehicle information from MOT History API
   *
   * @param registrationNumber - UK vehicle registration number
   * @returns Promise<MotHistoryResponse> - MOT history and vehicle details
   * @throws NotFoundException - When vehicle is not found
   * @throws InternalServerErrorException - When MOT API is unavailable
   */
  static async getMotHistory(
    registrationNumber: string,
  ): Promise<MotHistoryResponse> {
    try {
      this.logger.log(
        `Fetching MOT history for registration: ${registrationNumber}`,
      );

      // Validate registration number format
      if (!this.isValidRegistrationNumber(registrationNumber)) {
        throw new BadRequestException('Invalid registration number format');
      }

      // Ensure we have a valid access token
      await this.ensureValidMotToken();

      const config = appConfig();
      const motUserAgent =
        process.env.MOT_API_USER_AGENT?.trim() ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';

      const proxy = this.getOutboundProxyConfig();
      const response: AxiosResponse<MotHistoryResponse> = await axios.get(
        `${this.MOT_API_BASE_URL}/${registrationNumber.toUpperCase()}`,
        {
          headers: {
            // MOTH API V3 QuickStart: Authorization + X-API-Key (required).
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
      // console.log(response.data);

      this.logger.log(
        `Successfully retrieved MOT history for: ${registrationNumber}`,
      );
      return response.data;
    } catch (error) {
      this.handleMotApiError(error, registrationNumber, 'MOT history');
    }
  }

  /**
   * Get comprehensive vehicle information from both DVLA and MOT APIs
   *
   * @param registrationNumber - UK vehicle registration number
   * @returns Promise<CombinedVehicleData> - Complete vehicle information
   */
  static async getCompleteVehicleData(
    registrationNumber: string,
  ): Promise<CombinedVehicleData> {
    try {
      this.logger.log(
        `Fetching complete vehicle data for: ${registrationNumber}`,
      );

      // Fetch data from both APIs concurrently for better performance
      const [dvlaData, motData] = await Promise.allSettled([
        this.getVehicleDetails(registrationNumber),
        this.getMotHistory(registrationNumber),
      ]);

      // Combine data from both sources
      const combinedData: CombinedVehicleData = {
        registrationNumber: registrationNumber.toUpperCase(),
        dvlaData: dvlaData.status === 'fulfilled' ? dvlaData.value : null,
        motData: motData.status === 'fulfilled' ? motData.value : null,
        lastUpdated: new Date(),
      };

      // Log success/failure for each API
      if (dvlaData.status === 'fulfilled') {
        this.logger.log(`DVLA API: Success for ${registrationNumber}`);
      } else {
        this.logger.warn(
          `DVLA API: Failed for ${registrationNumber} - ${dvlaData.reason}`,
        );
      }

      if (motData.status === 'fulfilled') {
        this.logger.log(`MOT API: Success for ${registrationNumber}`);
      } else {
        this.logger.warn(
          `MOT API: Failed for ${registrationNumber} - ${motData.reason}`,
        );
      }

      // Ensure we have at least some data
      if (!combinedData.dvlaData && !combinedData.motData) {
        throw new NotFoundException('Vehicle not found in any database');
      }

      this.logger.log(
        `Complete vehicle data retrieved for: ${registrationNumber}`,
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

  /**
   * Ensure we have a valid MOT API access token
   * Automatically refreshes token if expired or missing
   */
  private static async ensureValidMotToken(): Promise<void> {
    const now = Date.now();

    // Check if token is still valid (with 5 minute buffer)
    if (this.motAccessToken && now < this.tokenExpiryTime - 300000) {
      return;
    }

    try {
      this.logger.log('Refreshing MOT API access token');

      const proxy = this.getOutboundProxyConfig();
      const response: AxiosResponse<MotTokenResponse> = await axios.post(
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

      this.motAccessToken = response.data.access_token;
      this.tokenExpiryTime = now + response.data.expires_in * 1000;

      this.logger.log('MOT API access token refreshed successfully');
    } catch (error: any) {
      console.log('========== [TOKEN REFRESH ERROR] ==========');
      console.log('Source: ensureValidMotToken()');
      console.log('Status:', error?.response?.status);
      console.log('Response Data:', JSON.stringify(error?.response?.data, null, 2));
      console.log('Message:', error?.message);
      console.log('Full Error:', error);
      console.log('===========================================');
      throw new InternalServerErrorException(
        'Unable to authenticate with MOT API',
      );
    }
  }

  /**
   * Validate UK vehicle registration number format
   *
   * @param registrationNumber - Registration number to validate
   * @returns boolean - True if format is valid
   */
  private static isValidRegistrationNumber(
    registrationNumber: string,
  ): boolean {
    if (!registrationNumber || typeof registrationNumber !== 'string') {
      return false;
    }

    // Remove spaces and convert to uppercase
    const cleanReg = registrationNumber.replace(/\s/g, '').toUpperCase();

    // Basic UK registration format validation
    // Supports formats like: AB12CDE, A123BCD, AB123CD, etc.
    const ukRegPattern = /^[A-Z]{1,3}[0-9]{1,4}[A-Z]{1,3}$/;

    return (
      ukRegPattern.test(cleanReg) &&
      cleanReg.length >= 5 &&
      cleanReg.length <= 8
    );
  }

  /**
   * Handle errors from DVLA Vehicle Enquiry API
   */
  private static handleDvlaApiError(
    error: any,
    registrationNumber: string,
    operation: string,
  ): never {
    console.log('========== [DVLA API ERROR] ==========');
    console.log(`Source: handleDvlaApiError() | Reg: ${registrationNumber} | Op: ${operation}`);
    console.log('Status:', error?.response?.status);
    console.log('Response Data:', JSON.stringify(error?.response?.data, null, 2));
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

  /**
   * Handle errors from MOT History API
   */
  private static handleMotApiError(
    error: any,
    registrationNumber: string,
    operation: string,
  ): never {
    console.log('========== [MOT API ERROR] ==========');
    console.log(`Source: handleMotApiError() | Reg: ${registrationNumber} | Op: ${operation}`);
    console.log('Status:', error?.response?.status);
    console.log('Response Data:', JSON.stringify(error?.response?.data, null, 2));
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

// TypeScript interfaces for API responses
// MOT shapes can evolve with API version; validate against live responses if parsing fails.

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
