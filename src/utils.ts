import isAccepted from "attr-accept";
import { ChangeEvent, DragEvent } from "react";

import { FILE_TYPE_ERROR, MAX_SIZE_ERROR } from "./constants";

export const isDragEvent = (
  event: ChangeEvent<HTMLInputElement> | DragEvent
): event is DragEvent => event.hasOwnProperty("dataTransfer");

type GetFilesFromEvent = (
  event: ChangeEvent<HTMLInputElement> | DragEvent
) => FileList;
export const getFilesFromEvent: GetFilesFromEvent = event => {
  return isDragEvent(event) ? event.dataTransfer.files : event.target.files;
};

type CheckFileSize = (file: File, maxSize?: number) => string | undefined;
const checkFileSize: CheckFileSize = (file, maxSize) => {
  if (!maxSize || file.size <= maxSize) {
    return;
  }

  return MAX_SIZE_ERROR;
};

type CheckFileType = (file: File, accept?: string) => string | undefined;
const checkFileType: CheckFileType = (file, accept) => {
  if (!accept || isAccepted(file, accept)) {
    return;
  }

  return FILE_TYPE_ERROR;
};

type ValidateFile = (params: {
  file: File;
  maxSize?: number;
  accept?: string;
}) => string[];
export const validateFile: ValidateFile = ({ file, maxSize, accept }) => {
  const maxSizeError = checkFileSize(file, maxSize);
  const fileTypeError = checkFileType(file, accept);

  return [maxSizeError, fileTypeError].filter(Boolean);
};
