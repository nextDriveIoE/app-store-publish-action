import { AppStoreConnectAPI } from 'appstore-connect-sdk';
import { 
  AppStoreVersionsApi,
  AppsApi,
  BuildsApi,
  ReviewSubmissionsApi,
  ReviewSubmissionItemsApi,
  AppStoreVersionLocalizationsApi
} from 'appstore-connect-sdk/openapi';
import fs from 'fs';

interface AppStoreSubmitConfig {
  issuerId: string;
  keyId: string;
  privateKeyPath: string;
}

export class AppStoreSubmitter {
  private client: AppStoreConnectAPI;

  constructor(config: AppStoreSubmitConfig) {
    const privateKey = fs.readFileSync(config.privateKeyPath, 'utf8');
    
    this.client = new AppStoreConnectAPI({
      issuerId: config.issuerId,
      privateKeyId: config.keyId,
      privateKey: privateKey
    });
  }

  mapToLocale(locale: string): 'ja' | 'en' | 'zh' {
    if (locale.startsWith('ja')) {
      return 'ja';
    } else if (locale.startsWith('en')) {
      return 'en';
    } else if (locale.startsWith('zh')) {
      return 'zh';
    }
    return 'en';
  }

  /**
   * 取得指定版本的 TestFlight Build
   * @param appId - App Store Connect 中的應用程式 ID
   * @param versionString - 版本號 (例如: "2.0.1303")
   * @returns TestFlight Build ID
   */
  async getTestFlightVersion(appId: string, versionString: string): Promise<string> {
    try {
      console.log(`搜尋 TestFlight 版本 ${versionString}...`);
      
      const buildsApi = await this.client.create(BuildsApi);
      
      // 取得應用程式的所有 builds，包含 preReleaseVersion 資訊
      const buildsResponse = await buildsApi.buildsGetCollection({
        filterApp: [appId],
        include: ['preReleaseVersion'],
        sort: ['-uploadedDate'],
        limit: 50
      });

      if (!buildsResponse.data || buildsResponse.data.length === 0) {
        throw new Error(`在 TestFlight 中找不到任何版本`);
      }

      // 尋找匹配的 build - 支援多種版本格式
      const targetBuild = buildsResponse.data.find(build => {
        if (buildsResponse.included) {
          const preReleaseVersionId = build.relationships?.preReleaseVersion?.data?.id;
          if (preReleaseVersionId) {
            const preReleaseVersion = buildsResponse.included.find(
              item => item.type === 'preReleaseVersions' && item.id === preReleaseVersionId
            );
            if ((preReleaseVersion?.attributes as any)?.version === versionString) {
              return true;
            }
          }
        }
        
        return false;
      });

      if (!targetBuild) {
        throw new Error(`在 TestFlight 中找不到版本 ${versionString}`);
      }

      console.log(`找到 TestFlight Build ID: ${targetBuild.id}`);
      console.log(`Bundle Version: ${targetBuild.attributes?.version}`);
      console.log(`Build 狀態: ${targetBuild.attributes?.processingState}`);
      console.log(`上傳日期: ${targetBuild.attributes?.uploadedDate}`);
      
      return targetBuild.id;
    } catch (error: any) {
      console.error(`❌ 取得 TestFlight 版本失敗:`, error);
      throw error;
    }
  }

  /**
   * 將指定的 TestFlight Build 送審準備上架
   * @param buildId - TestFlight Build ID
   * @param versionString - 版本號 (例如: "1.4.9502")
   */
  async submitTestFlightBuildForAppStore(buildId: string, versionString: string): Promise<void> {
    try {
      console.log(`開始將 TestFlight Build ${buildId} 送審準備上架...`);

      // 1. 取得 build 資訊
      const buildsApi = await this.client.create(BuildsApi);
      const buildResponse = await buildsApi.buildsGetInstance({
        id: buildId,
        include: ['app']
      });

      if (!buildResponse.data) {
        throw new Error(`找不到 Build ID: ${buildId}`);
      }

      const build = buildResponse.data;
      const appId = build.relationships?.app?.data?.id;
      
      if (!appId) {
        throw new Error(`無法從 Build 中取得 App ID`);
      }

      console.log(`找到 App ID: ${appId}`);

      // 2. 創建或取得 App Store Version
      const appsApi = await this.client.create(AppsApi);
      let appStoreVersion;

      try {
        // 先嘗試取得現有的版本
        const versionsResponse = await appsApi.appsAppStoreVersionsGetToManyRelated({
          id: appId,
          filterVersionString: [versionString]
        });

        if (versionsResponse.data && versionsResponse.data.length > 0) {
          appStoreVersion = versionsResponse.data[0];
          console.log(`找到現有的 App Store Version: ${appStoreVersion.id}`);
        } else {
          // 創建新的 App Store Version
          const versionsApi = await this.client.create(AppStoreVersionsApi);
          const createVersionResponse = await versionsApi.appStoreVersionsCreateInstance({
            appStoreVersionCreateRequest: {
              data: {
                type: 'appStoreVersions',
                attributes: {
                  versionString: versionString,
                  platform: 'IOS'
                },
                relationships: {
                  app: {
                    data: {
                      type: 'apps',
                      id: appId
                    }
                  }
                }
              }
            }
          });
          
          appStoreVersion = createVersionResponse.data;
          console.log(`創建新的 App Store Version: ${appStoreVersion.id}`);
        }
      } catch (error: any) {
        console.error(`處理 App Store Version 失敗:`, error);
        throw error;
      }

      // 3. 將 Build 關聯到 App Store Version
      const versionsApi = await this.client.create(AppStoreVersionsApi);
      await versionsApi.appStoreVersionsUpdateInstance({
        id: appStoreVersion.id,
        appStoreVersionUpdateRequest: {
          data: {
            type: 'appStoreVersions',
            id: appStoreVersion.id,
            relationships: {
              build: {
                data: {
                  type: 'builds',
                  id: buildId
                }
              }
            }
          }
        }
      });
      
      console.log(`✅ TestFlight Build ${buildId} 已成功關聯到 App Store Version ${versionString}`);
      console.log(`現在可以使用 submitForReview 方法來送審此版本`);

    } catch (error: any) {
      console.error(`❌ TestFlight Build 送審準備失敗:`, error);
      await this.handleSubmissionError(error);
      throw error;
    }
  }

  /**
   * 取得指定版本的 App Store Version
   */
  private async getAppStoreVersion(appId: string, versionString: string) {
    const appsApi = await this.client.create(AppsApi);
    
    const versionsResponse = await appsApi.appsAppStoreVersionsGetToManyRelated({
      id: appId,
      filterVersionString: [versionString]
    });

    if (!versionsResponse.data || versionsResponse.data.length === 0) {
      throw new Error(`找不到版本 ${versionString}`);
    }

    const appStoreVersion = versionsResponse.data[0];
    console.log(`找到版本 ID: ${appStoreVersion.id}`);
    
    return appStoreVersion;
  }

  /**
   * 驗證版本狀態是否可以送審
   */
  private validateVersionState(currentState: string, versionString: string): boolean {
    console.log(`目前狀態: ${currentState}`);

    const submittableStates = ['PREPARE_FOR_SUBMISSION', 'READY_FOR_REVIEW'];
    if (!submittableStates.includes(currentState)) {
      // 如果狀態已經是已送審的狀態，則視為成功
      if (['WAITING_FOR_REVIEW', 'IN_REVIEW', 'PENDING_DEVELOPER_RELEASE', 'PENDING_APPLE_RELEASE'].includes(currentState)) {
        console.log(`✅ 版本 ${versionString} 已經送審，目前狀態為 ${currentState}。`);
        return false; // 不需要送審
      }
      throw new Error(`版本狀態為 ${currentState}，無法送審。`);
    }

    return true; // 需要送審
  }

  /**
   * 建立 App Store 版本送審請求
   */
  private async createSubmissionRequest(appId: string, versionString: string, versionId: string): Promise<void> {
    console.log(`建立送審請求, appId = ${appId}, versionString = ${versionString}`);
    
    try {
      // 切換到送審狀態
      const reviewSubmissionsApi = await this.client.create(ReviewSubmissionsApi);
      try {
        await reviewSubmissionsApi.reviewSubmissionsCreateInstance({
          reviewSubmissionCreateRequest: {
            data: {
              type: 'reviewSubmissions',
              attributes: {
                platform: 'IOS'
              },
              relationships: {
                app: {
                  data: {
                    type: "apps",
                    id: appId
                  }
                }
              }
            }
          }
        });
      } catch (error: any) {
        console.error(`建立送審請求失敗(省略此步驟)`);
      }

      const reviewSubmissionResponse = await reviewSubmissionsApi.reviewSubmissionsGetCollection({
        filterApp: [appId],
        fieldsReviewSubmissions: ['appStoreVersionForReview']
      });
      const reviewSubmission = reviewSubmissionResponse.data?.[0];
      if (!reviewSubmission) {
        throw new Error(`reviewSubmission 找不到 , App ID: ${appId}`);
      }

      const reviewSubmissionId = reviewSubmission.id;

      // // 建立送審請求
      const reviewSubmissionItemsApi = await this.client.create(ReviewSubmissionItemsApi);
      await reviewSubmissionItemsApi.reviewSubmissionItemsCreateInstance({
        reviewSubmissionItemCreateRequest: {
          data: {
            type: 'reviewSubmissionItems',
            relationships: {
              appStoreVersion: {
                data: {
                  type: 'appStoreVersions',
                  id: versionId
                }
              },
              reviewSubmission: {
                data: {
                  type: 'reviewSubmissions',
                  id: reviewSubmissionId
                }
              }
            }
          }
        }
      });

      await reviewSubmissionsApi.reviewSubmissionsUpdateInstance({
        id: reviewSubmissionId,
        reviewSubmissionUpdateRequest: {
          data: {
            type: "reviewSubmissions",
            id: reviewSubmissionId,
            attributes: {
              submitted: true
            }
          }
        }
      });
      
      console.log(`✅ 版本 ${versionString} 已成功送審！`);
    } catch (submitError: any) {
      console.log('submitError', JSON.stringify(submitError))
      if (await this.isAlreadySubmittedError(submitError)) {
        console.log(`✅ 版本 ${versionString} 已經送審，不需要再次送審。`);
        return;
      }
      throw submitError;
    }
  }

  private async updateWhatNews(versionId: string, whatNews: { ja: string; en: string; zh: string }): Promise<void> {
    const versionsApi = await this.client.create(AppStoreVersionsApi);

    // 取得指定版本的所有本地化資訊
    const localizationsResponse = await versionsApi.appStoreVersionsAppStoreVersionLocalizationsGetToManyRelated({
      id: versionId,
      fieldsAppStoreVersionLocalizations: ["locale", "whatsNew"] // 只取得需要的欄位
    });

    const localizations = localizationsResponse.data;
    const localizationsApi = await this.client.create(AppStoreVersionLocalizationsApi);
    for (const localization of localizations) {
      console.log(`更新版本 ${versionId} 的本地化資訊: ${localization.id}, locate = ${localization.attributes?.locale}`);
      const whatsNew = whatNews[this.mapToLocale(localization.attributes?.locale as string)];
      console.log(`whatsNew = ${whatsNew}`);

      await localizationsApi.appStoreVersionLocalizationsUpdateInstance({
        id: localization.id,
        appStoreVersionLocalizationUpdateRequest: {
          data: {
            type: "appStoreVersionLocalizations",
            id: localization.id,
            attributes: {
              whatsNew
            }
          }
        }
      });
    }
  }

  /**
   * 檢查是否為已送審的錯誤
   */
  private async isAlreadySubmittedError(error: any): Promise<boolean> {
    if (error.response && error.response.status === 403) {
      try {
        const responseBody = await error.response.text();
        const errorData = JSON.parse(responseBody);
        
        return errorData.errors && 
               errorData.errors[0].detail && 
               errorData.errors[0].detail.includes("does not allow 'CREATE'. Allowed operation is: DELETE");
      } catch (parseError) {
        return false;
      }
    }
    return false;
  }

  /**
   * 更新版本狀態為準備送審
   */
  private async updateVersionForSubmission(versionId: string, versionString: string): Promise<void> {
    console.log(`狀態為 PREPARE_FOR_SUBMISSION，需要先更新版本狀態...`);
    
    const versionsApi = await this.client.create(AppStoreVersionsApi);
    await versionsApi.appStoreVersionsUpdateInstance({
      id: versionId,
      appStoreVersionUpdateRequest: {
        data: {
          type: 'appStoreVersions',
          id: versionId,
          attributes: {
            versionString: versionString,
            releaseType: 'AFTER_APPROVAL'
          }
        }
      }
    });
    
    console.log(`版本已更新，準備送審...`);
  }

  /**
   * 處理送審錯誤並提供詳細資訊
   */
  private async handleSubmissionError(error: any): Promise<void> {
    console.error(`❌ 送審失敗:`, error);
    
    if (error.response) {
      const status = error.response.status;
      console.error(`HTTP 狀態碼: ${status}`);
      
      if (status === 403) {
        console.error('權限錯誤: API 金鑰可能沒有足夠的權限。\n' + 
                    '請確保您的 API 金鑰具有 "App Manager" 或更高的角色，並且具有 App Store 存取權限。');
      } else if (status === 409) {
        console.error('衝突錯誤: 應用程式版本可能已經送審或處於不符合送審條件的狀態。');
      }
      
      try {
        const responseBody = await error.response.text();
        if (responseBody) {
          console.error('回應詳細資訊:', responseBody);
        }
      } catch (e) {
        console.error('無法讀取回應詳細資訊');
      }
    }
  }

  /**
   * 自動送審指定版本的應用程式
   * @param appId - App Store Connect 中的應用程式 ID
   * @param versionString - 版本號 (例如: "2.0.1303")
   */
  async submitForReview(appId: string, versionString: string, whatNews: { ja: string; en: string; zh: string }): Promise<void> {
    try {
      console.log(`開始送審應用程式 ${appId} 版本 ${versionString}...`);

      // 1. 取得指定版本的 App Store Version
      const appStoreVersion = await this.getAppStoreVersion(appId, versionString);
      const versionId = appStoreVersion.id;
      const currentState = appStoreVersion.attributes?.appStoreState as string;

      // 2. 檢查版本狀態是否可以送審
      const shouldSubmit = this.validateVersionState(currentState, versionString);
      if (!shouldSubmit) {
        return; // 已經送審或不需要送審
      }

      // 3. 根據狀態處理送審流程
      if (currentState === 'PREPARE_FOR_SUBMISSION') {
        // 更新版本狀態後送審
        // await this.updateVersionForSubmission(versionId, versionString);
        await this.updateWhatNews(versionId, whatNews);
        await this.createSubmissionRequest(appId, versionString, versionId);
      } else if (currentState === 'READY_FOR_REVIEW') {
        // 直接送審
        await this.createSubmissionRequest(appId, versionString, versionId);
      }

    } catch (error: any) {
      await this.handleSubmissionError(error);
      throw error;
    }
  }
}
