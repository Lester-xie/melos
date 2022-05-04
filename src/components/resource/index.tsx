import React, { useCallback, useState, useEffect, useRef } from 'react';
import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import styles from './index.less';

type Tab = 'cloud' | 'local';

interface Props {
  show: boolean;
  onClose: () => void;
  onSelect: (file: File) => void;
}

export default function Resource(props: Props) {
  const [tab, setTab] = useState<Tab>('local');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onCloseBtnClicked = useCallback(() => {
    props.onClose();
  }, [props.onClose]);

  if (!props.show) {
    return null;
  }

  const renderCloud = () => {
    return null;
  };

  const onUploadBtnClicked = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = (e: any) => {
    e.target.files && props.onSelect(e.target.files[0]);
  };

  const renderLocal = () => {
    return (
      <div>
        <div className={styles.uploadWrap} onClick={onUploadBtnClicked}>
          <div>
            <PlusOutlined />
          </div>
          Local File
        </div>
        <input
          type="file"
          ref={fileInputRef}
          className={styles.uploadBtn}
          onChange={onFileChange}
          accept=".mp3,.wav"
        />
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button
          onClick={() => setTab('cloud')}
          className={tab === 'cloud' ? styles.active : ''}
        >
          Loop Cloud
        </button>
        <button
          onClick={() => setTab('local')}
          className={tab === 'local' ? styles.active : ''}
        >
          My Loop
        </button>
        <button onClick={onCloseBtnClicked} className={styles.onCloseBtn}>
          <CloseOutlined />
        </button>
      </div>
      <div>{tab === 'local' ? renderLocal() : renderCloud()}</div>
    </div>
  );
}
