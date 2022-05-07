import React, { useCallback, useState } from 'react';
import styles from './index.less';

interface Props {
  label: string;
  children?: React.ReactChild;
  collapse?: boolean;
}

export default function Collapse(props: Props) {
  const [collapse, setCollapse] = useState(props.collapse);

  const onArrowClicked = useCallback(() => {
    setCollapse(!collapse);
  }, [collapse, setCollapse]);

  return (
    <div className={styles.container}>
      <div className={styles.header} onClick={onArrowClicked}>
        <span>{props.label}</span>
        <img
          className={collapse ? styles.arrow : null}
          src={require('@/assets/workshop/arrow.png')}
          alt="arrow"
        />
      </div>
      {props.children && collapse && (
        <div className={styles.content}>{props.children}</div>
      )}
    </div>
  );
}
