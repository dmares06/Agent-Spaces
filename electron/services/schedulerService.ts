import { Cron } from 'croner';
import { spawn, ChildProcess } from 'child_process';
import { BrowserWindow } from 'electron';
import * as db from '../database/db.js';
import * as agentRunnerService from './agentRunnerService.js';

// Store active cron jobs
const activeJobs = new Map<string, Cron>();
// Store running processes for cancellation
const runningProcesses = new Map<string, ChildProcess>();

/**
 * Initialize the scheduler service - loads all enabled tasks and starts cron jobs
 */
export function initializeScheduler(): void {
  console.log('[Scheduler] Initializing scheduler service...');

  try {
    const enabledTasks = db.getEnabledScheduledTasks();
    console.log(`[Scheduler] Found ${enabledTasks.length} enabled scheduled tasks`);

    for (const task of enabledTasks) {
      startCronJob(task);
    }

    console.log('[Scheduler] Scheduler service initialized');
  } catch (error) {
    console.error('[Scheduler] Failed to initialize scheduler:', error);
  }
}

/**
 * Start a cron job for a scheduled task
 */
function startCronJob(task: db.ScheduledTask): void {
  try {
    // Stop existing job if any
    stopCronJob(task.id);

    const job = new Cron(task.cron_expression, {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }, () => {
      executeTask(task.id);
    });

    activeJobs.set(task.id, job);

    // Update next run time
    const nextRun = job.nextRun();
    if (nextRun) {
      db.updateScheduledTask(task.id, { next_run_at: nextRun.toISOString() });
    }

    console.log(`[Scheduler] Started cron job for task "${task.name}" (${task.cron_expression})`);
  } catch (error) {
    console.error(`[Scheduler] Failed to start cron job for task "${task.name}":`, error);
  }
}

/**
 * Stop a cron job for a scheduled task
 */
function stopCronJob(taskId: string): void {
  const job = activeJobs.get(taskId);
  if (job) {
    job.stop();
    activeJobs.delete(taskId);
    console.log(`[Scheduler] Stopped cron job for task ${taskId}`);
  }
}

/**
 * Execute a scheduled task
 */
export async function executeTask(taskId: string): Promise<db.ScheduledTaskRun> {
  const task = db.getScheduledTask(taskId);
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  console.log(`[Scheduler] Executing task "${task.name}"...`);

  // Create run record
  const run = db.createScheduledTaskRun({
    scheduled_task_id: taskId,
    started_at: new Date().toISOString(),
    status: 'running',
  });

  // Update last run time on task
  db.updateScheduledTask(taskId, { last_run_at: new Date().toISOString() });

  // Update next run time
  const job = activeJobs.get(taskId);
  if (job) {
    const nextRun = job.nextRun();
    if (nextRun) {
      db.updateScheduledTask(taskId, { next_run_at: nextRun.toISOString() });
    }
  }

  // Notify renderer
  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (mainWindow) {
    mainWindow.webContents.send('schedule-output', {
      taskId,
      runId: run.id,
      type: 'start',
      data: `Starting task: ${task.name}\n`,
    });
  }

  // Branch: Agent-type tasks run via agentRunnerService
  if (task.type === 'agent' && task.agent_id) {
    try {
      const result = await agentRunnerService.runAgent(
        task.agent_id,
        task.workspace_id || '',
        `Scheduled execution of "${task.name}"`
      );

      const completedAt = new Date().toISOString();
      const summary = `Agent: ${result.agentName}\nKnowledge entries: ${result.knowledgeEntries.length}\nLearnings: ${result.learnings.length}${result.error ? `\nError: ${result.error}` : ''}`;

      const updatedRun = db.updateScheduledTaskRun(run.id, {
        status: result.error ? 'failed' : 'success',
        exit_code: result.error ? 1 : 0,
        output: `${summary}\n\n---\n\n${result.output.slice(-100000)}`,
        error: result.error || undefined,
        completed_at: completedAt,
      });

      console.log(`[Scheduler] Agent task "${task.name}" completed. Entries: ${result.knowledgeEntries.length}, Learnings: ${result.learnings.length}`);

      if (mainWindow) {
        mainWindow.webContents.send('schedule-output', {
          taskId,
          runId: run.id,
          type: 'stdout',
          data: summary,
        });
        mainWindow.webContents.send('schedule-complete', {
          taskId,
          runId: run.id,
          status: result.error ? 'failed' : 'success',
          exitCode: result.error ? 1 : 0,
        });
      }

      return updatedRun;
    } catch (err: any) {
      const completedAt = new Date().toISOString();
      const updatedRun = db.updateScheduledTaskRun(run.id, {
        status: 'failed',
        error: err.message,
        completed_at: completedAt,
      });

      console.error(`[Scheduler] Agent task "${task.name}" failed:`, err);

      if (mainWindow) {
        mainWindow.webContents.send('schedule-complete', {
          taskId,
          runId: run.id,
          status: 'failed',
          error: err.message,
        });
      }

      return updatedRun;
    }
  }

  // Default: Shell command execution (unchanged)
  return new Promise((resolve) => {
    const workingDir = task.working_directory || process.env.HOME || '/';

    // Run command in shell
    const proc = spawn(task.command, [], {
      shell: true,
      cwd: workingDir,
      env: { ...process.env },
    });

    runningProcesses.set(run.id, proc);

    let output = '';
    let error = '';

    proc.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      output += text;

      if (mainWindow) {
        mainWindow.webContents.send('schedule-output', {
          taskId,
          runId: run.id,
          type: 'stdout',
          data: text,
        });
      }
    });

    proc.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      error += text;

      if (mainWindow) {
        mainWindow.webContents.send('schedule-output', {
          taskId,
          runId: run.id,
          type: 'stderr',
          data: text,
        });
      }
    });

    proc.on('close', (code: number | null) => {
      runningProcesses.delete(run.id);

      const status = code === 0 ? 'success' : 'failed';
      const completedAt = new Date().toISOString();

      const updatedRun = db.updateScheduledTaskRun(run.id, {
        status,
        exit_code: code ?? -1,
        output: output.slice(-100000), // Limit stored output
        error: error.slice(-10000),
        completed_at: completedAt,
      });

      console.log(`[Scheduler] Task "${task.name}" completed with status: ${status}`);

      if (mainWindow) {
        mainWindow.webContents.send('schedule-complete', {
          taskId,
          runId: run.id,
          status,
          exitCode: code,
        });
      }

      resolve(updatedRun);
    });

    proc.on('error', (err: Error) => {
      runningProcesses.delete(run.id);

      const completedAt = new Date().toISOString();

      const updatedRun = db.updateScheduledTaskRun(run.id, {
        status: 'failed',
        error: err.message,
        completed_at: completedAt,
      });

      console.error(`[Scheduler] Task "${task.name}" failed:`, err);

      if (mainWindow) {
        mainWindow.webContents.send('schedule-complete', {
          taskId,
          runId: run.id,
          status: 'failed',
          error: err.message,
        });
      }

      resolve(updatedRun);
    });
  });
}

/**
 * Create a new scheduled task and optionally start its cron job
 */
export function createScheduledTask(data: Omit<db.ScheduledTask, 'id' | 'created_at' | 'updated_at'>): db.ScheduledTask {
  const task = db.createScheduledTask(data);

  if (task.enabled) {
    startCronJob(task);
  }

  return task;
}

/**
 * Update a scheduled task and restart its cron job if needed
 */
export function updateScheduledTask(id: string, data: Partial<Omit<db.ScheduledTask, 'id' | 'created_at'>>): db.ScheduledTask {
  const task = db.updateScheduledTask(id, data);

  // Restart cron job if enabled, stop if disabled
  if (task.enabled) {
    startCronJob(task);
  } else {
    stopCronJob(task.id);
  }

  return task;
}

/**
 * Delete a scheduled task and stop its cron job
 */
export function deleteScheduledTask(id: string): void {
  stopCronJob(id);
  db.deleteScheduledTask(id);
}

/**
 * Toggle a scheduled task's enabled state
 */
export function toggleScheduledTask(id: string): db.ScheduledTask {
  const task = db.toggleScheduledTask(id);

  if (task.enabled) {
    startCronJob(task);
  } else {
    stopCronJob(task.id);
  }

  return task;
}

/**
 * Run a task immediately (outside of schedule)
 */
export async function runTaskNow(taskId: string): Promise<db.ScheduledTaskRun> {
  return executeTask(taskId);
}

/**
 * Cancel a running task
 */
export function cancelRun(runId: string): boolean {
  const proc = runningProcesses.get(runId);
  if (proc) {
    proc.kill('SIGTERM');

    db.updateScheduledTaskRun(runId, {
      status: 'cancelled',
      completed_at: new Date().toISOString(),
    });

    runningProcesses.delete(runId);
    return true;
  }
  return false;
}

/**
 * Get execution history for a task
 */
export function getTaskHistory(taskId: string, limit: number = 50): db.ScheduledTaskRun[] {
  return db.getScheduledTaskRuns(taskId, limit);
}

/**
 * Stop all cron jobs (called on app quit)
 */
export function stopAllJobs(): void {
  console.log('[Scheduler] Stopping all cron jobs...');

  for (const [taskId, job] of activeJobs) {
    job.stop();
    console.log(`[Scheduler] Stopped job for task ${taskId}`);
  }

  activeJobs.clear();

  // Kill any running processes
  for (const [runId, proc] of runningProcesses) {
    proc.kill('SIGTERM');
    console.log(`[Scheduler] Killed process for run ${runId}`);
  }

  runningProcesses.clear();

  console.log('[Scheduler] All cron jobs stopped');
}

/**
 * Get list of all scheduled tasks
 */
export function listScheduledTasks(): db.ScheduledTask[] {
  return db.getScheduledTasks();
}

/**
 * Get a single scheduled task
 */
export function getScheduledTask(id: string): db.ScheduledTask | null {
  return db.getScheduledTask(id);
}

/**
 * Validate a cron expression
 */
export function validateCronExpression(expression: string): { valid: boolean; error?: string; nextRun?: string } {
  try {
    const job = new Cron(expression);
    const nextRun = job.nextRun();
    job.stop();

    return {
      valid: true,
      nextRun: nextRun?.toISOString(),
    };
  } catch (error: any) {
    return {
      valid: false,
      error: error.message,
    };
  }
}
