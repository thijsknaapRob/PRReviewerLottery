import * as React from "react";
import * as SDK from "azure-devops-extension-sdk";
import { WebApiTeam } from "azure-devops-extension-api/Core";
import { isNil } from "lodash";

import { IListBoxItem } from "azure-devops-ui/ListBox";

import { Spinner } from "azure-devops-ui/Spinner";
import { Button } from "azure-devops-ui/Button";
import { ButtonGroup } from "azure-devops-ui/ButtonGroup";
import { Card } from "azure-devops-ui/Card";
import { Toggle } from "azure-devops-ui/Toggle";
import { Dropdown, DropdownExpandableButton } from "azure-devops-ui/Dropdown";

import { Observer } from "azure-devops-ui/Observer";

import { IProjectSettings, IReviewerGroup } from "../../types";

import {
  defaultProjectSettings,
  getDefaultReviewerGroup,
  AzureDevopsService,
} from "../../services/settings.service";
import {
  IGlobalMessagesService,
  CommonServiceIds,
} from "azure-devops-extension-api";

interface IOverviewTabState {
  userName?: string;
  projectName?: string;
  projectId?: string;
  isCleanForm: boolean;
  teams: WebApiTeam[];
  settings?: IProjectSettings;
  isSettingsFromStore: boolean;
  isLoaded: boolean;
  _azureDevopsService: AzureDevopsService;
  isSaving: boolean;
}

export class OverviewTab extends React.Component<{}, IOverviewTabState> {
  constructor(props: {}) {
    super(props);

    this.state = {
      isCleanForm: true,
      teams: [],
      isSettingsFromStore: false,
      isLoaded: false,
      _azureDevopsService: new AzureDevopsService(),
      isSaving: false,
    };
  }

  public componentDidMount() {
    this.initializeState();
  }
  private getTeamPickerOptions(): IListBoxItem[] {
    const options: IListBoxItem[] = [];
    this.state.teams.forEach(function (item) {
      options.push({ data: item, id: item.id, text: item.name });
    });

    return options;
  }
  private async initializeState(): Promise<void> {
    try {
      await SDK.ready();
    } catch (e) {
      console.warn("Azure DevOps SDK not available:", e);
      this.setState({ isLoaded: true });
      return;
    }

    const userName = this.state._azureDevopsService.name().displayName;
    this.setState({
      userName,
    });

    const project = await this.state._azureDevopsService.getProject();
    if (project) {
      this.setState({ projectName: project.name, projectId: project.id });
    }
    this.state._azureDevopsService.getAllTeams().then((allTeams) => {
      this.setState({ teams: allTeams, isLoaded: true });
    });

    this.state._azureDevopsService
      .getSetting("ProjectSettings", this.state.projectId!)
      .then((settings: IProjectSettings) => {
        if (!isNil(settings)) {
          this.setState({
            settings,
            isSettingsFromStore: true,
          });
        }
      })
      .catch((e) => {
        this.setState({
          settings: defaultProjectSettings,
          isSettingsFromStore: false,
          isLoaded: true,
        });
      });
  }

  private addReviewerGroup(): void {
    const reviewerSettings = this.state.settings?.reviewerSettings ?? [
      getDefaultReviewerGroup(),
    ];
    const newSettings: IProjectSettings = {
      ...this.state.settings!!,
      reviewerSettings: reviewerSettings.concat([getDefaultReviewerGroup()]),
    };
    this.setState({ isCleanForm: false, settings: newSettings });
  }

  private removeReviewerGroup(id: string): void {
    var reviewerSettings = this.state.settings?.reviewerSettings ?? [
      getDefaultReviewerGroup(),
    ];

    if (reviewerSettings.length == 1) {
      reviewerSettings = [getDefaultReviewerGroup()];
    } else {
      const index = reviewerSettings.findIndex((x) => x.settingId == id);
      reviewerSettings.splice(index, 1);
    }

    const newSettings: IProjectSettings = {
      ...this.state.settings!!,
      reviewerSettings: reviewerSettings,
    };
    this.setState({ isCleanForm: false, settings: newSettings });
  }

  private onSelectTeam(
    reviewerGroup: IReviewerGroup,
    event: React.SyntheticEvent<HTMLElement, Event>,
    item: IListBoxItem<{}>
  ): void {
    this.setState({ isCleanForm: false });
    const newTeam = item.data! as WebApiTeam;
    reviewerGroup.id = newTeam.id;
    reviewerGroup.name = newTeam.name;
  }

  private onToggleIsRequired(
    reviewerGroup: IReviewerGroup,
    event: React.SyntheticEvent<HTMLElement, Event>,
    value: boolean
  ): void {
    reviewerGroup.isRequired = value;
    this.setState({ isCleanForm: false });
  }

  private async onDiscardChanges(): Promise<void> {
    this.setState({ isCleanForm: true });
    await this.initializeState();
  }

  private async onSaveChanges(): Promise<void> {
    const messageService = await SDK.getService<IGlobalMessagesService>(
      CommonServiceIds.GlobalMessagesService
    );
    const settings: IProjectSettings = {
      ...this.state.settings!!,
      id: this.state.projectId!!,
    };
    this.setState({ isSaving: true });

    this.state._azureDevopsService
      .setDocument("ProjectSettings", settings)
      .then((result) => {
        if (!this.state.isSettingsFromStore) {
          this.setState({ isSettingsFromStore: true });
        }
        messageService.addToast({
          message: "Saved",
          duration: 3000,
        });
        this.setState({ isSaving: false });
      })
      .catch((err) => {
        console.error(err);
        messageService.addToast({
          message: "Settings could not be saved: see console for details",
          duration: 3000,
        });
        this.setState({ isSaving: false });
      });
  }

  public render(): JSX.Element | null {
    const {
      userName,
      projectName,
      isCleanForm,
      teams,
      settings,
      isLoaded,
      isSaving,
    } = this.state;

    var currentSettings = settings ?? defaultProjectSettings;
    if (!isLoaded) {
      return <Spinner label="loading" />;
    }

    return (
      <div className="page-content page-content-top flex-column rhythm-vertical-16">
        <div>
          <ButtonGroup>
            <Button
              text="Save"
              primary={true}
              iconProps={{
                iconName: isSaving ? "Refresh" : "Save",
                className: isSaving ? "loader" : "",
              }}
              onClick={this.onSaveChanges.bind(this)}
            />
            <Button
              text="Discard changes"
              iconProps={{ iconName: "Delete" }}
              onClick={this.onDiscardChanges.bind(this)}
            />
          </ButtonGroup>
        </div>
        <div className="page-content-top flex-column rhythm-vertical-16">
          <Card>
            <div className="flex-row full-width">
              <Button
                ariaLabel="Add"
                className="add-reviewer-group-button"
                iconProps={{ iconName: "Add" }}
                onClick={this.addReviewerGroup.bind(this)}
              />
              <div className="flex-column full-width">
                <Observer reviewerGroups={currentSettings.reviewerSettings}>
                  {(props: { reviewerGroups: IReviewerGroup[] }) => {
                    return props.reviewerGroups.length === 0
                      ? null
                      : props.reviewerGroups.map((item) =>
                          this.renderRow(item, teams)
                        );
                  }}
                </Observer>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  private renderRow = (
    item: IReviewerGroup,
    teams: WebApiTeam[]
  ): JSX.Element => {
    return (
      <div key={item.settingId} className="reviewer-group-item">
        <Observer teams={teams}>
          {(props: { teams: WebApiTeam[] }) => {
            return props.teams.length === 0 ? null : (
              <Dropdown
                className="reviewer-team-picker"
                items={this.getTeamPickerOptions()}
                onSelect={(event, team) => this.onSelectTeam(item, event, team)}
                placeholder={item.name}
                renderExpandable={(expandableProps) => (
                  <DropdownExpandableButton {...expandableProps} />
                )}
              />
            );
          }}
        </Observer>
        <Toggle
          offText={"Optional"}
          onText={"Required"}
          checked={item.isRequired}
          onChange={(event, value) =>
            this.onToggleIsRequired(item, event, value)
          }
        />
        <Button
          ariaLabel="Remove"
          subtle={true}
          className="add-reviewer-group-button"
          iconProps={{ iconName: "Cancel" }}
          onClick={() => this.removeReviewerGroup.bind(this)(item.settingId)}
        />
      </div>
    );
  };
}
