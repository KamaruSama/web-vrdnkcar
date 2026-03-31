// src/lib/config.ts

import { prisma } from './prisma';

// Types of config values stored in the system
export interface SystemConfig {
  successCardTimeout: number; // Time to show Success card in minutes (0 = show always)
  // Add more config options here in the future
}

// Default values when no config exists
export const defaultConfig: SystemConfig = {
  successCardTimeout: 60, // 60 minutes default
};

// Fetch config from database
export async function getConfig(): Promise<SystemConfig> {
  try {
    const configs = await prisma.systemConfig.findMany();

    // Convert results to an object
    const configObject: Record<string, any> = {};
    configs.forEach(config => {
      try {
        configObject[config.name] = JSON.parse(config.value);
      } catch {
        configObject[config.name] = config.value;
      }
    });

    // Check for successCardTimeout
    if (configObject.successCardTimeout === undefined || configObject.successCardTimeout === null) {
      await setConfigValue('successCardTimeout', defaultConfig.successCardTimeout);
      configObject.successCardTimeout = defaultConfig.successCardTimeout;
    }

    return {
      ...defaultConfig,
      ...configObject
    };
  } catch (error) {
    console.error('Error fetching config:', error);
    return defaultConfig;
  }
}

// Save config value to database
export async function setConfigValue(name: keyof SystemConfig, value: any): Promise<boolean> {
  try {
    const jsonValue = JSON.stringify(value);

    await prisma.systemConfig.upsert({
      where: { name: String(name) },
      update: { value: jsonValue, updatedAt: new Date() },
      create: { name: String(name), value: jsonValue },
    });

    return true;
  } catch (error) {
    console.error('Error setting config value:', error);
    return false;
  }
}
