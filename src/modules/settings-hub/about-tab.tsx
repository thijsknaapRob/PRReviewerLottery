import * as React from "react";
import * as SDK from "azure-devops-extension-sdk";
import {
  CommonServiceIds,
  IHostNavigationService,
} from "azure-devops-extension-api";

import { Card } from "azure-devops-ui/Card";

export interface IAboutTabState {
  currentHash?: string;
}

export class AboutTab extends React.Component<{}, IAboutTabState> {
  constructor(props: {}) {
    super(props);
    this.state = {};
  }

  public componentDidMount() {
    this.initialize();
  }

  public render(): JSX.Element {
    return (
      <div className="page-content page-content-top flex-column rhythm-vertical-16">
        <Card>
          <div className="list-example-row flex-row h-scroll-hidden">
            <div
              style={{ marginLeft: "10px", padding: "10px 0px" }}
              className="flex-column h-scroll-hidden"
            >
              <span>Credits</span>
              <span className="fontSizeMS font-size-ms secondary-text">
                <p>
                  Deze extensie is gebasseerd op de PR Reviewer Lottery van Etienne Gautier en aangepast voor Robidus door Team D&AI (Thijs van der Knaap)
                </p>
              </span>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  private async initialize() {
    try {
      const navigationService = await SDK.getService<IHostNavigationService>(
        CommonServiceIds.HostNavigationService
      );
      navigationService.onHashChanged((hash: string) => {
        this.setState({ currentHash: hash });
      });
    } catch (e) {
      console.warn("Azure DevOps SDK not available:", e);
    }
  }
}
