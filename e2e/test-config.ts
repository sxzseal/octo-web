/**
 * Shared test configuration.
 * Credentials are read from environment variables with safe defaults for local development.
 */

export const BASE_URL = process.env.DMWORK_URL || 'http://localhost:82';
export const API_URL = process.env.DMWORK_API || 'http://localhost:8090';

export const USER_A = {
  username: process.env.TEST_USER_A || 'test_user_a',
  password: process.env.TEST_PASS_A || 'testpass123',
  name: process.env.TEST_NAME_A || '测试用户A',
};

export const USER_B = {
  username: process.env.TEST_USER_B || 'test_user_b',
  password: process.env.TEST_PASS_B || 'testpass123',
  name: process.env.TEST_NAME_B || '测试用户B',
};

export const DEMO_USER = {
  username: process.env.TEST_DEMO_USER || 'demo_user',
  password: process.env.TEST_DEMO_PASS || 'demo123456',
};
