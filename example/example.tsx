import * as React from 'react';
import ReactDOM from 'react-dom';

import { DropZone } from '../src';

const UploaderExample = () => {
  const onAttach = () => {};

  return (
    <DropZone onAttach={onAttach} multiple uploadedFilesUrls={['http://some-url.com']}>
      {({ getRootProps, getInputProps, acceptedFilesData, deleteFile, deleteAllFiles, removedFilesUrls }) => {
        return (
          <>
            <div {...getRootProps()}>
              <input type='file' {...getInputProps()} />
            </div>

            <div>
              {acceptedFilesData.map(({ preview, url }, index) => {
                return (
                  <div>
                    <img src={url || preview} />
                    <div onClick={() => deleteFile(index)}>Delete file</div>
                  </div>
                );
              })}

              {acceptedFilesData.length ? <button onClick={() => deleteAllFiles()}>Delete all</button> : null}

              Deleted Files
              {removedFilesUrls.length ? removedFilesUrls.map(({ url }) => <img src={url} />) : null}
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
