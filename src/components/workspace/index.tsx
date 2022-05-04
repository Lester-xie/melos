import React, { useCallback, useState, useRef, useEffect } from 'react';
import EventEmitter from 'events';
import WaveformPlaylist from 'waveform-playlist';
import * as Tone from 'tone';
import { saveAs } from 'file-saver';
import styles from './index.less';

import {
  DownloadOutlined,
  SwapOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import Resource from '@/components/resource';
import TrackList from '@/components/trackList';

type State = 'cursor' | 'select';

export default function Workspace() {
  const [ee] = useState(new EventEmitter());
  const [toneCtx, setToneCtx] = useState<any>(null);
  const setUpChain = useRef();

  const [showResource, setShowResource] = useState(false);
  const [state, setState] = useState<State>('cursor');
  const [playContext, setPlayContext] = useState<any>(null);

  useEffect(() => {
    setToneCtx(Tone.getContext());
  }, []);

  useEffect(() => {
    if (playContext && playContext.tracks.length > 0) {
      // 这里获取可以到playList对象
      // 使用 playContext.tracks[0].ee.emit('play')类似的方法可以对具体的音轨进行控制
      console.log(playContext);
    }
  }, [playContext]);

  const container = useCallback(
    (node) => {
      if (node !== null && toneCtx !== null) {
        const playlist = WaveformPlaylist(
          {
            ac: toneCtx.rawContext,
            waveHeight: 116,
            container: node,
            timescale: true,
            state: 'select',
            colors: {
              waveOutlineColor: '#2f2f2f',
            },
            controls: {
              show: false,
            },
          },
          ee,
        );

        ee.on('audiorenderingstarting', function (offlineCtx, a) {
          // Set Tone offline to render effects properly.
          const offlineContext = new Tone.OfflineContext(offlineCtx);
          Tone.setContext(offlineContext);
          setUpChain.current = a;
        });

        ee.on('audiorenderingfinished', function (type, data) {
          //restore original ctx for further use.
          Tone.setContext(toneCtx);
          if (type === 'wav') {
            saveAs(data, 'test.wav');
          }
        });

        ee.on('audiosourcesloaded', function () {
          setPlayContext(null);
        });

        ee.on('audiosourcesrendered', function () {
          setPlayContext(playlist);
        });

        playlist.load([
          // {
          //   src: 'https://simple-web-1252873427.cos.ap-shanghai.myqcloud.com/1.mp3',
          //   name: 'track one',
          // }
        ]);

        //initialize the WAV exporter.
        playlist.initExporter();
      }
    },
    [ee, toneCtx],
  );

  const onPlayBtnClicked = () => {
    ee.emit('play');
  };

  const onPauseBtnClicked = () => {
    ee.emit('pause');
  };

  const onStopBtnClicked = () => {
    ee.emit('stop');
  };

  const onCursorBtnClicked = () => {
    setState('cursor');
    ee.emit('statechange', 'cursor');
  };

  const onSwapBtnClicked = () => {
    setState('select');
    ee.emit('statechange', 'shift');
  };

  const onTrimBtnClicked = () => {
    ee.emit('trim');
  };

  const onDownloadBtnClicked = () => {
    if (playContext && playContext.tracks.length > 0) {
      ee.emit('startaudiorendering', 'wav');
    }
  };

  const onAddBtnClicked = () => {
    setShowResource(true);
  };

  const onFileSelect = (file: File) => {
    ee.emit('newtrack', file);
    setShowResource(false);
  };

  return (
    <div className={styles.container}>
      <div>
        <Resource
          show={showResource}
          onClose={() => setShowResource(false)}
          onSelect={onFileSelect}
        />
        <TrackList
          tracks={playContext?.tracks}
          onAddBtnClicked={onAddBtnClicked}
        />
      </div>
      <div className={styles.trackContainer}>
        <div className={styles.operation}>
          <div className={styles.trackTransport}>
            <button onClick={onStopBtnClicked} className={styles.stopBtn} />
            <button onClick={onPlayBtnClicked} className={styles.playBtn} />
            <button onClick={onPauseBtnClicked} className={styles.pauseBtn} />
          </div>
          <div className={styles.trackTransport}>
            <button
              onClick={onCursorBtnClicked}
              className={state === 'cursor' ? styles.activeState : ''}
            >
              <img
                src={require('@/assets/workshop/cursor.png')}
                alt="cursor"
                className={styles.cursorIcon}
              />
            </button>
            <button
              onClick={onSwapBtnClicked}
              className={state === 'select' ? styles.activeState : ''}
            >
              <SwapOutlined />
            </button>
            <button className={styles.copyBtn} />
            <button className={styles.pasteBtn} />
            <button className={styles.cutBtn} onClick={onTrimBtnClicked} />
            <button>
              <UndoOutlined />
            </button>
            <button onClick={onDownloadBtnClicked}>
              <DownloadOutlined />
            </button>
          </div>
        </div>
        <div className={styles.trackWrap}>
          <div ref={container} className={styles.trackList} />
        </div>
      </div>
    </div>
  );
}
