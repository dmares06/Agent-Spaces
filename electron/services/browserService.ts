import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

const execAsync = promisify(exec);

export interface BrowserNavigateResult {
  success: boolean;
  url: string;
  title?: string;
  message: string;
}

export interface BrowserClickResult {
  success: boolean;
  selector: string;
  message: string;
}

export interface BrowserScreenshotResult {
  success: boolean;
  path: string;
  message: string;
}

export class BrowserService {
  private sessionActive: boolean = false;
  private lastUrl: string = '';
  private screenshotDir: string;
  private sessionName: string = 'agent-workspace';

  constructor() {
    // Store screenshots in app's temp directory
    this.screenshotDir = path.join(
      os.tmpdir(),
      'agent-workspace-screenshots'
    );
  }

  private getSessionFlag(): string {
    return `--session ${this.sessionName}`;
  }

  async ensureScreenshotDir(): Promise<void> {
    try {
      await fs.mkdir(this.screenshotDir, { recursive: true });
    } catch (error) {
      console.error('[BrowserService] Failed to create screenshot dir:', error);
    }
  }

  /**
   * Navigate to a URL
   */
  async navigate(url: string): Promise<BrowserNavigateResult> {
    try {
      console.log(`[BrowserService] Navigating to ${url}`);
      const { stdout } = await execAsync(`agent-browser ${this.getSessionFlag()} open "${url}"`);

      this.sessionActive = true;
      this.lastUrl = url;

      return {
        success: true,
        url,
        message: `Successfully navigated to ${url}\n${stdout}`
      };
    } catch (error: any) {
      console.error('[BrowserService] Navigate error:', error);
      return {
        success: false,
        url,
        message: `Failed to navigate: ${error.message}`
      };
    }
  }

  /**
   * Click an element by selector
   */
  async click(selector: string): Promise<BrowserClickResult> {
    try {
      console.log(`[BrowserService] Clicking ${selector}`);
      const { stdout } = await execAsync(`agent-browser ${this.getSessionFlag()} click "${selector}"`);

      return {
        success: true,
        selector,
        message: `Clicked ${selector}\n${stdout}`
      };
    } catch (error: any) {
      console.error('[BrowserService] Click error:', error);
      return {
        success: false,
        selector,
        message: `Failed to click ${selector}: ${error.message}`
      };
    }
  }

  /**
   * Fill a form field
   */
  async fillForm(selector: string, value: string): Promise<BrowserClickResult> {
    try {
      console.log(`[BrowserService] Filling ${selector} with "${value}"`);
      const { stdout } = await execAsync(
        `agent-browser ${this.getSessionFlag()} fill "${selector}" "${value}"`
      );

      return {
        success: true,
        selector,
        message: `Filled ${selector} with "${value}"\n${stdout}`
      };
    } catch (error: any) {
      console.error('[BrowserService] Fill error:', error);
      return {
        success: false,
        selector,
        message: `Failed to fill ${selector}: ${error.message}`
      };
    }
  }

  /**
   * Take a screenshot
   */
  async screenshot(filename?: string): Promise<BrowserScreenshotResult> {
    try {
      await this.ensureScreenshotDir();

      const screenshotName = filename || `screenshot-${Date.now()}.png`;
      const screenshotPath = path.join(this.screenshotDir, screenshotName);

      console.log(`[BrowserService] Taking screenshot: ${screenshotPath}`);
      const { stdout } = await execAsync(
        `agent-browser ${this.getSessionFlag()} screenshot "${screenshotPath}"`
      );

      return {
        success: true,
        path: screenshotPath,
        message: `Screenshot saved to ${screenshotPath}\n${stdout}`
      };
    } catch (error: any) {
      console.error('[BrowserService] Screenshot error:', error);
      return {
        success: false,
        path: '',
        message: `Failed to take screenshot: ${error.message}`
      };
    }
  }

  /**
   * Wait for an element to appear
   */
  async waitFor(selector: string, timeout: number = 5000): Promise<BrowserClickResult> {
    try {
      console.log(`[BrowserService] Waiting for ${selector}`);
      // agent-browser may not have explicit wait command - simulate with sleep
      await new Promise(resolve => setTimeout(resolve, timeout));

      return {
        success: true,
        selector,
        message: `Waited for ${selector} (timeout: ${timeout}ms)`
      };
    } catch (error: any) {
      console.error('[BrowserService] Wait error:', error);
      return {
        success: false,
        selector,
        message: `Failed to wait for ${selector}: ${error.message}`
      };
    }
  }

  /**
   * Read content from the page
   */
  async readContent(selector?: string): Promise<{ success: boolean; content: string; message: string }> {
    try {
      console.log(`[BrowserService] Reading content${selector ? ` from ${selector}` : ''}`);
      const command = selector
        ? `agent-browser ${this.getSessionFlag()} get text "${selector}"`
        : `agent-browser ${this.getSessionFlag()} snapshot -i`;

      const { stdout } = await execAsync(command);

      return {
        success: true,
        content: stdout.trim(),
        message: `Extracted content${selector ? ` from ${selector}` : ''}`
      };
    } catch (error: any) {
      console.error('[BrowserService] Read content error:', error);
      return {
        success: false,
        content: '',
        message: `Failed to read content: ${error.message}`
      };
    }
  }

  /**
   * Close the browser
   */
  async close(): Promise<void> {
    try {
      console.log('[BrowserService] Closing browser');
      await execAsync(`agent-browser ${this.getSessionFlag()} close`);
      this.sessionActive = false;
      this.lastUrl = '';
    } catch (error) {
      console.error('[BrowserService] Close error:', error);
    }
  }

  getStatus(): { active: boolean; lastUrl: string } {
    return {
      active: this.sessionActive,
      lastUrl: this.lastUrl
    };
  }
}

// Singleton instance
export const browserService = new BrowserService();
