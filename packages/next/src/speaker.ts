import type { ISpeaker } from '@mi-gpt/engine/base';
import { MiService } from './service.js';

class SpeakerManager implements ISpeaker {
  /**
   * 播放文字、音频链接
   */
  async play({ text, url }: { text?: string; url?: string } = {}) {
    if (!MiService.MiNA) {
      return false;
    }
    if (url) {
      return MiService.MiNA.play({ url });
    }
    if (text) {
      return MiService.MiNA.play({ text });
    }
    return false;
  }

  /**
   * 中断原来小爱的运行
   */
  async abortXiaoAI() {
    if (MiService.MiNA) {
      // 尝试停止当前播放
      await MiService.MiNA.stop();
    }
    return false;
  }
}

export const MiSpeaker = new SpeakerManager();
