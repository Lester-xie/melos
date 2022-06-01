import React, { useCallback } from 'react';
import styles from './index.less';
import { Modal } from 'antd';

interface Props {
  text: string;
  visible: boolean;
  onOk: () => void;
  onCancel: () => void;
  okText?: string;
  cancelText?: string;
}

export default function ConfirmModal(props: Props) {
  return (
    <Modal
      style={{ top: '20%' }}
      className={styles.modal}
      visible={props.visible}
      onOk={props.onOk}
      onCancel={props.onCancel}
      okText="Confirm"
      cancelText="Cancel"
      bodyStyle={{
        background: '#1B1C1D',
        color: 'white',
        padding: 0,
      }}
      footer={null}
      destroyOnClose={true}
    >
      <p className={styles.text}>{props.text}</p>
      <footer className={styles.footer}>
        <button onClick={props.onCancel} className={styles.cancel}>
          {props.cancelText ?? 'Cancel'}
        </button>
        <button onClick={props.onOk}>{props.okText ?? 'Confirm'}</button>
      </footer>
    </Modal>
  );
}
