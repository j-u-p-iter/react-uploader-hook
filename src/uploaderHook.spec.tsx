import React from "react";

import * as testingLibrary from "@testing-library/react";

import "@testing-library/jest-dom/extend-expect";

import { DropZone, FILE_TYPE_ERROR, MAX_SIZE_ERROR } from ".";

const { render, fireEvent, createEvent } = testingLibrary as any;

window.URL.createObjectURL = jest.fn(() => "url-to-file");

type CreateFile = (options: {
  name: string;
  type?: string;
  size: number;
}) => File;
const createFile: CreateFile = ({ name, type, size }) => {
  const file = new File([], name, { type });

  return Object.defineProperty(file, "size", {
    get() {
      return size;
    }
  });
};

type FireDropEvent = (params: { element: HTMLElement; files: File[] }) => void;
const fireDropEvent: FireDropEvent = ({ element, files }) => {
  const dropEvent = createEvent.drop(element);

  Object.defineProperty(dropEvent, "dataTransfer", {
    value: { files }
  });

  fireEvent(element, dropEvent);
};

const testIds = {
  INPUT: "input",
  DND_AREA: "dndArea"
};

describe("uploaderHook", () => {
  let renderComponent;
  let onAttach;
  let checkOnAttach;

  beforeAll(() => {
    onAttach = jest.fn();

    checkOnAttach = (
      firstExpectedArgument,
      secondExpectedArgument,
      callIndex = 0
    ) => {
      expect(onAttach).toHaveBeenCalledTimes(callIndex + 1);

      // For some reason toHaveBeenCalledWith throws an error
      expect(onAttach.mock.calls[callIndex][0]).toEqual(firstExpectedArgument);
      expect(onAttach.mock.calls[callIndex][1]).toEqual(secondExpectedArgument);
    };

    const Errors = ({ rejectedFilesData }) => {
      return (
        <ul>
          {rejectedFilesData.map(({ file, errors }) => {
            return errors.map(error => (
              <li key={error}>
                <div data-testid="rejectedFileName">{file.name}</div>
                <div data-testid="error">{error}</div>
              </li>
            ));
          })}
        </ul>
      );
    };

    const Files = ({ acceptedFilesData }) => {
      return (
        <ul>
          {acceptedFilesData.map(({ file, preview, url }, index) => {
            return (
              <li key={index}>
                {file ? (
                  <div data-testid="acceptedFileName">{file.name}</div>
                ) : null}
                {preview ? (
                  <img data-testid="filePreview" src={preview} />
                ) : null}
                {url ? <img data-testid="uploadedFile" src={url} /> : null}
              </li>
            );
          })}
        </ul>
      );
    };

    renderComponent = (props = {}) => {
      return render(
        <DropZone {...props}>
          {({
            getRootProps,
            getInputProps,
            acceptedFilesData,
            rejectedFilesData,
            deleteFile,
            deleteAllFiles
          }) => {
            return (
              <>
                <div {...getRootProps()} data-testid={testIds.DND_AREA}>
                  <input
                    {...getInputProps()}
                    data-testid={testIds.INPUT}
                    type="file"
                  />
                </div>

                <Files acceptedFilesData={acceptedFilesData} />

                <Errors rejectedFilesData={rejectedFilesData} />

                <button onClick={() => deleteFile(0)}>Delete file</button>

                <button onClick={() => deleteAllFiles()}>
                  Delete all files
                </button>
              </>
            );
          }}
        </DropZone>
      );
    };
  });

  beforeEach(() => {
    onAttach.mockClear();
  });

  describe("Input", () => {
    it("renders properly by default", () => {
      const { getByTestId } = renderComponent();

      expect(getByTestId(testIds.INPUT)).not.toHaveAttribute("accept");
      expect(getByTestId(testIds.INPUT)).not.toHaveAttribute("multiple");
    });

    it("sets up accept attribute", () => {
      const acceptValue = "image/*";

      const { getByTestId } = renderComponent({ accept: acceptValue });

      expect(getByTestId(testIds.INPUT).accept).toBe(acceptValue);
    });

    it("sets up multiple attribute", () => {
      const multipleValue = true;

      const { getByTestId } = renderComponent({ multiple: multipleValue });

      expect(getByTestId(testIds.INPUT).multiple).toBe(multipleValue);
    });

    describe("size validation", () => {
      it("provides a correct error when a size is above {maxSize}", async () => {
        const file = createFile({ name: "super.pdf", size: 1200 });

        const { getByTestId, queryByTestId } = renderComponent({
          maxSize: 1000,
          onAttach
        });

        fireEvent.change(getByTestId(testIds.INPUT), {
          target: { files: [file] }
        });

        expect(getByTestId("rejectedFileName")).toHaveTextContent(file.name);
        expect(getByTestId("error")).toHaveTextContent(MAX_SIZE_ERROR);
        expect(queryByTestId("filePreview")).toBeNull();

        checkOnAttach([], [{ file, errors: [MAX_SIZE_ERROR] }]);
      });

      it("does not provide an error when a size is lower or equal {maxSize}", async () => {
        const file = createFile({ name: "super.pdf", size: 900 });

        const { queryByTestId, getByTestId } = renderComponent({
          maxSize: 1000,
          onAttach
        });

        fireEvent.change(getByTestId(testIds.INPUT), {
          target: { files: [file] }
        });

        expect(queryByTestId("rejectedFileName")).toBeNull();
        expect(queryByTestId("error")).toBeNull();
        expect(getByTestId("filePreview")).toHaveAttribute("src");

        checkOnAttach([{ file, preview: "url-to-file" }], []);
      });

      it("does not accept rejected files in case of uploading of multiple files", () => {
        const file1 = createFile({ name: "super.pdf", size: 900 });
        const file2 = createFile({ name: "super.png", size: 5200 });

        const { getByTestId } = renderComponent({
          maxSize: 5000,
          multiple: true,
          onAttach
        });

        fireEvent.change(getByTestId(testIds.INPUT), {
          target: { files: [file1, file2] }
        });

        expect(getByTestId("rejectedFileName")).toHaveTextContent(file2.name);
        expect(getByTestId("error")).toHaveTextContent(MAX_SIZE_ERROR);

        expect(getByTestId("acceptedFileName")).toHaveTextContent(file1.name);
        expect(getByTestId("filePreview")).toHaveAttribute("src");

        checkOnAttach(
          [{ file: file1, preview: "url-to-file" }],
          [{ file: file2, errors: [MAX_SIZE_ERROR] }]
        );
      });
    });

    describe("attaching files", () => {
      it("provides information about attached file", () => {
        const file = createFile({ name: "super.pdf", size: 900 });

        const { getByTestId } = renderComponent();

        fireEvent.change(getByTestId(testIds.INPUT), {
          target: { files: [file] }
        });

        expect(getByTestId("acceptedFileName")).toHaveTextContent(file.name);
        expect(getByTestId("filePreview")).toHaveAttribute("src");
      });

      it("provides information about all attached files in case of uploading of multiple files", () => {
        const file1 = createFile({ name: "super.pdf", size: 900 });
        const file2 = createFile({ name: "super.png", size: 5200 });

        const { queryAllByTestId, getByTestId } = renderComponent({
          multiple: true,
          onAttach
        });

        fireEvent.change(getByTestId(testIds.INPUT), {
          target: { files: [file1, file2] }
        });

        expect(queryAllByTestId("acceptedFileName")[0]).toHaveTextContent(
          file1.name
        );
        expect(queryAllByTestId("filePreview")[0]).toHaveAttribute("src");

        expect(queryAllByTestId("acceptedFileName")[1]).toHaveTextContent(
          file2.name
        );
        expect(queryAllByTestId("filePreview")[1]).toHaveAttribute("src");

        checkOnAttach(
          [
            { file: file1, preview: "url-to-file" },
            { file: file2, preview: "url-to-file" }
          ],
          []
        );
      });

      it("attaches new information to the previous one instead of rewriting it with {multiple} attribute", () => {
        const file1 = createFile({ name: "super.pdf", size: 900 });
        const file2 = createFile({ name: "super.png", size: 5200 });

        const file3 = createFile({ name: "super.jpeg", size: 900 });
        const file4 = createFile({ name: "super.json", size: 5200 });

        const { queryAllByTestId, getByTestId } = renderComponent({
          multiple: true,
          onAttach
        });

        fireEvent.change(getByTestId(testIds.INPUT), {
          target: { files: [file1, file2] }
        });

        expect(queryAllByTestId("acceptedFileName").length).toBe(2);
        expect(queryAllByTestId("filePreview").length).toBe(2);
        expect(queryAllByTestId("acceptedFileName")[0]).toHaveTextContent(
          file1.name
        );
        expect(queryAllByTestId("filePreview")[0]).toHaveAttribute("src");
        expect(queryAllByTestId("acceptedFileName")[1]).toHaveTextContent(
          file2.name
        );
        expect(queryAllByTestId("filePreview")[1]).toHaveAttribute("src");

        checkOnAttach(
          [
            { file: file1, preview: "url-to-file" },
            { file: file2, preview: "url-to-file" }
          ],
          []
        );

        fireEvent.change(getByTestId(testIds.INPUT), {
          target: { files: [file3, file4] }
        });

        expect(queryAllByTestId("acceptedFileName").length).toBe(4);
        expect(queryAllByTestId("filePreview").length).toBe(4);
        expect(queryAllByTestId("acceptedFileName")[2]).toHaveTextContent(
          file3.name
        );
        expect(queryAllByTestId("filePreview")[2]).toHaveAttribute("src");
        expect(queryAllByTestId("acceptedFileName")[3]).toHaveTextContent(
          file4.name
        );
        expect(queryAllByTestId("filePreview")[3]).toHaveAttribute("src");

        checkOnAttach(
          [
            { file: file3, preview: "url-to-file" },
            { file: file4, preview: "url-to-file" }
          ],
          [],
          1
        );
      });

      it("rewrites information with the new one without {multiple} attribute", () => {
        const file1 = createFile({ name: "super.pdf", size: 900 });
        const file2 = createFile({ name: "super.png", size: 5200 });

        const { queryAllByTestId, getByTestId } = renderComponent({ onAttach });

        fireEvent.change(getByTestId(testIds.INPUT), {
          target: { files: [file1] }
        });

        expect(queryAllByTestId("acceptedFileName").length).toBe(1);
        expect(queryAllByTestId("filePreview").length).toBe(1);
        expect(queryAllByTestId("acceptedFileName")[0]).toHaveTextContent(
          file1.name
        );
        expect(queryAllByTestId("filePreview")[0]).toHaveAttribute("src");

        checkOnAttach([{ file: file1, preview: "url-to-file" }], []);

        fireEvent.change(getByTestId(testIds.INPUT), {
          target: { files: [file2] }
        });

        expect(queryAllByTestId("acceptedFileName").length).toBe(1);
        expect(queryAllByTestId("filePreview").length).toBe(1);
        expect(queryAllByTestId("acceptedFileName")[0]).toHaveTextContent(
          file2.name
        );
        expect(queryAllByTestId("filePreview")[0]).toHaveAttribute("src");

        checkOnAttach([{ file: file2, preview: "url-to-file" }], [], 1);
      });
    });
  });

  describe("DnD area", () => {
    describe("file type validation", () => {
      it("provides a correct error in case of incorrect file type", async () => {
        const file = createFile({
          type: "image/jpeg",
          name: "super.jpeg",
          size: 1200
        });

        const { getByTestId, queryByTestId } = renderComponent({
          accept: "image/png",
          onAttach
        });

        fireDropEvent({
          element: getByTestId(testIds.DND_AREA),
          files: [file]
        });

        expect(getByTestId("rejectedFileName")).toHaveTextContent(file.name);
        expect(getByTestId("error")).toHaveTextContent(FILE_TYPE_ERROR);
        expect(queryByTestId("filePreview")).toBeNull();

        checkOnAttach([], [{ file, errors: [FILE_TYPE_ERROR] }]);
      });

      it("provides a correct error in case of invalid extension", async () => {
        const file = createFile({
          type: ".jpeg",
          name: "super.jpeg",
          size: 1200
        });

        const { getByTestId, queryByTestId } = renderComponent({
          accept: ".png",
          onAttach
        });

        fireDropEvent({
          element: getByTestId(testIds.DND_AREA),
          files: [file]
        });

        expect(getByTestId("rejectedFileName")).toHaveTextContent(file.name);
        expect(getByTestId("error")).toHaveTextContent(FILE_TYPE_ERROR);
        expect(queryByTestId("filePreview")).toBeNull();

        checkOnAttach([], [{ file, errors: [FILE_TYPE_ERROR] }]);
      });

      it("does not provide an error if file type is valid", () => {
        const file = createFile({
          type: "image/png",
          name: "super.png",
          size: 900
        });

        const { queryByTestId, getByTestId } = renderComponent({
          accept: "image/*",
          onAttach
        });

        fireDropEvent({
          element: getByTestId(testIds.DND_AREA),
          files: [file]
        });

        expect(queryByTestId("rejectedFileName")).toBeNull();
        expect(queryByTestId("error")).toBeNull();
        expect(getByTestId("filePreview")).toHaveAttribute("src");

        checkOnAttach([{ file, preview: "url-to-file" }], []);
      });

      it("does not provide an error if file extension is valid", () => {
        const file = createFile({
          type: "image/png",
          name: "super.png",
          size: 900
        });

        const { queryByTestId, getByTestId } = renderComponent({
          accept: ".png",
          onAttach
        });

        fireDropEvent({
          element: getByTestId(testIds.DND_AREA),
          files: [file]
        });

        expect(queryByTestId("rejectedFileName")).toBeNull();
        expect(queryByTestId("error")).toBeNull();
        expect(getByTestId("filePreview")).toHaveAttribute("src");

        checkOnAttach([{ file, preview: "url-to-file" }], []);
      });

      it("does not accept rejected files in case of uploading of multiple files", () => {
        const file1 = createFile({
          type: ".pdf",
          name: "super.pdf",
          size: 900
        });
        const file2 = createFile({
          type: "image/png",
          name: "super.png",
          size: 5200
        });

        const { getByTestId } = renderComponent({
          accept: ".pdf",
          multiple: true,
          onAttach
        });

        fireEvent.change(getByTestId(testIds.INPUT), {
          target: { files: [file1, file2] }
        });

        expect(getByTestId("rejectedFileName")).toHaveTextContent(file2.name);
        expect(getByTestId("error")).toHaveTextContent(FILE_TYPE_ERROR);

        expect(getByTestId("acceptedFileName")).toHaveTextContent(file1.name);
        expect(getByTestId("filePreview")).toHaveAttribute("src");

        checkOnAttach(
          [{ file: file1, preview: "url-to-file" }],
          [{ file: file2, errors: [FILE_TYPE_ERROR] }]
        );
      });
    });

    describe("size validation", () => {
      it("provides a correct error when a size is above {maxSize}", async () => {
        const file = createFile({ name: "super.pdf", size: 1200 });

        const { getByTestId, queryByTestId } = renderComponent({
          maxSize: 1000,
          onAttach
        });

        fireDropEvent({
          element: getByTestId(testIds.DND_AREA),
          files: [file]
        });

        expect(getByTestId("rejectedFileName")).toHaveTextContent(file.name);
        expect(getByTestId("error")).toHaveTextContent(MAX_SIZE_ERROR);
        expect(queryByTestId("filePreview")).toBeNull();

        checkOnAttach([], [{ file, errors: [MAX_SIZE_ERROR] }]);
      });

      it("does not provide an error when a size is lower or equal {maxSize}", async () => {
        const file = createFile({ name: "super.pdf", size: 900 });

        const { queryByTestId, getByTestId } = renderComponent({
          maxSize: 1000,
          onAttach
        });

        fireDropEvent({
          element: getByTestId(testIds.DND_AREA),
          files: [file]
        });

        expect(queryByTestId("rejectedFileName")).toBeNull();
        expect(queryByTestId("error")).toBeNull();
        expect(getByTestId("filePreview")).toHaveAttribute("src");

        checkOnAttach([{ file, preview: "url-to-file" }], []);
      });

      it("does not accept rejected files in case of uploading of multiple files", () => {
        const file1 = createFile({ name: "super.pdf", size: 900 });
        const file2 = createFile({ name: "super.png", size: 5200 });

        const { getByTestId } = renderComponent({
          maxSize: 5000,
          multiple: true,
          onAttach
        });

        fireDropEvent({
          element: getByTestId(testIds.DND_AREA),
          files: [file1, file2]
        });

        expect(getByTestId("rejectedFileName")).toHaveTextContent(file2.name);
        expect(getByTestId("error")).toHaveTextContent(MAX_SIZE_ERROR);

        expect(getByTestId("acceptedFileName")).toHaveTextContent(file1.name);
        expect(getByTestId("filePreview")).toHaveAttribute("src");

        checkOnAttach(
          [{ file: file1, preview: "url-to-file" }],
          [{ file: file2, errors: [MAX_SIZE_ERROR] }]
        );
      });
    });

    describe("attaching files", () => {
      it("provides information about attached file", () => {
        const file = createFile({ name: "super.pdf", size: 900 });

        const { getByTestId } = renderComponent({ onAttach });

        fireDropEvent({
          element: getByTestId(testIds.DND_AREA),
          files: [file]
        });

        expect(getByTestId("acceptedFileName")).toHaveTextContent(file.name);
        expect(getByTestId("filePreview")).toHaveAttribute("src");

        checkOnAttach([{ file, preview: "url-to-file" }], []);
      });

      it("provides information about all attached files in case of uploading of multiple files", () => {
        const file1 = createFile({ name: "super.pdf", size: 900 });
        const file2 = createFile({ name: "super.png", size: 5200 });

        const { queryAllByTestId, getByTestId } = renderComponent({
          multiple: true,
          onAttach
        });

        fireDropEvent({
          element: getByTestId(testIds.DND_AREA),
          files: [file1, file2]
        });

        expect(queryAllByTestId("acceptedFileName")[0]).toHaveTextContent(
          file1.name
        );
        expect(queryAllByTestId("filePreview")[0]).toHaveAttribute("src");

        expect(queryAllByTestId("acceptedFileName")[1]).toHaveTextContent(
          file2.name
        );
        expect(queryAllByTestId("filePreview")[1]).toHaveAttribute("src");

        checkOnAttach(
          [
            { file: file1, preview: "url-to-file" },
            { file: file2, preview: "url-to-file" }
          ],
          []
        );
      });

      it("provides information only about one attached file in case of uploading of multiple files without {multiple} attribute", () => {
        const file1 = createFile({ name: "super.pdf", size: 900 });
        const file2 = createFile({ name: "super.png", size: 5200 });

        const { queryAllByTestId, getByTestId } = renderComponent({ onAttach });

        fireDropEvent({
          element: getByTestId(testIds.DND_AREA),
          files: [file1, file2]
        });

        expect(queryAllByTestId("acceptedFileName").length).toBe(1);
        expect(queryAllByTestId("acceptedFileName")[0]).toHaveTextContent(
          file1.name
        );
        expect(queryAllByTestId("filePreview")[0]).toHaveAttribute("src");

        checkOnAttach([{ file: file1, preview: "url-to-file" }], []);
      });

      it("attaches new information to the previous one instead of rewriting it with {multiple} attribute", () => {
        const file1 = createFile({ name: "super.pdf", size: 900 });
        const file2 = createFile({ name: "super.png", size: 5200 });

        const file3 = createFile({ name: "super.jpeg", size: 900 });
        const file4 = createFile({ name: "super.json", size: 5200 });

        const { queryAllByTestId, getByTestId } = renderComponent({
          multiple: true,
          onAttach
        });

        fireDropEvent({
          element: getByTestId(testIds.DND_AREA),
          files: [file1, file2]
        });

        expect(queryAllByTestId("acceptedFileName").length).toBe(2);
        expect(queryAllByTestId("filePreview").length).toBe(2);
        expect(queryAllByTestId("acceptedFileName")[0]).toHaveTextContent(
          file1.name
        );
        expect(queryAllByTestId("filePreview")[0]).toHaveAttribute("src");
        expect(queryAllByTestId("acceptedFileName")[1]).toHaveTextContent(
          file2.name
        );
        expect(queryAllByTestId("filePreview")[1]).toHaveAttribute("src");

        checkOnAttach(
          [
            { file: file1, preview: "url-to-file" },
            { file: file2, preview: "url-to-file" }
          ],
          []
        );

        fireDropEvent({
          element: getByTestId(testIds.DND_AREA),
          files: [file3, file4]
        });

        expect(queryAllByTestId("acceptedFileName").length).toBe(4);
        expect(queryAllByTestId("filePreview").length).toBe(4);
        expect(queryAllByTestId("acceptedFileName")[2]).toHaveTextContent(
          file3.name
        );
        expect(queryAllByTestId("filePreview")[2]).toHaveAttribute("src");
        expect(queryAllByTestId("acceptedFileName")[3]).toHaveTextContent(
          file4.name
        );
        expect(queryAllByTestId("filePreview")[3]).toHaveAttribute("src");

        checkOnAttach(
          [
            { file: file3, preview: "url-to-file" },
            { file: file4, preview: "url-to-file" }
          ],
          [],
          1
        );
      });

      it("rewrites information with the new one without {multiple} attribute", () => {
        const file1 = createFile({ name: "super.pdf", size: 900 });
        const file2 = createFile({ name: "super.png", size: 5200 });

        const { queryAllByTestId, getByTestId } = renderComponent({ onAttach });

        fireDropEvent({
          element: getByTestId(testIds.DND_AREA),
          files: [file1]
        });

        expect(queryAllByTestId("acceptedFileName").length).toBe(1);
        expect(queryAllByTestId("filePreview").length).toBe(1);
        expect(queryAllByTestId("acceptedFileName")[0]).toHaveTextContent(
          file1.name
        );
        expect(queryAllByTestId("filePreview")[0]).toHaveAttribute("src");

        checkOnAttach([{ file: file1, preview: "url-to-file" }], []);

        fireDropEvent({
          element: getByTestId(testIds.DND_AREA),
          files: [file2]
        });

        expect(queryAllByTestId("acceptedFileName").length).toBe(1);
        expect(queryAllByTestId("filePreview").length).toBe(1);
        expect(queryAllByTestId("acceptedFileName")[0]).toHaveTextContent(
          file2.name
        );
        expect(queryAllByTestId("filePreview")[0]).toHaveAttribute("src");

        checkOnAttach([{ file: file2, preview: "url-to-file" }], [], 1);
      });
    });
  });

  describe("deleting files", () => {
    let renderResult;
    let file2;
    beforeEach(() => {
      const file1 = createFile({ name: "super.pdf", size: 900 });
      file2 = createFile({ name: "super.png", size: 5200 });

      renderResult = renderComponent({ multiple: true, onAttach });

      fireDropEvent({
        element: renderResult.getByTestId(testIds.DND_AREA),
        files: [file1, file2]
      });
    });

    it("deletes one file properly", () => {
      const { getByText, queryAllByTestId } = renderResult;

      expect(queryAllByTestId("acceptedFileName").length).toBe(2);

      fireEvent.click(getByText("Delete file"));

      expect(queryAllByTestId("acceptedFileName").length).toBe(1);
      expect(queryAllByTestId("acceptedFileName")[0]).toHaveTextContent(
        file2.name
      );
    });

    it("delete all files properly", () => {
      const { getByText, queryAllByTestId } = renderResult;

      expect(queryAllByTestId("acceptedFileName").length).toBe(2);

      fireEvent.click(getByText("Delete all files"));

      expect(queryAllByTestId("acceptedFileName").length).toBe(0);
    });
  });

  describe("uploadedFiles", () => {
    it("renders uploaded files properly", () => {
      const { getAllByTestId } = renderComponent({
        uploadedFilesUrls: [
          "http://uploadedFile.com",
          "http://oneMoreUploadedFile.com"
        ]
      });

      expect(getAllByTestId("uploadedFile").length).toBe(2);
    });

    it("deletes uploaded files properly", () => {
      const { queryAllByTestId, getByText } = renderComponent({
        uploadedFilesUrls: [
          "http://uploadedFile.com",
          "http://oneMoreUploadedFile.com"
        ]
      });

      expect(queryAllByTestId("uploadedFile").length).toBe(2);

      fireEvent.click(getByText("Delete file"));

      expect(queryAllByTestId("uploadedFile").length).toBe(1);

      fireEvent.click(getByText("Delete all files"));

      expect(queryAllByTestId("uploadedFile").length).toBe(0);
    });
  });
});
