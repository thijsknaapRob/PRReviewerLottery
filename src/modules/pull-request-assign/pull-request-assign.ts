import { GitService } from "./../../services/git.service";
import { IProjectSettings } from "./../../types";
import * as SDK from "azure-devops-extension-sdk";

import { isNil } from "lodash";
import { AzureDevopsService } from "../../services/settings.service";
import { RandomReviewerDrawService } from "../../services/random.service";
import {
  IGlobalMessagesService,
  CommonServiceIds,
} from "azure-devops-extension-api";

async function assignReviewers(context: any, settings: IProjectSettings) {
  const azureDevopsService = new AzureDevopsService();
  const azureGitService = new GitService();
  const randomService = new RandomReviewerDrawService();
  const messageService = await SDK.getService<IGlobalMessagesService>(
    CommonServiceIds.GlobalMessagesService
  );

  azureDevopsService
    .getAllUsersInAllTeams(settings.reviewerSettings)
    .then((teamUsers) => {
      const unavailableIdentities = [
        ...context.pullRequest.reviewers,
        context.pullRequest.createdBy,
      ];
      return randomService.drawReviewers(
        settings.reviewerSettings,
        unavailableIdentities
      );
    })
    .then((draw) => {
      return azureGitService.assignReviewers(draw, context);
    })
    .then(() => {
      messageService.addToast({ message: "PR assigned", duration: 3000 });
    })
    .catch((err) => {
      console.error(err);
      messageService.addToast({
        message: "PR reviewer assignment failed: see console for details",
        duration: 3000,
      });
    });
}
SDK.init();
SDK.ready().then(() => {
  SDK.register(SDK.getContributionId(), () => {
    return {
      execute: async (context: any) => {
        const azureDevopsService = new AzureDevopsService();

        const project = await azureDevopsService.getProject();
        if (!project) {
          console.error("Could not retrieve project info");
          return;
        }

        azureDevopsService
          .getSetting("ProjectSettings", project.id)
          .then((settings: IProjectSettings) => {
            if (!isNil(settings)) {
              assignReviewers(context, settings)
                .then((result) => console.log(result))
                .catch((err) => console.log(err));
            }
          });

        console.log(context);
      },
    };
  });
});
