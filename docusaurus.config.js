const {
  createFooterSocialLink,
  createSocialNavbarItem,
} = require('./src/socialLinks')

module.exports = {
  title: 'jaluik的个人博客',
  tagline: 'jaluik的个人博客',
  url: 'https://jaluik.top',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  favicon: 'img/favicon.ico',
  projectName: 'log', // Usually your repo name.
  themeConfig: {
    comments: {
      provider: 'giscus',
      repo: 'jaluik/blog',
      repoId: 'MDEwOlJlcG9zaXRvcnkzNDU2MjkxNjU=',
      category: 'General',
      categoryId: 'MDE4OkRpc2N1c3Npb25DYXRlZ29yeTMyNzA2OTAz',
      mapping: 'pathname',
      strict: '0',
      reactionsEnabled: '1',
      emitMetadata: '0',
      inputPosition: 'top',
      lightTheme: 'light',
      darkTheme: 'dark',
      lang: 'zh-CN',
      loading: 'lazy',
    },
    navbar: {
      title: 'Jaluik',
      logo: {
        alt: 'log',
        src: 'img/logo.jpeg',
      },
      items: [
        {
          to: 'docs/frontEnd/sourceCode/redux',
          activeBasePath: 'docs/frontEnd',
          label: '前端漫谈',
          position: 'left',
        },
        {
          to: 'docs/backEnd/python/pythonProxyPool',
          activeBasePath: 'docs/backEnd',
          label: '后端浅析',
          position: 'left',
        },
        {
          to: 'docs/operations/gitActionsDeploy',
          activeBasePath: 'docs/operations',
          label: '运维之路',
          position: 'left',
        },
        createSocialNavbarItem({
          href: 'https://github.com/jaluik',
          icon: 'github',
          label: 'GitHub Jaluik',
        }),
        createSocialNavbarItem({
          href: 'https://x.com/jaluik_',
          icon: 'x',
          label: 'X @jaluik_',
        }),
      ],
    },
    footer: {
      style: 'dark',
      copyright: `<div class="footer-social-row"><span>Copyright © ${new Date().getFullYear()}</span><span class="footer-heart" aria-hidden="true">❤️</span>${createFooterSocialLink(
        {
          href: 'https://github.com/jaluik',
          icon: 'github',
          label: 'Jaluik',
        },
      )}<span class="footer-social-separator" aria-hidden="true">·</span>${createFooterSocialLink(
        {
          href: 'https://x.com/jaluik_',
          icon: 'x',
          label: '@jaluik_',
        },
      )}</div>`,
    },
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          editUrl: 'https://github.com/jaluik/blog/tree/main/',
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.scss'),
        },
      },
    ],
  ],
  plugins: [
    'docusaurus-plugin-sass',
    // ... Your other plugins.
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        indexBlog: false,
        language: ['en', 'zh'],
      },
    ],
  ],
}
