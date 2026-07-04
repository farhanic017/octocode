import { Log } from "@octocode-ai/core/util/log"

const log = Log.create({ service: "sys-monitor" })

// Minimum RAM to keep free (1GB)
const MIN_FREE_RAM_MB = 1000

// Minimum VRAM to keep free (1GB)
const MIN_FREE_VRAM_MB = 1000

// Maximum parallel agents based on RAM
const MB_PER_AGENT = 500

// Cache for system resources (avoid repeated detection)
let cachedResources: { resources: SystemResources; timestamp: number } | null = null
const CACHE_TTL_MS = 30_000 // 30 seconds

export interface SystemResources {
  totalRamMB: number
  freeRamMB: number
  usedRamMB: number
  totalVramMB: number
  freeVramMB: number
  usedVramMB: number
  gpuVendor: "nvidia" | "amd" | "intel" | "apple" | "none"
  maxParallelAgents: number
}

/**
 * Execute a command asynchronously with timeout
 */
async function execAsync(command: string, timeoutMs: number = 5000): Promise<string> {
  const { exec } = await import("child_process")
  return new Promise((resolve, reject) => {
    const proc = exec(command, { encoding: "utf-8", timeout: timeoutMs, windowsHide: true }, (error, stdout) => {
      if (error) {
        reject(error)
      } else {
        resolve(stdout)
      }
    })
    // Ensure we don't leak processes
    proc.unref()
  })
}

/**
 * Get available system RAM (async, non-blocking)
 */
export async function getAvailableRam(): Promise<{ total: number; free: number }> {
  try {
    if (process.platform === "win32") {
      const output = await execAsync(
        'powershell -NoProfile -Command "Get-CimInstance -ClassName Win32_OperatingSystem | Select-Object TotalVisibleMemorySize,FreePhysicalMemory | ConvertTo-Json"',
        5000,
      )
      const json = JSON.parse(output)
      return {
        total: parseInt(json.TotalVisibleMemorySize) / 1024,
        free: parseInt(json.FreePhysicalMemory) / 1024,
      }
    } else if (process.platform === "darwin") {
      const totalOutput = await execAsync("sysctl -n hw.memsize", 5000)
      const pageSize = parseInt(await execAsync("sysctl -n hw.pagesize", 5000))
      const freeOutput = await execAsync("vm_stat | grep 'Pages free'", 5000)
      const freePages = parseInt(freeOutput.match(/Pages free\s+(\d+)/)?.[1] ?? "0")
      return {
        total: parseInt(totalOutput) / 1024 / 1024,
        free: (freePages * pageSize) / 1024 / 1024,
      }
    } else {
      // Linux: use /proc/meminfo
      const { readFileSync } = await import("fs")
      const meminfo = readFileSync("/proc/meminfo", "utf-8")
      const totalMatch = meminfo.match(/MemTotal:\s+(\d+)/)
      const freeMatch = meminfo.match(/MemAvailable:\s+(\d+)/)
      return {
        total: totalMatch ? parseInt(totalMatch[1]) / 1024 : 8192,
        free: freeMatch ? parseInt(freeMatch[1]) / 1024 : 4096,
      }
    }
  } catch {
    // Silent fallback - no logging to avoid chatbox spam
    return { total: 8192, free: 4096 }
  }
}

/**
 * Get available GPU VRAM (async, non-blocking)
 */
export async function getAvailableVram(): Promise<{ total: number; free: number; vendor: "nvidia" | "amd" | "intel" | "apple" | "none" }> {
  try {
    // Try NVIDIA first (non-Windows only, nvidia-smi not typically on Windows PATH for this use)
    if (process.platform !== "win32") {
      try {
        const output = await execAsync(
          "nvidia-smi --query-gpu=memory.total,memory.free --format=csv,noheader,nounits",
          3000,
        )
        const [total, free] = output.trim().split(",").map(Number)
        if (!isNaN(total) && !isNaN(free)) {
          return { total, free, vendor: "nvidia" }
        }
      } catch {
        // nvidia-smi not available or failed - silent fallback
      }
    }

    // Try AMD (Linux only)
    if (process.platform === "linux") {
      try {
        const output = await execAsync("rocm-smi --showmeminfo vram --json 2>/dev/null", 3000)
        const json = JSON.parse(output)
        return {
          total: json.vram?.[0]?.total ?? 0,
          free: json.vram?.[0]?.used ?? 0,
          vendor: "amd",
        }
      } catch {
        // rocm-smi not available - silent fallback
      }
    }

    // macOS Apple Silicon
    if (process.platform === "darwin") {
      try {
        const output = await execAsync("system_profiler SPDisplaysDataType | grep VRAM", 3000)
        const match = output.match(/(\d+)\s*GB/)
        if (match) {
          const total = parseInt(match[1]) * 1024
          return { total, free: total, vendor: "apple" }
        }
      } catch {
        // system_profiler not available - silent fallback
      }
    }

    return { total: 0, free: 0, vendor: "none" }
  } catch {
    // Silent fallback - no logging to avoid chatbox spam
    return { total: 0, free: 0, vendor: "none" }
  }
}

/**
 * Check if system has enough resources for a task
 */
export async function checkResources(requiredMemoryMB?: number): Promise<{
  canProceed: boolean
  resources: SystemResources
  warnings: string[]
}> {
  // Use cached resources if fresh enough
  if (cachedResources && Date.now() - cachedResources.timestamp < CACHE_TTL_MS) {
    return {
      canProceed: cachedResources.resources.freeRamMB >= MIN_FREE_RAM_MB,
      resources: cachedResources.resources,
      warnings: [],
    }
  }

  const ram = await getAvailableRam()
  const vram = await getAvailableVram()
  const warnings: string[] = []

  const freeRamMB = ram.free
  const freeVramMB = vram.free

  const maxParallelAgents = Math.max(1, Math.floor(freeRamMB / MB_PER_AGENT))

  const resources: SystemResources = {
    totalRamMB: ram.total,
    freeRamMB: ram.free,
    usedRamMB: ram.total - ram.free,
    totalVramMB: vram.total,
    freeVramMB: vram.free,
    usedVramMB: vram.total - vram.free,
    gpuVendor: vram.vendor,
    maxParallelAgents,
  }

  // Check RAM
  if (freeRamMB < MIN_FREE_RAM_MB) {
    warnings.push(`Low RAM: ${freeRamMB.toFixed(0)}MB free (minimum: ${MIN_FREE_RAM_MB}MB)`)
  }

  // Check VRAM if GPU is available
  if (vram.total > 0 && freeVramMB < MIN_FREE_VRAM_MB) {
    warnings.push(`Low VRAM: ${freeVramMB.toFixed(0)}MB free (minimum: ${MIN_FREE_VRAM_MB}MB)`)
  }

  // Check if required memory is available
  if (requiredMemoryMB && freeRamMB < requiredMemoryMB) {
    warnings.push(`Insufficient RAM: need ${requiredMemoryMB}MB, only ${freeRamMB.toFixed(0)}MB available`)
  }

  const canProceed = freeRamMB >= MIN_FREE_RAM_MB &&
    (vram.total === 0 || freeVramMB >= MIN_FREE_VRAM_MB) &&
    (!requiredMemoryMB || freeRamMB >= requiredMemoryMB)

  // Cache the result
  cachedResources = { resources, timestamp: Date.now() }

  return { canProceed, resources, warnings }
}

/**
 * Get current system status for logging (async, non-blocking)
 */
export async function getSystemStatus(): Promise<string> {
  const ram = await getAvailableRam()
  const vram = await getAvailableVram()

  const lines = [
    `RAM: ${ram.free.toFixed(0)}MB free / ${ram.total.toFixed(0)}MB total`,
  ]

  if (vram.total > 0) {
    lines.push(`VRAM: ${vram.free.toFixed(0)}MB free / ${vram.total.toFixed(0)}MB total (${vram.vendor})`)
  }

  return lines.join(", ")
}
