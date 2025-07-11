"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const AppStoreSubmitter_1 = require("./AppStoreSubmitter");
async function run() {
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
        const submitter = new AppStoreSubmitter_1.AppStoreSubmitter({
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
    }
    catch (error) {
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
