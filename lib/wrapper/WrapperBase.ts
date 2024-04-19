import { Construct } from "constructs";

export interface WrapperBaseProps {
  scope: Construct;
  appId: string;
}

export class WrapperBase {
  protected scope: Construct;
  protected appId: string;

  constructor(props: WrapperBaseProps) {
    this.setValues(props);
  }

  private readonly setValues = (props: WrapperBaseProps): void => {
    const { scope, appId } = props;

    this.scope = scope;
    this.appId = appId;
  };
}
