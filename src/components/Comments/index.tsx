import React, {useEffect, useRef, type ReactNode} from 'react';
import clsx from 'clsx';
import {useLocation} from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

import styles from './styles.module.css';

type GiscusConfig = {
  provider?: 'giscus';
  enabled?: boolean;
  repo?: string;
  repoId?: string;
  category?: string;
  categoryId?: string;
  mapping?: 'pathname' | 'url' | 'title' | 'og:title' | 'specific' | 'number';
  term?: string;
  strict?: '0' | '1';
  reactionsEnabled?: '0' | '1';
  emitMetadata?: '0' | '1';
  inputPosition?: 'top' | 'bottom';
  lightTheme?: string;
  darkTheme?: string;
  lang?: string;
  loading?: 'lazy' | 'eager';
};

type CommentsThemeConfig = {
  comments?: GiscusConfig;
};

const giscusOrigin = 'https://giscus.app';

function isConfigured(config: GiscusConfig | undefined): config is GiscusConfig {
  return Boolean(
    config &&
      config.provider === 'giscus' &&
      config.enabled !== false &&
      config.repo &&
      config.repoId &&
      config.category &&
      config.categoryId,
  );
}

function setGiscusTheme(theme: string) {
  const iframe = document.querySelector<HTMLIFrameElement>('iframe.giscus-frame');

  iframe?.contentWindow?.postMessage(
    {
      giscus: {
        setConfig: {
          theme,
        },
      },
    },
    giscusOrigin,
  );
}

function getGiscusTheme(config: GiscusConfig) {
  if (
    ExecutionEnvironment.canUseDOM &&
    document.documentElement.dataset.theme === 'dark'
  ) {
    return config.darkTheme ?? 'dark';
  }

  return config.lightTheme ?? 'light';
}

type Props = {
  enabled?: boolean;
};

export default function Comments({enabled = true}: Props): ReactNode {
  const containerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const {
    siteConfig: {themeConfig},
  } = useDocusaurusContext();

  const commentsConfig = (themeConfig as CommentsThemeConfig).comments;

  useEffect(() => {
    if (
      !enabled ||
      !isConfigured(commentsConfig) ||
      !ExecutionEnvironment.canUseDOM ||
      !containerRef.current
    ) {
      return undefined;
    }

    const container = containerRef.current;
    container.innerHTML = '';

    const script = document.createElement('script');
    script.src = `${giscusOrigin}/client.js`;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.setAttribute('data-repo', commentsConfig.repo);
    script.setAttribute('data-repo-id', commentsConfig.repoId);
    script.setAttribute('data-category', commentsConfig.category);
    script.setAttribute('data-category-id', commentsConfig.categoryId);
    script.setAttribute('data-mapping', commentsConfig.mapping ?? 'pathname');
    script.setAttribute('data-strict', commentsConfig.strict ?? '0');
    script.setAttribute(
      'data-reactions-enabled',
      commentsConfig.reactionsEnabled ?? '1',
    );
    script.setAttribute('data-emit-metadata', commentsConfig.emitMetadata ?? '0');
    script.setAttribute('data-input-position', commentsConfig.inputPosition ?? 'top');
    script.setAttribute('data-theme', getGiscusTheme(commentsConfig));
    script.setAttribute('data-lang', commentsConfig.lang ?? 'zh-CN');
    script.setAttribute('data-loading', commentsConfig.loading ?? 'lazy');

    if (commentsConfig.term) {
      script.setAttribute('data-term', commentsConfig.term);
    }

    container.appendChild(script);

    const observer = new MutationObserver(() => {
      setGiscusTheme(getGiscusTheme(commentsConfig));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => {
      observer.disconnect();
      container.innerHTML = '';
    };
  }, [commentsConfig, enabled, location.pathname]);

  if (!enabled || !isConfigured(commentsConfig)) {
    return null;
  }

  return (
    <section className={clsx('margin-top--xl', styles.comments)}>
      <h2 className={styles.title}>评论</h2>
      <div ref={containerRef} />
    </section>
  );
}
