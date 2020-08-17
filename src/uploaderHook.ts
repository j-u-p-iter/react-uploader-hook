import { SyntheticEvent, useRef, useState } from "react";

import { getFilesFromEvent, validateFile } from "./utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

interface RootProps extends React.HTMLAttributes<HTMLElement> {}

interface UploaderHookAPI {
  getInputProps: () => InputProps;
  getRootProps: () => RootProps;
  acceptedFilesData: AcceptedFilesData;
  rejectedFilesData: RejectedFilesData;
  deleteFile: (fileIndex: number) => void;
  deleteAllFiles: () => void;
}

type AcceptedFilesData = Array<{
  file: File;
  preview: string;
}>;

type RejectedFilesData = Array<{
  file: File;
  errors: string[];
}>;

export interface UploaderHookParams {
  multiple?: boolean;
  accept?: string;
  maxSize?: number;
  onAttach?: (
    acceptedFilesData: AcceptedFilesData,
    refectedFilesData: RejectedFilesData,
    event: SyntheticEvent
  ) => void;
}

type UploaderHook = (params: UploaderHookParams) => UploaderHookAPI;

export const useUploaderHook: UploaderHook = ({
  maxSize,
  multiple = false,
  accept,
  onAttach: onAttachCb = () => {}
}) => {
  const [acceptedFilesData, setAcceptedFilesData] = useState<AcceptedFilesData>(
    []
  );

  const [rejectedFilesData, setRejectedFilesData] = useState<RejectedFilesData>(
    []
  );

  const rootRef = useRef();
  const inputRef = useRef();

  const handleAttach = event => {
    event.stopPropagation();
    event.preventDefault();

    let files = Array.from(getFilesFromEvent(event));

    if (!multiple) {
      files = [files[0]];
    }

    const { accepted, rejected } = files.reduce(
      (result, file) => {
        const errors = validateFile({ file, accept, maxSize });

        if (!errors.length) {
          result.accepted.push({ file, preview: URL.createObjectURL(file) });
        } else {
          result.rejected.push({ file, errors });
        }
        return result;
      },
      { accepted: [], rejected: [] }
    );

    updateFilesData(accepted);
    updateFilesData(rejected);

    onAttachCb(accepted, rejected, event);
  };

  const getInputProps = () => ({
    name: "uploader",
    ref: inputRef,
    onChange: handleAttach,
    multiple,
    accept
  });

  const getRootProps = () => ({
    ref: rootRef,
    onDrop: handleAttach
  });

  const isAcceptedData = (
    data: AcceptedFilesData | RejectedFilesData
  ): data is AcceptedFilesData => {
    return !data[0].hasOwnProperty("errors");
  };

  const updateFilesData = (data: AcceptedFilesData | RejectedFilesData) => {
    if (!data.length) {
      return;
    }

    if (isAcceptedData(data)) {
      const resultData = multiple ? [...acceptedFilesData, ...data] : data;

      setAcceptedFilesData(resultData);
    } else {
      const resultData = multiple ? [...rejectedFilesData, ...data] : data;

      setRejectedFilesData(resultData);
    }
  };

  const deleteFile = (indexToDelete: number): void => {
    const resultAcceptedFilesData = acceptedFilesData.filter(
      (_, index) => indexToDelete !== index
    );

    setAcceptedFilesData(resultAcceptedFilesData);
  };

  const deleteAllFiles = () => {
    setAcceptedFilesData([]);
    setRejectedFilesData([]);
  };

  return {
    getInputProps,
    getRootProps,
    deleteFile,
    deleteAllFiles,
    acceptedFilesData,
    rejectedFilesData
  };
};
