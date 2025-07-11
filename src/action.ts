import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import { AppStoreSubmitter } from './AppStoreSubmitter';

async function run(): Promise<void> {
  try {
    // 取得輸入參數
    const appId = core.getInput('app-id', { required: true });
    const version = core.getInput('version', { required: true });
    const issuerId = core.getInput('issuer-id', { required: true });
    const keyId = core.getInput('key-id', { required: true });
    const privateKey = core.getInput('private-key', { required: true });
    const whatNewsJa = core.getInput('what-news-ja', { required: true });
    const whatNewsEn = core.getInput('what-news-en', { required: true });
    const whatNewsZh = core.getInput('what-news-zh', { required: true });
    // 建立臨時私鑰檔案 (從 base64 解碼)
    const tempKeyPath = path.join(process.cwd(), 'temp_private_key.p8');
    const decodedPrivateKey = Buffer.from(privateKey, 'base64').toString('utf8');
    fs.writeFileSync(tempKeyPath, decodedPrivateKey);

    // 初始化 AppStoreSubmitter
    const submitter = new AppStoreSubmitter({
      issuerId,
      keyId,
      privateKeyPath: tempKeyPath
    });

    // 送審流程
    const whatNews = {
      ja: whatNewsJa,
      en: whatNewsEn,
      zh: whatNewsZh
    };

    const buildId = await submitter.getTestFlightVersion(appId, version);
    await submitter.submitTestFlightBuildForAppStore(buildId, version);
    await submitter.submitForReview(appId, version, whatNews);
    const result = `成功送審版本 ${version}`;

    // 清理臨時檔案
    if (fs.existsSync(tempKeyPath)) {
      fs.unlinkSync(tempKeyPath);
    }

    core.setOutput('result', result);
    console.log(`✅ ${result}`);

  } catch (error) {
    // 清理臨時檔案
    const tempKeyPath = path.join(process.cwd(), 'temp_private_key.p8');
    if (fs.existsSync(tempKeyPath)) {
      fs.unlinkSync(tempKeyPath);
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    core.setFailed(`❌ Action 執行失敗: ${errorMessage}`);
  }
}

run();