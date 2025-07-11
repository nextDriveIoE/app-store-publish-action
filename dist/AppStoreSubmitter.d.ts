interface AppStoreSubmitConfig {
    issuerId: string;
    keyId: string;
    privateKeyPath: string;
}
export declare class AppStoreSubmitter {
    private client;
    constructor(config: AppStoreSubmitConfig);
    mapToLocale(locale: string): 'ja' | 'en' | 'zh';
    /**
     * 取得指定版本的 TestFlight Build
     * @param appId - App Store Connect 中的應用程式 ID
     * @param versionString - 版本號 (例如: "2.0.1303")
     * @returns TestFlight Build ID
     */
    getTestFlightVersion(appId: string, versionString: string): Promise<string>;
    /**
     * 將指定的 TestFlight Build 送審準備上架
     * @param buildId - TestFlight Build ID
     * @param versionString - 版本號 (例如: "1.4.9502")
     */
    submitTestFlightBuildForAppStore(buildId: string, versionString: string): Promise<void>;
    /**
     * 取得指定版本的 App Store Version
     */
    private getAppStoreVersion;
    /**
     * 驗證版本狀態是否可以送審
     */
    private validateVersionState;
    /**
     * 建立 App Store 版本送審請求
     */
    private createSubmissionRequest;
    private updateWhatNews;
    /**
     * 檢查是否為已送審的錯誤
     */
    private isAlreadySubmittedError;
    /**
     * 更新版本狀態為準備送審
     */
    private updateVersionForSubmission;
    /**
     * 處理送審錯誤並提供詳細資訊
     */
    private handleSubmissionError;
    /**
     * 自動送審指定版本的應用程式
     * @param appId - App Store Connect 中的應用程式 ID
     * @param versionString - 版本號 (例如: "2.0.1303")
     */
    submitForReview(appId: string, versionString: string, whatNews: {
        ja: string;
        en: string;
        zh: string;
    }): Promise<void>;
}
export {};
