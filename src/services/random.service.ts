import { IdentityRefWithRequirement, IReviewerGroup } from "./../types";
import { IdentityRef } from "azure-devops-extension-api/WebApi/WebApi";

export class RandomReviewerDrawService {
  private getRandomInt(high: number): number {
    return Math.floor(Math.random() * high);
  }

  private computeSetDifference(
    mainSet: IdentityRef[],
    removeSet: IdentityRef[]
  ) {
    const removeIds = new Set(removeSet.map((item) => item.id));
    return mainSet.filter((item) => !removeIds.has(item.id));
  }

  public drawReviewers(
    groups: IReviewerGroup[],
    unavailableIdentities: IdentityRefWithRequirement[]
  ): IdentityRefWithRequirement[] {
    const pickedReviewers: IdentityRefWithRequirement[] = [];
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];

      const effectiveGroup = this.computeSetDifference(
        group.members!,
        unavailableIdentities
      );
      if (effectiveGroup.length > 0) {
        const randomNum = this.getRandomInt(effectiveGroup.length);
        const memberWithRequirement: IdentityRefWithRequirement = {
          ...effectiveGroup[randomNum],
          IsRequired: group.isRequired,
        };
        unavailableIdentities.push(memberWithRequirement);
        pickedReviewers.push(memberWithRequirement);
      }
    }
    return pickedReviewers;
  }
}
