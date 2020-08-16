import * as React from 'react';
import ReactDOM from 'react-dom';

import { DropZone } from '../src';

const UploaderExample = () => {
  const onAttach = () => {};

  return (
    <DropZone onAttach={onAttach}>
      {({ getRootProps, getInputProps, acceptedFilesData, deleteFile, deleteAllFiles }) => {
        return (
          <>
            <div {...getRootProps()}>
              <input type='file' {...getInputProps()} />
            </div>

            <div>
              {acceptedFilesData.map(({ preview }, index) => {
                return (
                  <div>
                    <img src={preview} />
                    <div onClick={() => deleteFile(index)}>Delete file</div>
                  </div>
                );
              })}

              {acceptedFilesData.length ? <button onClick={() => deleteAllFiles()}>Delete all</button> : null}
            </div>
          </>
        )
      }}
    </DropZone>
  )
}

ReactDOM.render(
  <UploaderExample />,
  document.getElementById('root'),
);
