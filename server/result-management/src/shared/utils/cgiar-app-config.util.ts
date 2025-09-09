import { Injectable } from '@nestjs/common';
import { isEmpty } from './object.utils';

export enum EnviromentEnum {
  PRODUCTION = 'production',
  DEVELOPMENT = 'development',
  TESTING = 'testing',
}

/**
 * Class to get all application configurations from environment variables or .env file
 * @export AppConfig
 * @class AppConfig
 */
@Injectable()
export class CgiarAppConfig {
  private validEnv(data: string, required: boolean = false): string {
    const envData = process.env?.[data];
    return isEmpty(envData) && required
      ? (() => {
          throw new Error(`Environment variable ${data} is not set or empty`);
        })()
      : envData || '';
  }

  /**
   * Get the application port from environment variables or .env file
   * @returns {string} The application environment
   */
  get environment(): EnviromentEnum {
    const data =
      EnviromentEnum?.[this.validEnv('CL_ENVIRONMENT', true).toUpperCase()];

    if (!data) {
      throw Error('');
    }

    return data;
  }

  /**
   * Get the application port from environment variables or .env file
   * @returns {string} The application name
   */
  get appName(): string {
    return this.validEnv('CL_APP_NAME', true);
  }

  /**
   * Get the application port from environment variables or .env file
   * @returns {number} The application port
   */
  get port(): number {
    return parseInt(this.validEnv('CL_PORT', true), 10);
  }

  /**
   * Get the OpenSearch URL from environment variables or .env file
   * @returns {string} The OpenSearch URL
   */
  get openSearchUrl(): string {
    return this.validEnv('CL_OPENSEARCH_URL', true);
  }

  /**
   * Get the OpenSearch user from environment variables or .env file
   * @returns {string} The OpenSearch user
   */
  get openSearchUser(): string {
    return this.validEnv('CL_OPENSEARCH_USER', true);
  }

  /**
   * Get the OpenSearch password from environment variables or .env file
   * @returns {string} The OpenSearch password
   */
  get openSearchPass(): string {
    return this.validEnv('CL_OPENSEARCH_PASS', true);
  }

  /**
   * Get the OpenSearch base index from environment variables or .env file
   * @returns {string} The OpenSearch base index
   */
  get openSearchBaseIndex(): string {
    const fullBaseIndex = `${this.environment}_${this.validEnv('CL_OPENSEARCH_BASE_INDEX', true)}`;
    return fullBaseIndex;
  }
}
