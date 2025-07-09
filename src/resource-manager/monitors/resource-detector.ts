/**
 * Resource Detection Module
 * Cross-platform system resource detection using systeminformation
 */

import * as si from 'systeminformation';
import * as os from 'node:os';
import { nanoid } from 'nanoid';
import {
  SystemCPUResource,
  SystemMemoryResource,
  SystemDiskResource,
  SystemNetworkResource,
  SystemGPUResource,
  SystemResource,
  SystemResourceStatus
} from '../types';

export class ResourceDetector {
  private static instance: ResourceDetector;
  private systemInfo: any = {};

  private constructor() {}

  static getInstance(): ResourceDetector {
    if (!ResourceDetector.instance) {
      ResourceDetector.instance = new ResourceDetector();
    }
    return ResourceDetector.instance;
  }

  /**
   * Initialize system information cache
   */
  async initialize(): Promise<void> {
    try {
      this.systemInfo = {
        system: await si.system(),
        cpu: await si.cpu(),
        osInfo: await si.osInfo()
      };
    } catch (error) {
      console.error('Failed to initialize system info:', error);
    }
  }

  /**
   * Detect CPU resources
   */
  async detectCPU(): Promise<SystemCPUResource> {
    try {
      const [cpuData, currentLoad, cpuTemperature] = await Promise.all([
        si.cpu(),
        si.currentLoad(),
        si.cpuTemperature()
      ]);

      const loadAverage = os.loadavg();

      return {
        id: `cpu-${nanoid(8)}`,
        type: 'cpu',
        name: cpuData.brand || 'Unknown CPU',
        capacity: 100,
        available: 100 - currentLoad.currentLoad,
        allocated: 0,
        unit: 'percent',
        status: this.getResourceStatus(currentLoad.currentLoad),
        cores: cpuData.physicalCores || os.cpus().length,
        threads: cpuData.cores || os.cpus().length,
        usage: currentLoad.currentLoad,
        temperature: cpuTemperature.main || undefined,
        frequency: {
          current: cpuData.speed || 0,
          min: cpuData.speedMin || 0,
          max: cpuData.speedMax || cpuData.speed || 0
        },
        loadAverage: {
          '1m': loadAverage[0],
          '5m': loadAverage[1],
          '15m': loadAverage[2]
        },
        lastUpdated: new Date(),
        metadata: {
          manufacturer: cpuData.manufacturer,
          model: cpuData.model,
          family: cpuData.family,
          stepping: cpuData.stepping,
          cache: cpuData.cache
        }
      };
    } catch (error) {
      console.error('Error detecting CPU resources:', error);
      throw error;
    }
  }

  /**
   * Detect memory resources
   */
  async detectMemory(): Promise<SystemMemoryResource> {
    try {
      const memData = await si.mem();

      const totalMemory = memData.total;
      const freeMemory = memData.free;
      const usedMemory = memData.used;
      const usagePercent = (usedMemory / totalMemory) * 100;

      return {
        id: `memory-${nanoid(8)}`,
        type: 'memory',
        name: 'System Memory',
        capacity: totalMemory,
        available: freeMemory,
        allocated: 0,
        unit: 'bytes',
        status: this.getResourceStatus(usagePercent),
        total: totalMemory,
        free: freeMemory,
        used: usedMemory,
        cached: memData.cached || 0,
        buffers: memData.buffers || 0,
        swapTotal: memData.swaptotal || 0,
        swapUsed: memData.swapused || 0,
        swapFree: memData.swapfree || 0,
        lastUpdated: new Date(),
        metadata: {
          active: memData.active,
          available: memData.available,
          usagePercent
        }
      };
    } catch (error) {
      console.error('Error detecting memory resources:', error);
      throw error;
    }
  }

  /**
   * Detect disk resources
   */
  async detectDisks(): Promise<SystemDiskResource[]> {
    try {
      const [diskLayout, fsSize, fsStats] = await Promise.all([
        si.diskLayout(),
        si.fsSize(),
        si.fsStats()
      ]);

      const diskResources: SystemDiskResource[] = [];

      for (const fs of fsSize) {
        // Skip virtual filesystems
        if (fs.fs === 'overlay' || fs.mount === '/snap' || fs.mount.startsWith('/snap/')) {
          continue;
        }

        const usagePercent = fs.use;
        const diskStat = fsStats.find(stat => stat.fs === fs.fs);

        const diskResource: SystemDiskResource = {
          id: `disk-${nanoid(8)}`,
          type: 'disk',
          name: `${fs.fs} (${fs.mount})`,
          capacity: fs.size,
          available: fs.available,
          allocated: 0,
          unit: 'bytes',
          status: this.getResourceStatus(usagePercent),
          path: fs.fs,
          filesystem: fs.type,
          total: fs.size,
          free: fs.available,
          used: fs.used,
          mount: fs.mount,
          readSpeed: diskStat?.rx_sec || 0,
          writeSpeed: diskStat?.wx_sec || 0,
          iops: diskStat
            ? {
                read: diskStat.rx || 0,
                write: diskStat.wx || 0
              }
            : undefined,
          lastUpdated: new Date(),
          metadata: {
            usagePercent,
            rw: fs.rw
          }
        };

        diskResources.push(diskResource);
      }

      return diskResources;
    } catch (error) {
      console.error('Error detecting disk resources:', error);
      throw error;
    }
  }

  /**
   * Detect network resources
   */
  async detectNetworks(): Promise<SystemNetworkResource[]> {
    try {
      const [networkInterfaces, networkStats] = await Promise.all([
        si.networkInterfaces(),
        si.networkStats()
      ]);

      const networkResources: SystemNetworkResource[] = [];

      for (const iface of networkInterfaces) {
        // Skip loopback and virtual interfaces
        if (iface.internal || iface.virtual || !iface.ip4) {
          continue;
        }

        const stats = networkStats.find(stat => stat.iface === iface.iface);

        const networkResource: SystemNetworkResource = {
          id: `network-${nanoid(8)}`,
          type: 'network',
          name: iface.iface,
          capacity: iface.speed || 1000, // Default to 1Gbps if unknown
          available: iface.speed || 1000,
          allocated: 0,
          unit: 'mbps',
          status: iface.operstate === 'up' ? 'available' : 'error',
          interface: iface.iface,
          ip4: iface.ip4,
          ip6: iface.ip6,
          mac: iface.mac,
          speed: iface.speed,
          duplex: iface.duplex,
          mtu: iface.mtu,
          rx: {
            bytes: stats?.rx_bytes || 0,
            packets: stats?.rx_packets || 0,
            errors: stats?.rx_errors || 0,
            dropped: stats?.rx_dropped || 0
          },
          tx: {
            bytes: stats?.tx_bytes || 0,
            packets: stats?.tx_packets || 0,
            errors: stats?.tx_errors || 0,
            dropped: stats?.tx_dropped || 0
          },
          lastUpdated: new Date(),
          metadata: {
            type: iface.type,
            dhcp: iface.dhcp,
            dnsSuffix: iface.dnsSuffix,
            ieee8021xAuth: iface.ieee8021xAuth,
            ieee8021xState: iface.ieee8021xState
          }
        };

        networkResources.push(networkResource);
      }

      return networkResources;
    } catch (error) {
      console.error('Error detecting network resources:', error);
      throw error;
    }
  }

  /**
   * Detect GPU resources (if available)
   */
  async detectGPUs(): Promise<SystemGPUResource[]> {
    try {
      const graphics = await si.graphics();
      const gpuResources: SystemGPUResource[] = [];

      for (const controller of graphics.controllers) {
        if (!controller.vendor || controller.vendor === '') {
          continue;
        }

        const gpuResource: SystemGPUResource = {
          id: `gpu-${nanoid(8)}`,
          type: 'gpu',
          name: controller.model || 'Unknown GPU',
          capacity: controller.vram || 0,
          available: controller.vram || 0,
          allocated: 0,
          unit: 'MB',
          status: 'available',
          vendor: controller.vendor,
          model: controller.model || 'Unknown',
          vram: {
            total: controller.vram || 0,
            used: 0,
            free: controller.vram || 0
          },
          temperature: controller.temperatureGpu,
          fanSpeed: controller.fanSpeed,
          powerDraw: undefined, // Not available via systeminformation
          utilization: {
            gpu: controller.utilizationGpu || 0,
            memory: controller.utilizationMemory || 0
          },
          lastUpdated: new Date(),
          metadata: {
            bus: controller.bus,
            vramDynamic: controller.vramDynamic,
            subDeviceId: controller.subDeviceId,
            driverVersion: controller.driverVersion,
            driver: controller.driver
          }
        };

        gpuResources.push(gpuResource);
      }

      return gpuResources;
    } catch (error) {
      console.error('Error detecting GPU resources:', error);
      return []; // GPUs are optional
    }
  }

  /**
   * Detect all system resources
   */
  async detectAll(): Promise<SystemResource[]> {
    const resources: SystemResource[] = [];

    try {
      // Run detections in parallel
      const [cpu, memory, disks, networks, gpus] = await Promise.all([
        this.detectCPU(),
        this.detectMemory(),
        this.detectDisks(),
        this.detectNetworks(),
        this.detectGPUs()
      ]);

      resources.push(cpu);
      resources.push(memory);
      resources.push(...disks);
      resources.push(...networks);
      resources.push(...gpus);
    } catch (error) {
      console.error('Error detecting all resources:', error);
      throw error;
    }

    return resources;
  }

  /**
   * Get resource status based on usage percentage
   */
  private getResourceStatus(usagePercent: number): SystemResourceStatus {
    if (usagePercent >= 95) return 'exhausted';
    if (usagePercent >= 85) return 'reserved';
    if (usagePercent >= 70) return 'allocated';
    return 'available';
  }

  /**
   * Get system information summary
   */
  async getSystemInfo(): Promise<any> {
    try {
      const [system, bios, baseboard, chassis, osInfo, versions] = await Promise.all([
        si.system(),
        si.bios(),
        si.baseboard(),
        si.chassis(),
        si.osInfo(),
        si.versions()
      ]);

      return {
        system,
        bios,
        baseboard,
        chassis,
        osInfo,
        versions,
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptime: os.uptime()
      };
    } catch (error) {
      console.error('Error getting system info:', error);
      return null;
    }
  }
}

// Export singleton instance
export const resourceDetector = ResourceDetector.getInstance();
