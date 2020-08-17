import * as React from "react";

import { UploaderHookParams, useUploaderHook } from "./uploaderHook";

type FC<T> = React.FC<T>;
type ReactNode = React.ReactNode;

interface DropZoneProps extends UploaderHookParams {
  children: (props: any) => ReactNode;
}

export const DropZone: FC<DropZoneProps> = ({ children, ...props }) => {
  const result = useUploaderHook(props);

  return <>{children(result)}</>;
};
