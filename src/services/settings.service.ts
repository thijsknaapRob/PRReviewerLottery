import { IReviewerGroup, IProjectSettings } from "./../types";
import { guid } from "./guid";
import * as SDK from "azure-devops-extension-sdk";
import {
  CommonServiceIds,
  IProjectPageService,
  IExtensionDataService,
  getClient,
  IProjectInfo,
  IExtensionDataManager,
} from "azure-devops-extension-api";
import { isNil } from "lodash";
import { CoreRestClient, WebApiTeam } from "azure-devops-extension-api/Core";
import { TeamMember } from "azure-devops-extension-api/WebApi/WebApi";

export function getDefaultReviewerGroup(): IReviewerGroup {
  return {
    id: "",
    name: "Choose a Team",
    settingId: guid(),
    isRequired: false,
  };
}

export const defaultProjectSettings: IProjectSettings = {
  id: "",
  createdDate: new Date(),
  modifiedDate: new Date(),
  extensionEnabled: false,
  overrideOrganizationSettings: false,
  reviewerSettings: [getDefaultReviewerGroup()],
};

export class AzureDevopsService {
  constructor() {
    SDK.init();
  }

  public async getSetting(
    collection: string,
    id: string
  ): Promise<IProjectSettings> {
    const extensionDataService = await SDK.getService<IExtensionDataService>(
      CommonServiceIds.ExtensionDataService
    );
    const accessToken = await SDK.getAccessToken();
    const dataManager = await extensionDataService.getExtensionDataManager(
      SDK.getExtensionContext().id,
      accessToken
    );

    return dataManager.getDocument(collection, id);
  }

  public name(): SDK.IUserContext {
    return SDK.getUser();
  }

  public async getProject(): Promise<IProjectInfo | undefined> {
    const projectService = await SDK.getService<IProjectPageService>(
      CommonServiceIds.ProjectPageService
    );
    return projectService.getProject();
  }

  public async getAllTeams() {
    const project = await this.getProject();
    const allTeams: WebApiTeam[] = [];
    if (!isNil(project)) {
      const coreClient = getClient(CoreRestClient);

      let teams;
      let callCount = 0;
      const fetchCount = 1000;

      do {
        teams = await coreClient.getTeams(
          project.id,
          false,
          fetchCount,
          callCount * fetchCount
        );
        allTeams.push(...teams);
        callCount++;
      } while (teams.length === fetchCount);
    }
    return allTeams;
  }

  public async getAllUsersInTeam(teamId: string) {
    const project = await this.getProject();
    const allUsers: TeamMember[] = [];
    if (!isNil(project)) {
      const coreClient = getClient(CoreRestClient);

      let users;
      let callCount = 0;
      const fetchCount = 1000;

      do {
        users = await coreClient.getTeamMembersWithExtendedProperties(
          project.id,
          teamId,
          fetchCount,
          callCount * fetchCount
        );
        allUsers.push(...users);
        callCount++;
      } while (users.length === fetchCount);
    }
    return allUsers;
  }

  public async getAllUsersInAllTeams(
    reviewerGroups: IReviewerGroup[]
  ): Promise<void> {
    for (let i = 0; i < reviewerGroups.length; i++) {
      const reviewerGroup = reviewerGroups[i];
      const members = await this.getAllUsersInTeam(reviewerGroup.id);

      reviewerGroup.members = members.map((teamMember) => teamMember.identity);
    }
  }

  public get extensionContext(): SDK.IExtensionContext {
    return SDK.getExtensionContext();
  }

  private async getExtensionDataManager(): Promise<IExtensionDataManager> {
    const extensionDataService = await SDK.getService<IExtensionDataService>(
      CommonServiceIds.ExtensionDataService
    );

    const accessToken = await SDK.getAccessToken();
    return extensionDataService.getExtensionDataManager(
      this.extensionContext.id,
      accessToken
    );
  }

  public async setDocument(collection: string, document: IProjectSettings) {
    const dataManager = await this.getExtensionDataManager();
    return dataManager.setDocument(collection, document);
  }
}
