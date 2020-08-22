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

type AcceptedFilesData = Array<
  | {
      file: File;
      preview: string;
    }
  | {
      url: string;
    }
>;

type RejectedFilesData = Array<{
  file: File;
  errors: string[];
}>;

type RemovedFilesUrls = Array<{ url: string }>;

export interface UploaderHookParams {
  uploadedFilesUrls?: string[];
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

/**
 * Provides access:
 *
 * - to attached files by DnD or with help of input[type="file"];
 * - to validation errors;
 * - to the api to manage the attached file.
 *
 * @param {Object} [config] Configuration options object.
 * @param {number} [config.maxSize] Maximum bytes of data allowed to upload.
 * @param {string} [config.accept] Files types allowed to upload.
 * @param {boolean} [config.multiple=false] To allow or not multiple files upload.
 * @param {onAttach} [config.onAttach=() => {}] To allow or not multiple files upload.
 *
 * @returns {Object} api Api to manage attached files.
 */

const urlsToAcceptedFilesData = (urls, multiple) => {
  const filesData = urls.map(url => ({ url }));

  if (!filesData.length) {
    return [];
  }

  return multiple ? filesData : [filesData[0]];
};

export const useUploaderHook: UploaderHook = ({
  maxSize,
  accept,
  multiple = false,
  onAttach: onAttachCb = () => {},
  uploadedFilesUrls = []
}) => {
  const [acceptedFilesData, setAcceptedFilesData] = useState<AcceptedFilesData>(
    () => urlsToAcceptedFilesData(uploadedFilesUrls, multiple)
  );
  const [rejectedFilesData, setRejectedFilesData] = useState<RejectedFilesData>(
    []
  );
  const [removedFilesUrls, setRemovedFilesUrls] = useState<RemovedFilesUrls>(
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
    const removedFile = acceptedFilesData[indexToDelete];

    const resultAcceptedFilesData = acceptedFilesData.filter(
      (_, index) => indexToDelete !== index
    );

    setAcceptedFilesData(resultAcceptedFilesData);

    if ("url" in removedFile) {
      setRemovedFilesUrls([...removedFilesUrls, removedFile]);
    }
  };

  const deleteAllFiles = () => {
    setAcceptedFilesData([]);
    setRejectedFilesData([]);

    const removedUploadedFiles = acceptedFilesData.filter(
      data => "url" in data
    ) as RemovedFilesUrls;

    setRemovedFilesUrls([...removedFilesUrls, ...removedUploadedFiles]);
  };

  return {
    getInputProps,
    getRootProps,
    deleteFile,
    deleteAllFiles,
    acceptedFilesData,
    rejectedFilesData,
    removedFilesUrls
  };
};
